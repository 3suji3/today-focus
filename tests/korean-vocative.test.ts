import test from "node:test";
import assert from "node:assert/strict";
import { koreanVocative } from "../lib/korean-vocative.ts";

test("받침이 있는 이름에는 아를 붙인다", () => {
  assert.equal(koreanVocative("김창엽"), "김창엽아");
  assert.equal(koreanVocative("민준"), "민준아");
});

test("받침이 없는 이름에는 야를 붙인다", () => {
  assert.equal(koreanVocative("수지"), "수지야");
  assert.equal(koreanVocative("민서"), "민서야");
});

test("영문 별칭과 빈 이름도 자연스럽게 표시한다", () => {
  assert.equal(koreanVocative("sj"), "sj야");
  assert.equal(koreanVocative("  "), "친구야");
});
