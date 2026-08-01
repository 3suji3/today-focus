import assert from "node:assert/strict";
import test from "node:test";
import { getBearHeroLine, getEmptyTaskCopy, isBearPersonality } from "../lib/bear-personality.ts";

test("validates supported bear personalities", () => {
  assert.equal(isBearPersonality("warm"), true);
  assert.equal(isBearPersonality("quiet"), false);
});

test("uses personality-specific category empty copy without showing zero counts", () => {
  const cool = getEmptyTaskCopy("cool", "취업");
  const lively = getEmptyTaskCopy("lively", "공부");

  assert.equal(cool.title, "취업 일정 없음");
  assert.match(lively.title, /공부/);
  assert.doesNotMatch(cool.title, /0개/);
});

test("changes progress dialogue with the selected personality", () => {
  const common = {
    activeTab: "오늘",
    mood: "progress" as const,
    total: 3,
    complete: 1,
    remaining: 2,
    filtered: 3,
    recommended: 2,
  };

  const cool = getBearHeroLine({ ...common, personality: "cool", variantKey: "2026-07-29" });
  const lively = getBearHeroLine({ ...common, personality: "lively", variantKey: "2026-07-28" });

  assert.match(cool, /완료|남았|진행/);
  assert.match(lively, /!|돌 친구|미션/);
  assert.notEqual(cool, lively);
});

test("rotates hero dialogue without changing the current state", () => {
  const common = {
    activeTab: "오늘",
    mood: "progress" as const,
    total: 3,
    complete: 1,
    remaining: 2,
    filtered: 3,
    recommended: 2,
    personality: "warm" as const,
  };
  const lines = ["2026-07-28", "2026-07-29", "2026-07-30"].map((variantKey) =>
    getBearHeroLine({ ...common, variantKey }),
  );

  assert.equal(new Set(lines).size, 3);
});

test("offers at least ten different lines for the same situation", () => {
  const common = {
    activeTab: "오늘",
    mood: "progress" as const,
    total: 12,
    complete: 4,
    remaining: 8,
    filtered: 12,
    recommended: 3,
    personality: "warm" as const,
  };
  const lines = Array.from({ length: 10 }, (_, index) =>
    getBearHeroLine({ ...common, variantKey: String(index) }),
  );

  assert.equal(new Set(lines).size, 10);
});
