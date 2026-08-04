import assert from "node:assert/strict";
import test from "node:test";
import { clampWeekOffset, leaderboardWeekRange } from "../lib/leaderboard-period.ts";

test("주간 랭킹은 한국 시간 월요일부터 일요일까지 계산한다", () => {
  const now = Date.parse("2026-08-04T01:00:00.000Z");
  assert.deepEqual(leaderboardWeekRange(now, 0), {
    startAt: Date.parse("2026-08-02T15:00:00.000Z"),
    endAt: Date.parse("2026-08-09T15:00:00.000Z"),
    startDate: "2026-08-03",
    endDate: "2026-08-09",
  });
});

test("주간 랭킹 조회 범위는 최근 12주까지만 허용한다", () => {
  assert.equal(clampWeekOffset(-99), -12);
  assert.equal(clampWeekOffset(3), 0);
});
