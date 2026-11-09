import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { taskAnalysisSchema } from "../src/lib/task-model";
import { taskFingerprint } from "../src/lib/task-analysis";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { demoOutline, demoCandidates } from "../src/lib/demo";
import { deckLayoutIssue } from "../src/lib/candidate-plan";
import { forest } from "../src/lib/design";
import type { Deck, DeckInput } from "../src/lib/model";

const c = { provider: "openai" as const, key: "test-only", model: "gpt-6-luna" };
const input: DeckInput = { topic: "검토 효율 합성 과제", purpose: "반복 지적 처리", slideCount: 8, deckType: "consulting", designSystemId: "ict-forest" };
const reply = (value: unknown) => Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }], usage: { input_tokens: 100, output_tokens: 10, total_tokens: 110 } });

test("레이아웃 반복만 지적된 장은 새로 만들지 않고 기존 후보와 자리를 바꾸며, 재검토는 바뀐 장만 본다", async () => {
  const native = fetch; let candidateCalls = 0; const focuses: unknown[] = [];
  // 데모 장의 "근거표 미참조" 경고가 붙지 않는 역할로 둬서 반복 지적만 남긴다.
  const outline = demoOutline(input).map(item => item.index === 4 ? { ...item, role: "합의 사항" as const } : item);
  const analysis = taskAnalysisSchema.parse({ questions: ["Q1", "Q2"].map(id => ({ id, question: "q", publicQuestion: "q", judgmentForm: "선택", needsPublicEvidence: false })), publicContext: [], privateConditions: [], internalPremises: [], stage: "중간", language: "ko", slideCount: 8, requiredSections: [], checklist: [{ id: "count", requirement: "8장" }], terminology: [], notationRules: [], fingerprint: taskFingerprint(input, "", []) });
  const candidates = Object.fromEntries(outline.map(item => [item.index, demoCandidates(input, item)]));
  // 다른 장은 사용자 편집본으로 고정해 이 테스트가 반복 처리만 보게 한다. 인덱스 4의 기본 후보를 인덱스 2와 같은 레이아웃으로 만들어 '간격' 규칙을 어기게 한다.
  const target = 4; candidates[target] = [{ ...candidates[2][0], headline: "반복 장" }, ...candidates[target].slice(1)];
  const deck: Deck = { id: randomUUID(), input, designSystem: forest, research: [], researchRecord: { analysis, evidence: [], searchStatus: "not-requested", query: "", notice: "" } as never, outline, candidates, picked: Object.fromEntries(outline.map(item => [item.index, 0])), edited: Object.fromEntries(outline.filter(item => item.index !== target).map(item => [item.index, candidates[item.index][0]])), chat: { setup: [], outline: [], slides: {} }, demo: false };
  const previous = outline.slice(0, target).map((_, i) => candidates[i][0].layoutId);
  assert.ok(deckLayoutIssue(candidates[target][0].layoutId, previous, outline.length), "준비: 반복 규칙 위반");
  assert.ok(candidates[target].slice(1).some(s => !deckLayoutIssue(s.layoutId, previous, outline.length)), "준비: 대체 후보 존재");
  globalThis.fetch = async (_, init) => { const body = JSON.parse(String(init?.body)); if (body.text.format.schema.properties.checklist) { focuses.push(JSON.parse(body.input).focusPages); return reply({ checklist: [{ id: "count", passed: true, reason: "합성" }], issues: [], summary: "합성 검토" }); } if (JSON.parse(body.input).item?.index === target && focuses.length < 2) candidateCalls++; return reply({}); };
  try {
    const reviewed = await reviewAndRepairDeck(c, deck);
    assert.equal(candidateCalls, 0, "반복만 지적된 첫 수정 라운드에서는 AI로 다시 만들지 않는다(재검토 뒤 지적은 이 테스트 대상이 아님)");
    const swap = reviewed.replacements.find(r => r.index === target) as { swapWith?: number } | undefined;
    assert.ok(swap && typeof swap.swapWith === "number" && swap.swapWith > 0);
    assert.notEqual(reviewed.slides[target]?.layoutId, candidates[2][0].layoutId);
    assert.deepEqual(focuses[0], undefined, "첫 검토는 덱 전체");
    assert.deepEqual(focuses[1], [target], "재검토는 바뀐 장만");
  } finally { globalThis.fetch = native; }
});
