import test from "node:test";
import assert from "node:assert/strict";
import { protectKoreanCounters, shouldJoinHeroGreeting } from "../lib/korean-line-break.ts";

test("숫자와 개 및 뒤따르는 조사가 줄 중간에서 갈라지지 않는다", () => {
  assert.equal(protectKoreanCounters("남은 4개도 천천히 가보자"), "남은 4\u2060개도 천천히 가보자");
  assert.equal(protectKoreanCounters("오늘 할 일 3개를 다 끝냈네"), "오늘 할 일 3\u2060개를 다 끝냈네");
  assert.equal(protectKoreanCounters("추천한 2개부터 해보자"), "추천한 2\u2060개부터 해보자");
});

test("짧은 이름과 첫 문장은 붙이고 길어지면 이름 뒤에서 줄을 바꾼다", () => {
  assert.equal(shouldJoinHeroGreeting("sj야", "2개 해냈어!"), true);
  assert.equal(shouldJoinHeroGreeting("김창엽아", "2개 해냈어!"), true);
  assert.equal(shouldJoinHeroGreeting("아주긴사용자이름아", "12개 해냈어!"), false);
});
