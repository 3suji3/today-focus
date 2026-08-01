import assert from "node:assert/strict";
import test from "node:test";
import { classifyTask } from "../lib/classification.ts";

test("classifies reading as study instead of project", () => {
  assert.equal(classifyTask("책 읽기 30분").category, "공부");
  assert.equal(classifyTask("Playwright 강의 듣기").category, "공부");
});

test("supports daily life and unknown fallback categories", () => {
  assert.equal(classifyTask("마트에서 장보기").category, "일상");
  const fallback = classifyTask("빨간 상자 확인");
  assert.equal(fallback.category, "기타");
  assert.equal(fallback.source, "fallback");
});

test("recognizes tasks that naturally belong in other", () => {
  const result = classifyTask("친구 생일 선물 고르기");
  assert.equal(result.category, "기타");
  assert.equal(result.source, "rules");
});

test("uses account-specific corrections before general rules", () => {
  const result = classifyTask("독서모임 안내문 만들기", [
    { title: "독서모임 안내문 만들기", category: "프로젝트" },
  ]);
  assert.equal(result.category, "프로젝트");
  assert.equal(result.source, "personal");
});
