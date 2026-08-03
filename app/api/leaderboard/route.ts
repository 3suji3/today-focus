import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { taskCompletions, userSettings } from "../../../db/schema";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const scope = new URL(request.url).searchParams.get("scope") === "total" ? "total" : "weekly";
  const db = getDb();
  const weekStartedAt = startOfCurrentWeekKst();
  const score = count(taskCompletions.id);
  const conditions = [
    eq(userSettings.leaderboardOptIn, true),
    isNotNull(userSettings.preferredName),
  ];
  if (scope === "weekly") conditions.push(gte(taskCompletions.completedAt, weekStartedAt));

  const rows = await db.select({
    ownerEmail: userSettings.ownerEmail,
    name: userSettings.preferredName,
    score,
  }).from(userSettings)
    .innerJoin(taskCompletions, eq(taskCompletions.ownerEmail, userSettings.ownerEmail))
    .where(and(...conditions))
    .groupBy(userSettings.ownerEmail, userSettings.preferredName)
    .orderBy(desc(score), userSettings.preferredName)
    .limit(50);

  return Response.json({
    scope,
    weekStartedAt,
    rankings: rows.map((row, index) => ({
      rank: index + 1,
      name: row.name ?? "돌 친구",
      score: Number(row.score),
      isMe: row.ownerEmail === user.email,
    })),
  }, { headers: { "cache-control": "private, max-age=10" } });
}

function startOfCurrentWeekKst(now = Date.now()) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const date = new Date(now + kstOffset);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday) - kstOffset;
}
