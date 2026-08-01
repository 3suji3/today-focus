import assert from "node:assert/strict";
import test from "node:test";
import { checkWriteRateLimit } from "../lib/rate-limit.ts";

test("allows normal per-account writes and limits bursts", () => {
  const key = `user-${crypto.randomUUID()}`;
  const now = Date.now();
  for (let index = 0; index < 60; index += 1) {
    assert.equal(checkWriteRateLimit(key, now).allowed, true);
  }
  const blocked = checkWriteRateLimit(key, now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(checkWriteRateLimit(key, now + 60_001).allowed, true);
});

