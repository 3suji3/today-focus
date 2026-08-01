import { and, count, eq, gte, isNull, lt, or } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { taskCompletions, taskSkips, tasks } from "../../../db/schema";
import { categories, type Category } from "../../../lib/classification";
import { checkWriteRateLimit } from "../../../lib/rate-limit";
import { addDaysDateKey, dateKeysInRange, isValidDateKey, kstDateKey, monthRange, taskStartDate } from "../../../lib/task-schedule";
import { STONE_VARIANT_COUNT } from "../../stone-catalog";

const allowedCategories = new Set<string>(categories);

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const month = new URL(request.url).searchParams.get("month") ?? "";
  const range = monthRange(month);
  if (!range) return Response.json({ error: "조회할 달을 다시 골라줘." }, { status: 400 });

  const db = getDb();
  const taskFields = {
    id: tasks.id,
    title: tasks.title,
    category: tasks.category,
    minutes: tasks.minutes,
    recurrence: tasks.recurrence,
    scheduledDate: tasks.scheduledDate,
    scheduledEndDate: tasks.scheduledEndDate,
    createdAt: tasks.createdAt,
    archivedAt: tasks.archivedAt,
  };
  const [taskRows, completionRows, skipRows] = await Promise.all([
    db.select(taskFields).from(tasks).where(and(
      eq(tasks.ownerEmail, user.email),
      isNull(tasks.archivedAt),
      or(
        isNull(tasks.scheduledDate),
        and(eq(tasks.recurrence, "once"), gte(tasks.scheduledDate, range.start), lt(tasks.scheduledDate, range.end)),
        and(
          eq(tasks.recurrence, "daily"),
          lt(tasks.scheduledDate, range.end),
          or(isNull(tasks.scheduledEndDate), gte(tasks.scheduledEndDate, range.start)),
        ),
      ),
    )).limit(500),
    db.select({
      ...taskFields,
      dateKey: taskCompletions.dateKey,
      stoneVariant: taskCompletions.stoneVariant,
    }).from(taskCompletions)
      .innerJoin(tasks, and(eq(taskCompletions.taskId, tasks.id), eq(tasks.ownerEmail, user.email)))
      .where(and(
        eq(taskCompletions.ownerEmail, user.email),
        gte(taskCompletions.dateKey, range.start),
        lt(taskCompletions.dateKey, range.end),
      )).limit(2000),
    db.select({ taskId: taskSkips.taskId, dateKey: taskSkips.dateKey }).from(taskSkips).where(and(
      eq(taskSkips.ownerEmail, user.email),
      gte(taskSkips.dateKey, range.start),
      lt(taskSkips.dateKey, range.end),
    )).limit(2000),
  ]);
  const entries = completionRows.map((completion) => ({
      id: completion.id,
      title: completion.title,
      category: completion.category,
      minutes: completion.minutes,
      recurrence: completion.recurrence,
      scheduledEndDate: completion.scheduledEndDate,
      dateKey: completion.dateKey,
      done: true,
      stoneVariant: completion.stoneVariant,
    }));
  const recordedDates = new Set(entries.map((entry) => `${entry.id}:${entry.dateKey}`));
  const skippedDates = new Set(skipRows.map((skip) => `${skip.taskId}:${skip.dateKey}`));

  for (const task of taskRows) {
    if (task.archivedAt) continue;
    const startDate = taskStartDate(task);
    const endExclusive = task.scheduledEndDate && task.scheduledEndDate < range.end
      ? addDaysDateKey(task.scheduledEndDate, 1)
      : range.end;
    const dates = task.recurrence === "daily"
      ? dateKeysInRange(startDate > range.start ? startDate : range.start, endExclusive)
      : [startDate];
    for (const dateKey of dates) {
      const occurrenceKey = `${task.id}:${dateKey}`;
      if (dateKey < range.start || dateKey >= range.end || recordedDates.has(occurrenceKey) || skippedDates.has(occurrenceKey)) continue;
      entries.push({
        id: task.id,
        title: task.title,
        category: task.category,
        minutes: task.minutes,
        recurrence: task.recurrence,
        scheduledEndDate: task.scheduledEndDate,
        dateKey,
        done: false,
        stoneVariant: stableVariant(task.id),
      });
    }
  }

  entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || Number(b.done) - Number(a.done));
  return Response.json(
    { month, entries },
    { headers: { "cache-control": "private, max-age=15, stale-while-revalidate=60" } },
  );
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  const rateLimit = checkWriteRateLimit(user.email);
  if (!rateLimit.allowed) return Response.json({ error: "잠깐만 쉬었다가 다시 기록해줘." }, { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSeconds) } });

  const payload = (await request.json()) as { title?: string; category?: string; minutes?: number; dateKey?: string; done?: boolean };
  const title = payload.title?.trim().slice(0, 160) ?? "";
  const today = kstDateKey();
  if (!title) return Response.json({ error: "기록할 일을 적어줘." }, { status: 400 });
  if (!isValidDateKey(payload.dateKey) || payload.dateKey >= today) return Response.json({ error: "오늘보다 이전 날짜만 기록에서 추가할 수 있어." }, { status: 400 });
  if (!allowedCategories.has(payload.category ?? "")) return Response.json({ error: "분류를 다시 골라줘." }, { status: 400 });

  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const dateKey = payload.dateKey;
  const completedAt = Date.parse(`${dateKey}T20:00:00+09:00`);
  const done = payload.done !== false;
  const item = {
    id,
    ownerEmail: user.email,
    title,
    category: payload.category as Category,
    minutes: Math.max(5, Math.min(240, Math.round(Number(payload.minutes) || 20))),
    reason: "기록 탭에서 직접 남긴 지난 일정이야",
    priority: 2,
    dueAt: null,
    done,
    completedAt: done ? completedAt : null,
    recurrence: "once" as const,
    scheduledDate: dateKey,
    scheduledEndDate: null,
    archivedAt: null,
    version: 1,
    createdAt: completedAt,
    updatedAt: now,
  };
  await db.insert(tasks).values(item);
  if (done) {
    await db.insert(taskCompletions).values({
      id: `${id}:${dateKey}`,
      taskId: id,
      ownerEmail: user.email,
      dateKey,
      completedAt,
      stoneVariant: stableVariant(`${id}:${dateKey}`),
    });
  }
  const weekStartedAt = startOfCurrentWeekKst(now);
  const [currentRows, weeklyRows] = await Promise.all([
    db.select({ value: count() }).from(taskCompletions).where(eq(taskCompletions.ownerEmail, user.email)),
    db.select({ value: count() }).from(taskCompletions).where(and(
      eq(taskCompletions.ownerEmail, user.email),
      gte(taskCompletions.completedAt, weekStartedAt),
    )),
  ]);
  return Response.json({
    entry: { ...item, dateKey, stoneVariant: stableVariant(`${id}:${dateKey}`) },
    stoneStats: {
      current: currentRows[0]?.value ?? 0,
      weekly: weeklyRows[0]?.value ?? 0,
      weekStartedAt,
    },
    stoneAwarded: done,
  }, { status: 201 });
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
