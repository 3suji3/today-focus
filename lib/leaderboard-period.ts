const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function clampWeekOffset(value: number) {
  return Math.max(-12, Math.min(0, Number.isInteger(value) ? value : 0));
}

export function leaderboardWeekRange(now = Date.now(), weekOffset = 0) {
  const kstDate = new Date(now + KST_OFFSET_MS);
  const daysSinceMonday = (kstDate.getUTCDay() + 6) % 7;
  const currentMondayUtc = Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate() - daysSinceMonday) - KST_OFFSET_MS;
  const startAt = currentMondayUtc + clampWeekOffset(weekOffset) * 7 * DAY_MS;
  const endAt = startAt + 7 * DAY_MS;
  return {
    startAt,
    endAt,
    startDate: formatKstDateKey(startAt),
    endDate: formatKstDateKey(endAt - DAY_MS),
  };
}

function formatKstDateKey(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(timestamp);
}
