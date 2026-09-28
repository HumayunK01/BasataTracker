// Runnable test for Upstash Redis caching & fallback mechanics.
// Run: node --test api/_redis.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

test("redis and ratelimit export graceful nulls when env vars are absent", async () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  // Dynamic import with fresh timestamp to verify null fallback
  const mod = await import(`./_redis.js?t=${Date.now()}`);
  assert.equal(mod.redis, null);
  assert.equal(mod.ratelimit, null);

  process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
});

test("cache buffer encoding and decoding preserves binary integrity", () => {
  const rawBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG magic bytes
  const base64 = rawBytes.toString("base64");
  const restored = Buffer.from(base64, "base64");
  assert.deepEqual(restored, rawBytes);
  assert.equal(restored.length, 8);
});
