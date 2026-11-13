import { test } from "node:test";
import assert from "node:assert/strict";
import { consultingStylePrompt } from "../src/lib/consulting-style";

test("컨설팅 키메시지 지침에 스토리라인 체인이 있다", () => {
  assert.match(consultingStylePrompt, /스토리라인 체인/);
  assert.match(consultingStylePrompt, /앞 장의 결론이 던진 질문/);
  assert.match(consultingStylePrompt, /목적에 대한 답과 다음 행동/);
});
