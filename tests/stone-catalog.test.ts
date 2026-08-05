import test from "node:test";
import assert from "node:assert/strict";
import { STONE_SHAPE_COUNT, stoneCatalog, stoneCatalogEntries, stoneShapeIndex, stoneSpeciesIndexes, unlockedStoneEntries, unlockedStoneIndex, unlockedStones } from "../app/stone-catalog.ts";
import { stoneMotif, stoneVisualProfile } from "../app/stone-visual.ts";

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

test("돌 이름의 구체적인 재료와 색을 우선해 서로 다른 외형을 고른다", () => {
  assert.equal(stoneMotif("우유빛돌"), "milk");
  assert.equal(stoneMotif("딸기우유돌"), "strawberry-milk");
  assert.equal(stoneVisualProfile("우유빛돌", 97).theme, "white");
  assert.equal(stoneVisualProfile("딸기우유돌", 102).theme, "pink");
  assert.equal(stoneVisualProfile("민트초코돌", 182).theme, "mint");
  assert.equal(stoneVisualProfile("보랏빛혜성돌", 119).theme, "purple");
  assert.notDeepEqual(stoneVisualProfile("우유빛돌", 97), stoneVisualProfile("딸기우유돌", 102));
});

test("전체 돌 친구는 이름·모양·세부 무늬 조합이 완전히 겹치지 않는다", () => {
  const signatures = stoneCatalog.map(([name], index) => {
    const visual = stoneVisualProfile(name, index);
    return [stoneShapeIndex(index), visual.motif, visual.theme, visual.detail, visual.angle, stoneFacesForTest(index)].join(":");
  });
  assert.equal(new Set(signatures).size, stoneCatalog.length);
});

function stoneFacesForTest(index: number) {
  return index % 8;
}
