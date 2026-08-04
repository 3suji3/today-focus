import assert from "node:assert/strict";
import test from "node:test";
import { MAX_MULTI_DATES, normalizeSelectedDates } from "../lib/multi-date.ts";

test("여러 날짜 선택값은 중복과 잘못된 날짜를 제거하고 정렬한다", () => {
  assert.deepEqual(
    normalizeSelectedDates(["2026-08-07", "2026-08-05", "2026-08-07", "잘못된 날짜", "2026-08-01"], "2026-08-04"),
    ["2026-08-05", "2026-08-07"],
  );
});

test("한 번에 선택할 수 있는 날짜 수를 제한한다", () => {
  const values = Array.from({ length: 40 }, (_, index) => new Date(Date.UTC(2026, 7, 4 + index)).toISOString().slice(0, 10));
  assert.equal(normalizeSelectedDates(values, "2026-08-04").length, MAX_MULTI_DATES);
});
