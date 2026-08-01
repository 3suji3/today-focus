import test from "node:test";
import assert from "node:assert/strict";
import { GROWTH_COLLECTION_MAX, getStoneEasterEgg } from "../lib/stone-achievements.ts";
import { allowedStoneStages, stoneStageCollection } from "../lib/stone-stages.ts";

test("행운의 7 계열에서 숨은 반짝임이 나타난다", () => {
  for (const total of [7, 77, 777, 7777]) assert.equal(getStoneEasterEgg(total)?.kind, "lucky");
  assert.equal(getStoneEasterEgg(78), null);
});

test("천 개 단위 성취에는 기념 배지가 나타난다", () => {
  assert.equal(getStoneEasterEgg(1000)?.kind, "milestone");
  assert.equal(getStoneEasterEgg(14000)?.kind, "milestone");
});

test("특별 숫자와 반복·거울 숫자에도 숨은 돌이 나타난다", () => {
  assert.equal(getStoneEasterEgg(42)?.kind, "special");
  assert.equal(getStoneEasterEgg(1234)?.kind, "sequence");
  assert.equal(getStoneEasterEgg(111)?.kind, "mirror");
  assert.equal(getStoneEasterEgg(1221)?.kind, "mirror");
});

test("모든 컬렉션을 모으면 특별곰이 영구 해금된다", () => {
  assert.equal(GROWTH_COLLECTION_MAX, 15000);
  assert.equal(stoneStageCollection.length, 48);
  assert.equal(stoneStageCollection.at(-1)?.unlockAt, GROWTH_COLLECTION_MAX);
  assert.equal(allowedStoneStages.size, 49);
  assert.equal(getStoneEasterEgg(14999), null);
  assert.equal(getStoneEasterEgg(15000)?.kind, "legendary");
  assert.equal(getStoneEasterEgg(20000)?.kind, "legendary");
});
