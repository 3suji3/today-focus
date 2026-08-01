import assert from "node:assert/strict";
import test from "node:test";
import { completionId, dateKeysInRange, isTaskUpcoming, isTaskVisibleOnDate, isValidDateKey, kstDateKey, monthRange } from "../lib/task-schedule.ts";

const base = { scheduledDate: "2026-07-22", scheduledEndDate: null, createdAt: Date.UTC(2026, 6, 21, 15) };

test("오늘만 일정은 예정일에만 보인다", () => {
  assert.equal(isTaskVisibleOnDate({ ...base, recurrence: "once" }, "2026-07-22"), true);
  assert.equal(isTaskVisibleOnDate({ ...base, recurrence: "once" }, "2026-07-23"), false);
});

test("매일 일정은 시작일부터 매일 보인다", () => {
  assert.equal(isTaskVisibleOnDate({ ...base, recurrence: "daily" }, "2026-07-21"), false);
  assert.equal(isTaskVisibleOnDate({ ...base, recurrence: "daily" }, "2026-07-22"), true);
  assert.equal(isTaskVisibleOnDate({ ...base, recurrence: "daily" }, "2026-08-03"), true);
});

test("기간 반복 일정은 종료일까지만 보인다", () => {
  const bounded = { ...base, recurrence: "daily" as const, scheduledEndDate: "2026-07-25" };
  assert.equal(isTaskVisibleOnDate(bounded, "2026-07-21"), false);
  assert.equal(isTaskVisibleOnDate(bounded, "2026-07-22"), true);
  assert.equal(isTaskVisibleOnDate(bounded, "2026-07-25"), true);
  assert.equal(isTaskVisibleOnDate(bounded, "2026-07-26"), false);
});

test("한국 시간 자정에 날짜가 바뀐다", () => {
  assert.equal(kstDateKey(Date.UTC(2026, 6, 22, 14, 59)), "2026-07-22");
  assert.equal(kstDateKey(Date.UTC(2026, 6, 22, 15, 0)), "2026-07-23");
});

test("날짜별 완료 키와 월 범위를 안정적으로 만든다", () => {
  assert.equal(completionId("task-1", "2026-07-22"), "task-1:2026-07-22");
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
  assert.equal(monthRange("2026-13"), null);
});

test("미래 일정은 분류 목록에 남고 지난 단발 일정은 빠진다", () => {
  assert.equal(isTaskUpcoming({ ...base, scheduledDate: "2026-07-23", recurrence: "once" }, "2026-07-22"), true);
  assert.equal(isTaskUpcoming({ ...base, scheduledDate: "2026-07-21", recurrence: "once" }, "2026-07-22"), false);
  assert.equal(isTaskUpcoming({ ...base, scheduledDate: "2026-07-21", recurrence: "daily" }, "2026-07-22"), true);
  assert.equal(isTaskUpcoming({ ...base, recurrence: "daily", scheduledEndDate: "2026-07-21" }, "2026-07-22"), false);
  assert.equal(isTaskUpcoming({ ...base, recurrence: "daily", scheduledEndDate: "2026-07-22" }, "2026-07-22"), true);
});

test("실제로 존재하는 날짜만 허용한다", () => {
  assert.equal(isValidDateKey("2026-02-28"), true);
  assert.equal(isValidDateKey("2026-02-30"), false);
  assert.equal(isValidDateKey("not-a-date"), false);
});

test("미래에 시작하는 매일 일정은 시작일부터 월말까지 날짜별로 펼쳐진다", () => {
  assert.deepEqual(dateKeysInRange("2026-07-29", "2026-08-01"), ["2026-07-29", "2026-07-30", "2026-07-31"]);
});
