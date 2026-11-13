import test from "node:test";
import assert from "node:assert/strict";
import { validateHeadline } from "../src/lib/consulting-style";
import { generateCandidates } from "../src/lib/ai";
import { sampleData } from "../src/lib/demo";
import { makeScene, wrap } from "../src/lib/scene";
import { forest } from "../src/lib/design";
import type { DeckInput } from "../src/lib/model";

test("spoken consulting headlines accept past/planned tense and fit two lines", () => {
  const headline = "저희의 솔루션은 고객 요청을 현장 기록과 연결해 대응안을 제시하고, 최종 판단은 담당자가 내릴 수 있게 설계될 예정입니다.";
  validateHeadline(headline, true);
  validateHeadline("공개 자료를 통해 해당 기능의 가능성을 확인할 수 있었습니다.", true);
  assert.ok(wrap(headline, 18, 12.49).length <= 2);
  const item = { index: 1, section: "설계", message: headline, contentHint: "업무 흐름" };
  const scene = makeScene({ layoutId: "c-header-boxes", section: "설계", headline, data: sampleData("c-header-boxes", item), sources: [] }, forest);
  assert.equal(scene.warnings.some((w) => w.includes(headline.slice(0, 22))), false);
  assert.throws(() => validateHeadline("가".repeat(76), true));
  assert.throws(() => validateHeadline("결론 라벨", true));
  assert.throws(() => validateHeadline("가".repeat(76), false));
});

test("consulting generation receives curated rules and previous-slide context", async () => {
  const original = globalThis.fetch;
  const input: DeckInput = { topic: "검증용", purpose: "수업", slideCount: 6, deckType: "consulting", designSystemId: "ict-forest" };
  const previous = { index: 1, section: "문제", message: "요청과 기록이 분리되어 있습니다.", contentHint: "분리된 정보" };
  const item = { index: 2, section: "솔루션", message: "해당 문제를 해결할 예정입니다.", contentHint: "업무 흐름" };
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.match(body.instructions, /최대 75자/);
    assert.match(body.instructions, /분모/);
    assert.deepEqual(JSON.parse(body.input).narrativeContext.previous, {index:previous.index,section:previous.section,message:previous.message});
    const plannedId = JSON.parse(body.input).slotPlan[0].layoutId;
    return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ slides: [{ layoutId: plannedId, section: item.section, headline: "해당 문제를 해결하기 위해 저희의 솔루션을 설계할 예정입니다.", dataJson: JSON.stringify(sampleData(plannedId, item)), sourceUrls: [], notes: "검증용" }] }) }] }] });
  };
  try {
    const result = await generateCandidates({ provider: "openai", key: "test-only", model: "gpt-6-luna" }, input, item, [], "", [], true, [previous, item]);
    assert.equal(result.length, 1);
  } finally { globalThis.fetch = original; }
});
