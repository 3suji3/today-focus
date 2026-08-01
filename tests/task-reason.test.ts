import assert from "node:assert/strict";
import test from "node:test";
import { makeTaskReason } from "../lib/task-reason.ts";

test("explains an ambiguous fallback separately from a natural other task", () => {
  assert.equal(
    makeTaskReason("기타", 20, "보통", "fallback"),
    "분류가 애매해 기타에 뒀어. 수정하면 다음엔 더 잘 맞출게",
  );
  assert.equal(
    makeTaskReason("기타", 20, "보통", "rules"),
    "이 일은 다른 분류보다 기타에 두는 게 가장 자연스러워",
  );
});

test("treats a manually selected other category as intentional", () => {
  assert.equal(
    makeTaskReason("기타", 20, "보통", "personal"),
    "이 일은 다른 분류보다 기타에 두는 게 가장 자연스러워",
  );
});
