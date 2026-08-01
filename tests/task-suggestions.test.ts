import assert from "node:assert/strict";
import test from "node:test";
import { findTaskSuggestions } from "../lib/task-suggestions.ts";

const templates = [
  { title: "포트폴리오 최종 완성", category: "취업" as const, minutes: 40 },
  { title: "React 강의 듣기", category: "공부" as const, minutes: 30 },
  { title: "포트폴리오 문구 수정", category: "취업" as const, minutes: 20 },
];

test("입력한 글자가 포함된 최근 일정만 제안한다", () => {
  assert.deepEqual(
    findTaskSuggestions(templates, "포트"),
    [templates[0], templates[2]],
  );
});

test("새로운 입력과 일치하는 기록이 없으면 목록을 띄우지 않는다", () => {
  assert.deepEqual(findTaskSuggestions(templates, "처음 쓰는 일정"), []);
});

test("앞부분이 일치하는 일정을 중간 일치보다 먼저 보여준다", () => {
  const results = findTaskSuggestions([
    { title: "오늘 React 복습", category: "공부", minutes: 20 },
    { title: "React 강의 듣기", category: "공부", minutes: 30 },
  ], "React");
  assert.equal(results[0]?.title, "React 강의 듣기");
});
