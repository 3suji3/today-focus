import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { shareLinks, taskCompletions, tasks } from "../../../db/schema";
import { hasSameSharedTasks, normalizeShareTaskIds } from "../../../lib/share-reuse";

const SHARE_LINK_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const payload = (await request.json()) as { mode?: "tasks" | "stones"; taskIds?: string[]; refresh?: boolean };
  const mode = payload.mode === "stones" ? "stones" : "tasks";
  const requestedIds = [...new Set(payload.taskIds ?? [])].slice(0, 20);
  if (mode === "tasks" && !requestedIds.length) return Response.json({ error: "공유할 일을 골라줘." }, { status: 400 });

  const db = getDb();
  const [owned, totalRows, weeklyRows] = await Promise.all([
    db.select({ id: tasks.id }).from(tasks).where(eq(tasks.ownerEmail, user.email)),
    db.select({ value: count() }).from(taskCompletions).where(eq(taskCompletions.ownerEmail, user.email)),
    db.select({ value: count() }).from(taskCompletions).where(and(eq(taskCompletions.ownerEmail, user.email), gte(taskCompletions.completedAt, startOfCurrentWeekKst()))),
  ]);
  const ownedIds = new Set(owned.map((item) => item.id));
  const safeIds = normalizeShareTaskIds(requestedIds.filter((id) => ownedIds.has(id)));
  if (mode === "tasks" && !safeIds.length) return Response.json({ error: "공유할 수 있는 일이 없어요." }, { status: 400 });

  const now = Date.now();
  const stoneCount = totalRows[0]?.value ?? 0;
  const weeklyStoneCount = weeklyRows[0]?.value ?? 0;

  if (!payload.refresh) {
    const candidates = await db
      .select({
        token: shareLinks.token,
        taskIds: shareLinks.taskIds,
        stoneCount: shareLinks.stoneCount,
        weeklyStoneCount: shareLinks.weeklyStoneCount,
        createdAt: shareLinks.createdAt,
      })
      .from(shareLinks)
      .where(and(
        eq(shareLinks.ownerEmail, user.email),
        eq(shareLinks.shareType, mode),
        isNull(shareLinks.revokedAt),
        gte(shareLinks.createdAt, now - SHARE_LINK_LIFETIME_MS),
      ))
      .orderBy(desc(shareLinks.createdAt))
      .limit(20);

    const reusable = candidates.find((candidate) =>
      mode === "tasks"
        ? hasSameSharedTasks(candidate.taskIds, safeIds)
        : candidate.stoneCount === stoneCount && candidate.weeklyStoneCount === weeklyStoneCount,
    );
    if (reusable) {
      return Response.json({
        path: `/share/${reusable.token}`,
        reused: true,
        expiresAt: reusable.createdAt + SHARE_LINK_LIFETIME_MS,
      });
    }
  }

  const token = crypto.randomUUID().replaceAll("-", "");
  await db.insert(shareLinks).values({
    token,
    ownerEmail: user.email,
    taskIds: JSON.stringify(mode === "tasks" ? safeIds : []),
    shareType: mode,
    stoneCount,
    weeklyStoneCount,
    createdAt: now,
    revokedAt: null,
  });

  return Response.json({
    path: `/share/${token}`,
    reused: false,
    expiresAt: now + SHARE_LINK_LIFETIME_MS,
  }, { status: 201 });
}

function startOfCurrentWeekKst(now = Date.now()) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const date = new Date(now + kstOffset);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday) - kstOffset;
}
