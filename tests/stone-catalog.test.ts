import test from "node:test";
import assert from "node:assert/strict";
import { STONE_SHAPE_COUNT, stoneCatalog, stoneCatalogEntries, stoneShapeIndex, stoneSpeciesIndexes, unlockedStoneEntries, unlockedStoneIndex, unlockedStones } from "../app/stone-catalog.ts";

test("돌 친구 224종이 기존 번호를 유지하며 1개부터 15000개까지 열린다", () => {
  assert.equal(stoneCatalog.length, 224);
  assert.equal(stoneCatalog[0][0], "포근돌");
  assert.equal(stoneCatalog[95][0], "왕국수호돌");
  assert.equal(stoneCatalog[128][0], "몽글구름돌");
  assert.equal(stoneCatalog[160][0], "콩알돌");
  assert.equal(stoneCatalogEntries[0].goal, 1);
  assert.equal(stoneCatalogEntries.at(-1)?.goal, 15000);
  assert.deepEqual(stoneCatalogEntries.map(({ goal }) => goal), stoneCatalogEntries.map(({ goal }) => goal).sort((a, b) => a - b));
});

test("공유 화면에는 현재까지 해금한 돌 종류만 나타난다", () => {
  assert.equal(unlockedStones(0).length, 0);
  assert.equal(unlockedStones(10).length, 6);
  assert.equal(unlockedStones(10000).length, 173);
  assert.equal(unlockedStones(15000).length, 224);
});

test("연속 해금되는 기존 돌과 신규 돌은 같은 모양을 반복하지 않는다", () => {
  assert.equal(STONE_SHAPE_COUNT, 112);
  const firstPageShapes = stoneCatalogEntries.slice(0, 12).map(({ index }) => stoneShapeIndex(index));
  assert.equal(new Set(firstPageShapes).size, firstPageShapes.length);
  assert.notEqual(stoneShapeIndex(0), stoneShapeIndex(96));
  assert.ok(stoneShapeIndex(128) >= 64);
  assert.ok(stoneShapeIndex(160) >= 80);
  assert.ok(firstPageShapes.every((shape) => shape >= 0 && shape < STONE_SHAPE_COUNT));
});

test("캘린더 돌은 현재 해금한 종류 안에서만 안정적으로 고른다", () => {
  assert.equal(unlockedStoneIndex("task-a:2026-07-20", 0), null);
  assert.ok(new Set(unlockedStoneEntries(10).map(({ index }) => index)).has(unlockedStoneIndex("task-a:2026-07-20", 10) ?? -1));
  assert.ok(new Set(unlockedStoneEntries(15000).map(({ index }) => index)).has(unlockedStoneIndex("task-a:2026-07-20", 15000) ?? -1));
  assert.equal(unlockedStoneIndex("task-a:2026-07-20", 15000), unlockedStoneIndex("task-a:2026-07-20", 15000));
});

test("성장 컬렉션에는 개별 돌도감에서 해금한 종류만 나타난다", () => {
  assert.deepEqual(stoneSpeciesIndexes(0, 4), []);
  const mixedStones = stoneSpeciesIndexes(10, 12);
  assert.equal(new Set(mixedStones).size, unlockedStoneEntries(10).length);
  assert.ok(mixedStones.every((stone, index) => index === 0 || stone !== mixedStones[index - 1]));
  assert.ok(stoneSpeciesIndexes(100, 14, 20).every((index) => new Set(unlockedStoneEntries(100).map((entry) => entry.index)).has(index)));
  assert.ok(stoneSpeciesIndexes(5100, 14, 5000).every((index) => new Set(unlockedStoneEntries(5100).map((entry) => entry.index)).has(index)));
});
