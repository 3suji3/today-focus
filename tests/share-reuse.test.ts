import assert from "node:assert/strict";
import test from "node:test";
import { hasSameSharedTasks, normalizeShareTaskIds } from "../lib/share-reuse.ts";

test("같은 일정 조합은 선택 순서가 달라도 같은 공유 내용이다", () => {
  assert.equal(hasSameSharedTasks(JSON.stringify(["task-b", "task-a"]), ["task-a", "task-b"]), true);
});

test("일정이 하나라도 다르면 새로운 공유 내용이다", () => {
  assert.equal(hasSameSharedTasks(JSON.stringify(["task-a", "task-b"]), ["task-a", "task-c"]), false);
});

test("기존 공유 뒤에 일정을 추가하면 새로운 공유 내용이다", () => {
  assert.equal(hasSameSharedTasks(JSON.stringify(["task-a", "task-b"]), ["task-a", "task-b", "task-c"]), false);
});

test("공유할 일정 ID는 중복 없이 안정적인 순서로 저장한다", () => {
  assert.deepEqual(normalizeShareTaskIds(["task-b", "task-a", "task-b"]), ["task-a", "task-b"]);
});
