import { and, count, desc, eq, isNull, notExists, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { categoryFeedback, stoneRewards, taskCompletions, taskSkips, tasks, userSettings } from "../../../db/schema";
import { categories, classifyTask, normalizeTitle, type Category } from "../../../lib/classification";
import { checkWriteRateLimit } from "../../../lib/rate-limit";
import { completionId, isTaskUpcoming, isTaskVisibleOnDate, isValidDateKey, kstDateKey, type Recurrence } from "../../../lib/task-schedule";
import { STONE_VARIANT_COUNT } from "../../stone-catalog";
import { allowedStoneStages, type StoneStageKey } from "../../../lib/stone-stages";
import { isBearPersonality, type BearPersonality } from "../../../lib/bear-personality";
import { makeTaskReason } from "../../../lib/task-reason";

const allowedCategories = new Set<string>(categories);
const allowedEnergy = new Set(["낮음", "보통", "높음"]);
const allowedStrategies = new Set(["balanced", "quick", "focus"]);
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const db = getDb();
  const today = kstDateKey();
  const weekStartedAt = startOfCurrentWeekKst();
  const taskQuery = db.select().from(tasks).where(and(
    eq(tasks.ownerEmail, user.email),
    isNull(tasks.archivedAt),
    notExists(
      db.select({ value: sql<number>`1` }).from(taskSkips).where(and(
        eq(taskSkips.taskId, tasks.id),
        eq(taskSkips.ownerEmail, user.email),
        eq(taskSkips.dateKey, today),
      )),
    ),
  )).orderBy(desc(tasks.updatedAt)).limit(100);
  const completionQuery = db.select({
    current: count(),
    weekly: sql<number>`coalesce(sum(case when ${taskCompletions.completedAt} >= ${weekStartedAt} then 1 else 0 end), 0)`,
    completedTodayTaskIds: sql<string | null>`group_concat(case when ${taskCompletions.dateKey} = ${today} then ${taskCompletions.taskId} end)`,
  }).from(taskCompletions).where(eq(taskCompletions.ownerEmail, user.email));
  const settingsQuery = db.select().from(userSettings)
    .where(eq(userSettings.ownerEmail, user.email))
    .limit(1);
  const [items, completionRows, settings] = await db.batch([
    taskQuery,
    completionQuery,
    settingsQuery,
  ]);
  const completionSnapshot = completionRows[0] ?? {
    current: 0,
    weekly: 0,
    completedTodayTaskIds: null,
  };
  const userSetting = settings[0];
  const completedToday = new Set(
    (completionSnapshot.completedTodayTaskIds ?? "").split(",").filter(Boolean),
  );
  const seenTemplateTitles = new Set<string>();
  const taskTemplates = items.flatMap((item) => {
    const normalized = normalizeTitle(item.title);
    if (!normalized || seenTemplateTitles.has(normalized)) return [];
    seenTemplateTitles.add(normalized);
    return [{ title: item.title, category: item.category, minutes: item.minutes }];
  }).slice(0, 60);
  const visibleItems = items
    .filter((item) => isTaskUpcoming(item, today))
    .map((item) => {
      const isToday = isTaskVisibleOnDate(item, today);
      return { ...item, isToday, done: isToday && completedToday.has(item.id), completedAt: null };
    });

  return Response.json({
    tasks: rankTasks(visibleItems, userSetting?.energy ?? "보통"),
    taskTemplates,
    todayDate: today,
    energy: userSetting?.energy ?? "보통",
    stoneStats: {
      current: Number(completionSnapshot.current ?? 0),
      weekly: Number(completionSnapshot.weekly ?? 0),
      weekStartedAt,
    },
    recommendationSettings: {
      mode: userSetting?.recommendationMode ?? "auto",
      availableMinutes: userSetting?.availableMinutes ?? 90,
      customTaskCount: userSetting?.customTaskCount ?? 3,
      preferredName: userSetting?.preferredName ?? "",
      leaderboardOptIn: userSetting?.leaderboardOptIn ?? false,
      strategy: userSetting?.recommendationStrategy ?? "balanced",
      preferredCategory: userSetting?.preferredCategory ?? "",
    },
    bearPersonality: userSetting?.bearPersonality ?? "warm",
    selectedStoneStage: userSetting?.selectedStoneStage ?? "auto",
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  const limited = rateLimitResponse(user.email);
  if (limited) return limited;

  const payload = (await request.json()) as { requestId?: string; title?: string; category?: string; minutes?: number; allDay?: boolean; energy?: string; recurrence?: string; scheduledDate?: string; scheduledEndDate?: string | null };
  const title = payload.title?.trim().slice(0, 160) ?? "";
  if (!title) return Response.json({ error: "할 일을 적어줘." }, { status: 400 });

  const db = getDb();
  const feedback = allowedCategories.has(payload.category ?? "")
    ? []
    : await db.select({ title: categoryFeedback.title, category: categoryFeedback.category })
      .from(categoryFeedback)
      .where(eq(categoryFeedback.ownerEmail, user.email))
      .orderBy(desc(categoryFeedback.createdAt))
      .limit(200);
  const classification = allowedCategories.has(payload.category ?? "")
    ? { category: payload.category as Category, confidence: 1, source: "personal" as const }
    : classifyTask(title, feedback);
  const now = Date.now();
  const id = payload.requestId && requestIdPattern.test(payload.requestId) ? payload.requestId : crypto.randomUUID();
  const minutes = Math.max(5, Math.min(720, Math.round(Number(payload.minutes) || 20)));
  const energy = allowedEnergy.has(payload.energy ?? "") ? payload.energy as "낮음" | "보통" | "높음" : "보통";
  const recurrence: Recurrence = payload.recurrence === "daily" ? "daily" : "once";
  const today = kstDateKey(now);
  const scheduledDate = isValidDateKey(payload.scheduledDate) && payload.scheduledDate >= today
    ? payload.scheduledDate
    : today;
  const scheduledEndDate = recurrence === "daily" && isValidDateKey(payload.scheduledEndDate ?? undefined)
    ? payload.scheduledEndDate
    : null;
  if (scheduledEndDate && scheduledEndDate < scheduledDate) {
    return Response.json({ error: "종료일은 시작일보다 빠를 수 없어요." }, { status: 400 });
  }
  const item = {
    id,
    ownerEmail: user.email,
    title,
    category: classification.category,
    minutes,
    allDay: payload.allDay === true,
    reason: makeTaskReason(classification.category, minutes, energy, classification.source),
    priority: 2,
    dueAt: null,
    done: false,
    completedAt: null,
    recurrence,
    scheduledDate,
    scheduledEndDate,
    archivedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const inserted = await db.insert(tasks).values(item).onConflictDoNothing({ target: tasks.id }).returning();
  if (!inserted.length) {
    const [existing] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.ownerEmail, user.email))).limit(1);
    if (!existing) return Response.json({ error: "요청 식별자가 이미 사용됐어요." }, { status: 409 });
    return Response.json({ task: existing, classification, duplicate: true });
  }
  return Response.json({ task: inserted[0], classification, duplicate: false }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  const limited = rateLimitResponse(user.email);
  if (limited) return limited;

  const payload = (await request.json()) as {
    id?: string;
    done?: boolean;
    expectedVersion?: number;
    energy?: string;
    title?: string;
    category?: string;
    minutes?: number;
    allDay?: boolean;
    recommendationMode?: string;
    availableMinutes?: number;
    customTaskCount?: number;
    preferredName?: string;
    leaderboardOptIn?: boolean;
    recurrence?: string;
    scheduledDate?: string;
    scheduledEndDate?: string | null;
    recommendationStrategy?: string;
    preferredCategory?: string;
    bearPersonality?: string;
    selectedStoneStage?: string;
  };
  const db = getDb();
  const now = Date.now();

  const isSettingsUpdate = !payload.id && (
    (payload.energy && allowedEnergy.has(payload.energy)) ||
    payload.recommendationMode === "auto" || payload.recommendationMode === "custom" ||
    typeof payload.availableMinutes === "number" || typeof payload.customTaskCount === "number" ||
    typeof payload.preferredName === "string" || typeof payload.leaderboardOptIn === "boolean" || allowedStrategies.has(payload.recommendationStrategy ?? "") ||
    allowedCategories.has(payload.preferredCategory ?? "") || payload.preferredCategory === "" ||
    isBearPersonality(payload.bearPersonality) ||
    allowedStoneStages.has(payload.selectedStoneStage as StoneStageKey)
  );
  if (isSettingsUpdate) {
    const [current] = await db.select().from(userSettings).where(eq(userSettings.ownerEmail, user.email)).limit(1);
    const next = {
      ownerEmail: user.email,
      energy: payload.energy && allowedEnergy.has(payload.energy) ? payload.energy as "낮음" | "보통" | "높음" : current?.energy ?? "보통" as const,
      bearPersonality: isBearPersonality(payload.bearPersonality) ? payload.bearPersonality as BearPersonality : current?.bearPersonality ?? "warm" as const,
      recommendationMode: payload.recommendationMode === "custom" ? "custom" as const : payload.recommendationMode === "auto" ? "auto" as const : current?.recommendationMode ?? "auto" as const,
      availableMinutes: typeof payload.availableMinutes === "number" ? clamp(payload.availableMinutes, 15, 480) : current?.availableMinutes ?? 90,
      customTaskCount: typeof payload.customTaskCount === "number" ? clamp(payload.customTaskCount, 1, 5) : current?.customTaskCount ?? 3,
      preferredName: typeof payload.preferredName === "string" ? payload.preferredName.trim().slice(0, 20) || null : current?.preferredName ?? null,
      leaderboardOptIn: typeof payload.leaderboardOptIn === "boolean" ? payload.leaderboardOptIn : current?.leaderboardOptIn ?? false,
      recommendationStrategy: allowedStrategies.has(payload.recommendationStrategy ?? "") ? payload.recommendationStrategy as "balanced" | "quick" | "focus" : current?.recommendationStrategy ?? "balanced" as const,
      preferredCategory: allowedCategories.has(payload.preferredCategory ?? "") ? payload.preferredCategory as Category : payload.preferredCategory === "" ? null : current?.preferredCategory ?? null,
      selectedStoneStage: allowedStoneStages.has(payload.selectedStoneStage as StoneStageKey) ? payload.selectedStoneStage as StoneStageKey : current?.selectedStoneStage ?? "auto" as const,
      updatedAt: now,
    };
    await db.insert(userSettings).values(next)
      .onConflictDoUpdate({
        target: userSettings.ownerEmail,
        set: {
          energy: next.energy,
          bearPersonality: next.bearPersonality,
          recommendationMode: next.recommendationMode,
          availableMinutes: next.availableMinutes,
          customTaskCount: next.customTaskCount,
          preferredName: next.preferredName,
          leaderboardOptIn: next.leaderboardOptIn,
          recommendationStrategy: next.recommendationStrategy,
          preferredCategory: next.preferredCategory,
          selectedStoneStage: next.selectedStoneStage,
          updatedAt: next.updatedAt,
        },
      });
    return Response.json({
      energy: next.energy,
      bearPersonality: next.bearPersonality,
      recommendationSettings: {
        mode: next.recommendationMode,
        availableMinutes: next.availableMinutes,
        customTaskCount: next.customTaskCount,
        preferredName: next.preferredName ?? "",
        leaderboardOptIn: next.leaderboardOptIn,
        strategy: next.recommendationStrategy,
        preferredCategory: next.preferredCategory ?? "",
      },
      selectedStoneStage: next.selectedStoneStage,
    });
  }

  const hasTaskEdit = typeof payload.title === "string" || typeof payload.done === "boolean" || typeof payload.allDay === "boolean" || payload.recurrence === "once" || payload.recurrence === "daily" || typeof payload.scheduledDate === "string" || payload.scheduledEndDate === null || typeof payload.scheduledEndDate === "string";
  if (!payload.id || !payload.expectedVersion || !hasTaskEdit) {
    return Response.json({ error: "잘못된 수정 요청이에요." }, { status: 400 });
  }

  const [existing] = await db.select().from(tasks).where(and(eq(tasks.id, payload.id), eq(tasks.ownerEmail, user.email), isNull(tasks.archivedAt))).limit(1);
  if (!existing) return Response.json({ error: "할 일을 찾을 수 없어요." }, { status: 404 });
  if (existing.version !== payload.expectedVersion) {
    return Response.json({ error: "다른 기기에서 먼저 수정됐어요. 새로 불러올게요." }, { status: 409 });
  }

  const nextTitle = typeof payload.title === "string" ? payload.title.trim().slice(0, 160) : existing.title;
  if (!nextTitle) return Response.json({ error: "할 일 제목을 적어줘." }, { status: 400 });
  const nextCategory = allowedCategories.has(payload.category ?? "") ? payload.category as Category : existing.category;
  const nextMinutes = typeof payload.minutes === "number"
    ? Math.max(5, Math.min(720, Math.round(payload.minutes)))
    : existing.minutes;
  const nextRecurrence: Recurrence = payload.recurrence === "daily" ? "daily" : payload.recurrence === "once" ? "once" : existing.recurrence;
  const today = kstDateKey(now);
  const nextScheduledDate = isValidDateKey(payload.scheduledDate) && payload.scheduledDate >= today
    ? payload.scheduledDate
    : existing.scheduledDate ?? today;
  const nextScheduledEndDate = nextRecurrence === "daily"
    ? payload.scheduledEndDate === null
      ? null
      : isValidDateKey(payload.scheduledEndDate)
        ? payload.scheduledEndDate
        : existing.scheduledEndDate
    : null;
  if (nextScheduledEndDate && nextScheduledEndDate < nextScheduledDate) {
    return Response.json({ error: "종료일은 시작일보다 빠를 수 없어요." }, { status: 400 });
  }
  const completionKey = completionId(existing.id, today);

  const updated = await db.update(tasks)
    .set({
      title: nextTitle,
      category: nextCategory,
      minutes: nextMinutes,
      allDay: typeof payload.allDay === "boolean" ? payload.allDay : existing.allDay,
      recurrence: nextRecurrence,
      scheduledDate: nextScheduledDate,
      scheduledEndDate: nextScheduledEndDate,
      done: typeof payload.done === "boolean" ? payload.done : existing.done,
      completedAt: payload.done === true ? existing.completedAt ?? now : payload.done === false ? null : existing.completedAt,
      reason: typeof payload.title === "string" ? makeTaskReason(nextCategory, nextMinutes, "보통", "personal") : existing.reason,
      version: payload.expectedVersion + 1,
      updatedAt: now,
    })
    .where(and(eq(tasks.id, payload.id), eq(tasks.ownerEmail, user.email), eq(tasks.version, payload.expectedVersion)))
    .returning();

  if (!updated.length) {
    return Response.json({ error: "다른 기기에서 먼저 수정됐어요. 새로 불러올게요." }, { status: 409 });
  }

  let stoneAwarded = false;
  let stoneRemoved = false;
  if (payload.done === true) {
    const reward = await db.insert(taskCompletions).values({
      id: completionKey,
      taskId: existing.id,
      ownerEmail: user.email,
      dateKey: today,
      completedAt: now,
      stoneVariant: stableVariant(completionKey),
    }).onConflictDoNothing({ target: taskCompletions.id }).returning({ taskId: taskCompletions.taskId });
    stoneAwarded = reward.length > 0;
  } else if (payload.done === false) {
    const removedReward = await db.delete(taskCompletions)
      .where(and(eq(taskCompletions.id, completionKey), eq(taskCompletions.ownerEmail, user.email)))
      .returning({ taskId: taskCompletions.taskId });
    stoneRemoved = removedReward.length > 0;
  }

  if (typeof payload.category === "string" && allowedCategories.has(payload.category)) {
    await db.delete(categoryFeedback).where(and(
      eq(categoryFeedback.ownerEmail, user.email),
      eq(categoryFeedback.normalizedTitle, normalizeTitle(nextTitle)),
    ));
    await db.insert(categoryFeedback).values({
      id: crypto.randomUUID(),
      ownerEmail: user.email,
      title: nextTitle,
      normalizedTitle: normalizeTitle(nextTitle),
      category: nextCategory,
      createdAt: now,
    });
  }

  const stoneStats = typeof payload.done === "boolean" ? await readStoneStats(db, user.email, startOfCurrentWeekKst(now)) : undefined;
  const taskIsToday = isTaskVisibleOnDate(updated[0], today);
  return Response.json({ task: { ...updated[0], isToday: taskIsToday, done: taskIsToday && (payload.done ?? updated[0].done) }, stoneAwarded, stoneRemoved, stoneStats });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  const limited = rateLimitResponse(user.email);
  if (limited) return limited;

  const payload = (await request.json()) as { id?: string; expectedVersion?: number; deleteMode?: "single" | "series"; dateKey?: string };
  if (!payload.id || !payload.expectedVersion) {
    return Response.json({ error: "잘못된 삭제 요청이에요." }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select().from(tasks)
    .where(and(eq(tasks.id, payload.id), eq(tasks.ownerEmail, user.email), isNull(tasks.archivedAt))).limit(1);
  if (!existing) return Response.json({ error: "이미 삭제됐거나 찾을 수 없는 할 일이에요." }, { status: 404 });
  if (existing.version !== payload.expectedVersion) {
    return Response.json({ error: "다른 기기에서 먼저 수정됐어요. 새로 불러올게요." }, { status: 409 });
  }

  const today = kstDateKey();
  if (existing.recurrence === "daily" && payload.deleteMode === "single") {
    const occurrenceDate = isValidDateKey(payload.dateKey) ? payload.dateKey : today;
    if (!isTaskVisibleOnDate(existing, occurrenceDate)) {
      return Response.json({ error: "삭제할 반복 날짜를 찾을 수 없어요." }, { status: 400 });
    }
    const skipId = completionId(existing.id, occurrenceDate);
    await db.insert(taskSkips).values({
      id: skipId,
      taskId: existing.id,
      ownerEmail: user.email,
      dateKey: occurrenceDate,
      createdAt: Date.now(),
    }).onConflictDoNothing({ target: taskSkips.id });
    await db.delete(taskCompletions)
      .where(and(eq(taskCompletions.id, skipId), eq(taskCompletions.ownerEmail, user.email)));
    const stoneStats = await readStoneStats(db, user.email, startOfCurrentWeekKst());
    return Response.json({ id: existing.id, deleteMode: "single", stoneStats });
  }

  if (existing.recurrence === "daily") {
    const archived = await db.update(tasks)
      .set({ archivedAt: Date.now(), updatedAt: Date.now(), version: payload.expectedVersion + 1 })
      .where(and(eq(tasks.id, payload.id), eq(tasks.ownerEmail, user.email), eq(tasks.version, payload.expectedVersion), isNull(tasks.archivedAt)))
      .returning({ id: tasks.id });
    if (!archived.length) {
      return Response.json({ error: "다른 기기에서 상태가 바뀌었어요. 새로 불러올게요." }, { status: 409 });
    }
    const stoneStats = await readStoneStats(db, user.email, startOfCurrentWeekKst());
    return Response.json({ id: archived[0].id, deleteMode: "series", stoneStats });
  }

  const removed = await db.delete(tasks)
    .where(and(eq(tasks.id, payload.id), eq(tasks.ownerEmail, user.email), eq(tasks.version, payload.expectedVersion)))
    .returning({ id: tasks.id });
  if (!removed.length) {
    return Response.json({ error: "다른 기기에서 상태가 바뀌었어요. 새로 불러올게요." }, { status: 409 });
  }
  await db.delete(stoneRewards).where(and(eq(stoneRewards.taskId, removed[0].id), eq(stoneRewards.ownerEmail, user.email)));
  await db.delete(taskCompletions).where(and(eq(taskCompletions.taskId, removed[0].id), eq(taskCompletions.ownerEmail, user.email)));
  const stoneStats = await readStoneStats(db, user.email, startOfCurrentWeekKst());
  return Response.json({ id: removed[0].id, stoneStats });
}

function rankTasks<T extends { done: boolean; priority: number; dueAt: number | null; minutes: number }>(items: T[], energy: string): T[] {
  return [...items].sort((a, b) => score(b, energy) - score(a, energy));
}

function score(task: { done: boolean; priority: number; dueAt: number | null; minutes: number }, energy: string) {
  if (task.done) return -1000;
  const dueScore = task.dueAt ? Math.max(0, 120 - (task.dueAt - Date.now()) / 36e5) : 0;
  const energyFit = energy === "낮음" ? Math.max(0, 60 - task.minutes) : energy === "높음" ? task.minutes / 2 : Math.max(0, 45 - Math.abs(task.minutes - 35));
  return task.priority * 30 + dueScore + energyFit;
}

function stableVariant(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % STONE_VARIANT_COUNT;
}

function startOfCurrentWeekKst(now = Date.now()) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const date = new Date(now + kstOffset);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday) - kstOffset;
}

async function readStoneStats(db: ReturnType<typeof getDb>, ownerEmail: string, weekStartedAt: number) {
  const [summary] = await db.select({
    current: count(),
    weekly: sql<number>`coalesce(sum(case when ${taskCompletions.completedAt} >= ${weekStartedAt} then 1 else 0 end), 0)`,
  }).from(taskCompletions).where(eq(taskCompletions.ownerEmail, ownerEmail));
  return {
    current: Number(summary?.current ?? 0),
    weekly: Number(summary?.weekly ?? 0),
    weekStartedAt,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function rateLimitResponse(ownerEmail: string) {
  const result = checkWriteRateLimit(ownerEmail);
  if (result.allowed) return null;
  return Response.json(
    { error: "요청이 너무 빠르게 이어졌어. 잠깐 쉬었다가 다시 해줘." },
    { status: 429, headers: { "retry-after": String(result.retryAfterSeconds) } },
  );
}
