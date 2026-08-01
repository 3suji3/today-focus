import assert from "node:assert/strict";
import test from "node:test";
import { getMascotVariant, getTodayMood } from "../lib/today-mood.ts";

test("오늘 일정이 없으면 첫 시작 상태다", () => assert.equal(getTodayMood(0, 0), "empty"));
test("일부를 끝내면 진행 상태다", () => assert.equal(getTodayMood(4, 2), "progress"));
test("전부 끝내면 축하 상태다", () => assert.equal(getTodayMood(4, 4), "complete"));

test("일부 완료 중에도 강도에 따라 곰 표정이 바뀐다", () => {
  assert.equal(getMascotVariant("progress", "낮음"), "encouraging");
  assert.equal(getMascotVariant("progress", "보통"), "default");
  assert.equal(getMascotVariant("progress", "높음"), "focused");
});

test("모든 일정 완료 표정은 강도보다 우선한다", () => {
  assert.equal(getMascotVariant("complete", "낮음"), "celebrating");
  assert.equal(getMascotVariant("complete", "보통"), "celebrating");
  assert.equal(getMascotVariant("complete", "높음"), "celebrating");
});
