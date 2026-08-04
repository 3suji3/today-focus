import { sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { clampWeekOffset, leaderboardWeekRange } from "../../../lib/leaderboard-period";

const PAGE_SIZE = 20;
const MAX_RANK = 100;

type RankedRow = {
  ownerEmail: string;
  name: string;
  score: number;
  rank: number;
  totalCount: number;
};

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "total" ? "total" : "weekly";
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const weekOffset = clampWeekOffset(Number(url.searchParams.get("weekOffset") ?? "0"));
  const page = Math.max(1, Math.min(MAX_RANK / PAGE_SIZE, Number.isInteger(requestedPage) ? requestedPage : 1));
  const startRank = (page - 1) * PAGE_SIZE + 1;
  const endRank = page * PAGE_SIZE;
  const week = leaderboardWeekRange(Date.now(), weekOffset);
  const scopeCondition = scope === "weekly"
    ? sql`and tc.completed_at >= ${week.startAt} and tc.completed_at < ${week.endAt}`
    : sql``;

  const rows = await getDb().all(sql`
    with ranked as (
      select
        us.owner_email as "ownerEmail",
        us.preferred_name as "name",
        count(tc.id) as "score",
        row_number() over (
          order by count(tc.id) desc, us.preferred_name asc, us.owner_email asc
        ) as "rank",
        count(*) over () as "totalCount"
      from user_settings us
      inner join task_completions tc on tc.owner_email = us.owner_email
      where us.leaderboard_opt_in = 1
        and us.preferred_name is not null
        ${scopeCondition}
      group by us.owner_email, us.preferred_name
    )
    select "ownerEmail", "name", "score", "rank", "totalCount"
    from ranked
    where ("rank" between ${startRank} and ${endRank})
      or "ownerEmail" = ${user.email}
    order by "rank" asc
  `) as RankedRow[];

  const totalParticipants = Number(rows[0]?.totalCount ?? 0);
  const toRanking = (row: RankedRow) => ({
    rank: Number(row.rank),
    name: row.name || "돌 친구",
    score: Number(row.score),
    isMe: row.ownerEmail === user.email,
  });
  const pageRows = rows.filter((row) => Number(row.rank) >= startRank && Number(row.rank) <= endRank);
  const myRow = rows.find((row) => row.ownerEmail === user.email);

  return Response.json({
    scope,
    page,
    pageSize: PAGE_SIZE,
    maxRank: MAX_RANK,
    weekOffset,
    weekStartedAt: week.startAt,
    weekEndedAt: week.endAt,
    weekStartDate: week.startDate,
    weekEndDate: week.endDate,
    totalParticipants,
    hasMore: endRank < Math.min(totalParticipants, MAX_RANK),
    rankings: pageRows.map(toRanking),
    myRanking: myRow ? toRanking(myRow) : null,
  }, { headers: { "cache-control": "private, max-age=10" } });
}
