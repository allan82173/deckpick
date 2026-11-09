import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { extractJson } from "../src/lib/local-agent";

test("로컬 에이전트 응답에서 코드 울타리·설명을 걷어내고 JSON만 꺼낸다", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('결과입니다: {"a":[1,2]} 끝'), { a: [1, 2] });
  assert.throws(() => extractJson("JSON 없음"));
});

test("공개 사이트(VERCEL)와 설정이 없는 서버에서는 로컬 에이전트 연결을 막는다", async () => {
  const { connection } = await import("../src/lib/ai");
  const request = new Request("http://localhost/api/x");
  const before = { flag: process.env.DECKPICK_LOCAL_AGENT, vercel: process.env.VERCEL };
  try {
    delete process.env.DECKPICK_LOCAL_AGENT;
    assert.throws(() => connection(request, { provider: "claude-code" }), /PC에서 실행한 DeckPick/);
    process.env.DECKPICK_LOCAL_AGENT = "1"; process.env.VERCEL = "1";
    assert.throws(() => connection(request, { provider: "claude-code" }), /PC에서 실행한 DeckPick/);
  } finally {
    if (before.flag === undefined) delete process.env.DECKPICK_LOCAL_AGENT; else process.env.DECKPICK_LOCAL_AGENT = before.flag;
    if (before.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = before.vercel;
  }
});

test("가짜 Claude Code CLI로 구조화 응답·웹 검색 출처가 기존 형식으로 바뀌는지 확인한다", { skip: process.platform === "win32" }, async () => {
  const bin = await mkdtemp(path.join(tmpdir(), "fake-claude-"));
  // 표준 입력에 "검색"이 있으면 조사 결과, 아니면 구조화 응답을 돌려주는 가짜 CLI.
  await writeFile(path.join(bin, "claude"), `#!/bin/sh
if [ "$1" = "--version" ]; then echo 2.0; exit 0; fi
input=$(cat)
case "$input" in
  *검색*) echo '{"is_error":false,"result":"{\\"summary\\":\\"요약\\",\\"sources\\":[{\\"title\\":\\"기사\\",\\"url\\":\\"https://example.com/a\\",\\"snippet\\":\\"발췌\\"},{\\"title\\":\\"가짜\\",\\"url\\":\\"ftp://x\\",\\"snippet\\":\\"\\"}]}","usage":{"input_tokens":10,"cache_read_input_tokens":90,"output_tokens":5}}';;
  *) echo '{"is_error":false,"result":"ignored","structured_output":{"city":"서울"},"usage":{"input_tokens":3,"cache_read_input_tokens":7,"output_tokens":2}}';;
esac
`);
  await chmod(path.join(bin, "claude"), 0o755);
  const before = { path: process.env.PATH, flag: process.env.DECKPICK_LOCAL_AGENT };
  process.env.PATH = `${bin}:${process.env.PATH}`; process.env.DECKPICK_LOCAL_AGENT = "1";
  try {
    const { connection, structured, research } = await import("../src/lib/ai");
    const { withExecution } = await import("../src/lib/execution-scope");
    const c = connection(new Request("http://localhost/api/x"), { provider: "claude-code" });
    assert.equal(c.model, "sonnet");
    const measured = await withExecution(async () => ({
      value: await structured(c, z.object({ city: z.string() }), "편집자", "수도를 알려 주세요"),
      found: await research(c, "보험사 AI 검색"),
    }));
    assert.deepEqual(measured.result.value, { city: "서울" });
    assert.deepEqual(measured.result.found.sources.map(s => s.url), ["https://example.com/a"], "http(s)가 아닌 출처는 버린다");
    assert.equal(measured.execution.calls[0].inputTokens, 10, "입력은 캐시 읽기를 합친 전체 기준");
    assert.equal(measured.execution.calls[0].cachedInputTokens, 7);
  } finally { process.env.PATH = before.path; if (before.flag === undefined) delete process.env.DECKPICK_LOCAL_AGENT; else process.env.DECKPICK_LOCAL_AGENT = before.flag; }
});
