import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/config/route";
import { keyCheck } from "../src/lib/ai";

test("server configuration exposes availability without exposing credentials", async () => {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-secret-never-return";
  try {
    const response = await GET();
    const body = await response.text();
    assert.equal(JSON.parse(body).serverKeys.openai, true);
    assert.equal(body.includes("test-secret-never-return"), false);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  } finally {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  }
});

test("credit exhaustion is distinguished from ordinary rate limits", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: { code: "credit_balance_exhausted" } }, { status: 429 });
  try {
    await assert.rejects(() => keyCheck({ provider: "openai", key: "test-key", model: "test" }), /크레딧 잔액이 없습니다/);
  } finally {
    globalThis.fetch = original;
  }
});


test("Luna uses bounded low-effort generation and no reasoning for key checks", async () => {
  const original = globalThis.fetch;
  const { providerCall } = await import("../src/lib/ai");
  const sent: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init?.body)));
    return Response.json({ status: "completed", output: [] });
  };
  try {
    const c = { provider: "openai" as const, key: "test-only", model: "gpt-6-luna" };
    await providerCall(c, { input: "Generate" });
    assert.equal(sent[0].model, "gpt-6-luna");
    assert.deepEqual(sent[0].reasoning, { effort: "low" });
    assert.equal(sent[0].max_output_tokens, 10000);
    assert.equal(sent[0].store, false);
    await keyCheck(c);
    assert.deepEqual(sent[1].reasoning, { effort: "none" });
    assert.equal(sent[1].max_output_tokens, 32);
  } finally { globalThis.fetch = original; }
});
