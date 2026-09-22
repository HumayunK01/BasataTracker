// Runnable check for the shared proxy auth gate. Uses node:test (stdlib).
// Run: node --test api/
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://stub.supabase.co";
process.env.SUPABASE_ANON_KEY = "anon-stub";

const { default: authorized } = await import("./_auth.js");

const req = (t) => ({ query: { t } });

test("denies when no token", async () => {
  assert.equal(await authorized(req(undefined)), false);
  assert.equal(await authorized({ query: {} }), false);
});

test("denies when token is not a string or too long", async () => {
  assert.equal(await authorized(req(["a", "b"])), false);
  assert.equal(await authorized(req("x".repeat(4097))), false);
});

test("allows when supabase accepts the token", async () => {
  globalThis.fetch = async () => ({ ok: true });
  assert.equal(await authorized(req("good-token")), true);
});

test("denies when supabase rejects the token", async () => {
  globalThis.fetch = async () => ({ ok: false });
  assert.equal(await authorized(req("bad-token")), false);
});

test("allows when token is in Authorization header", async () => {
  globalThis.fetch = async () => ({ ok: true });
  assert.equal(await authorized({ headers: { authorization: "Bearer header-token" } }), true);
});

test("denies when the auth call throws", async () => {
  globalThis.fetch = async () => { throw new Error("network"); };
  assert.equal(await authorized(req("any")), false);
});
