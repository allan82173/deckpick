import test from "node:test";
import assert from "node:assert/strict";
import { candidatePlan, candidateSignature, replaceCandidate } from "../src/lib/candidate-plan";
import { demoCandidates, sampleData } from "../src/lib/demo";
import { makeScene } from "../src/lib/scene";
import { forest } from "../src/lib/design";
import { generateCandidates } from "../src/lib/ai";
import type { DeckInput, Deck, OutlineItem, LayoutId } from "../src/lib/model";
const input: DeckInput = { deckType: "consulting", designSystemId: "ict-forest", topic: "사용자 경험 개선", purpose: "검토", slideCount: 6 };
const item: OutlineItem = { index: 2, section: "문제", message: "확인한 근거를 바탕으로 문제를 정의합니다", contentHint: "관찰과 검증" };
function fixture(): Deck {
  return { id: "diversity", input, outline: [item], designSystem: forest, research: [], chat: { setup: [], outline: [], slides: {} }, candidates: { 2: demoCandidates(input, item) }, picked: { 2: 1 }, edited: {}, demo: true };
}
test("body sections get different semantic triplets rather than the same first three", () => {
  const sets = ["현황", "문제", "원인", "해결안", "실행계획", "결론"].map((section) => candidatePlan(input, { ...item, section, message: "내용을 검토합니다", contentHint: "" }));
  assert.ok(new Set(sets.map((s) => s.join())).size >= 5);
  for (const set of sets) {
    assert.equal(new Set(set).size, 3); assert.equal(set.includes("c-toc"), false);
    assert.ok(!(set.includes("c-funnel") && set.includes("c-arrow-flow")));
  }
});
test("repeated slot replacement never reuses visible layouts and leaves other cards/edits intact", () => {
  let deck = fixture();
  const edited = { ...deck.candidates[2][1], headline: "직접 수정한 문장입니다" };
  deck.edited[2] = edited;
  const kept = deck.candidates[2][1];
  for (let round = 1; round <= 10; round++) {
    const previous = deck.candidates[2], excluded = previous.map((c) => c.layoutId);
    const replacement = demoCandidates(input, item, excluded, round, 1, previous.map(candidateSignature))[0];
    assert.ok(!excluded.includes(replacement.layoutId));
    deck = replaceCandidate(deck, 2, 0, replacement);
    assert.strictEqual(deck.candidates[2][1], kept);
    assert.strictEqual(deck.edited[2], edited); assert.equal(deck.picked[2], 1);
  }
});
test("replacing the selected card clears only that selection; invalid replacement cannot mutate deck", () => {
  const deck = fixture(); deck.picked[2] = 0; deck.edited[2] = deck.candidates[2][0];
  const before = JSON.stringify(deck);
  assert.throws(() => replaceCandidate(deck, 2, 0, deck.candidates[2][0]));
  assert.equal(JSON.stringify(deck), before);
  const candidate = demoCandidates(input, item, deck.candidates[2].map((c) => c.layoutId), 1, 1)[0];
  const updated = replaceCandidate(deck, 2, 0, candidate);
  assert.equal(updated.picked[2], undefined); assert.equal(updated.edited[2], undefined);
  assert.equal(deck.picked[2], 0);
});
test("cover replacement remains a cover but cannot duplicate any visible copy", () => {
  const cover = { ...item, index: 0, section: "표지" };
  const previous = demoCandidates(input, cover);
  const next = demoCandidates(input, cover, [], 1, 1, previous.map(candidateSignature));
  assert.equal(next.length, 1); assert.equal(next[0].layoutId, "c-cover");
  assert.ok(!previous.map(candidateSignature).includes(candidateSignature(next[0])));
});
test("new layouts fit native preview bounds without sample text overflow", () => {
  for (const id of ["c-split-insight", "c-matrix", "c-timeline"] as const) {
    const scene = makeScene({ layoutId: id, section: item.section, headline: item.message, data: sampleData(id, item), sources: [] }, forest);
    assert.deepEqual(scene.warnings, [], id);
    assert.ok(scene.nodes.some((n) => n.kind === "text"));
  }
});
test("API enforces planned structural diversity and repairs wrong layouts", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const prompt = JSON.parse(JSON.parse(String(init?.body)).input.split("\n앞선 응답")[0]);
    const plan = prompt.slotPlan as { layoutId: LayoutId }[];
    assert.equal(new Set(plan.map((p) => p.layoutId)).size, 3);
    const slides = plan.map(({ layoutId }, i) => {
      const id = calls === 1 ? plan[0].layoutId : layoutId;
      return { layoutId: id, section: item.section, headline: item.message, dataJson: JSON.stringify(sampleData(id, item, i)), sourceUrls: [], notes: "가상 검증" };
    });
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ slides }) }] }] });
  };
  try {
    const result = await generateCandidates({ provider: "openai", key: "test-only", model: "test" }, input, item, [], "");
    assert.equal(calls, 2); assert.equal(new Set(result.map((c) => c.layoutId)).size, 3);
  } finally { globalThis.fetch = original; }
});
test("API single replacement emits exactly one nonexcluded structure", async () => {
  const previous = demoCandidates(input, item), excluded = previous.map((c) => c.layoutId);
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const prompt = JSON.parse(JSON.parse(String(init?.body)).input);
    assert.equal(prompt.count, 1);
    const id: LayoutId = prompt.slotPlan[0].layoutId;
    assert.ok(!excluded.includes(id));
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ slides: [{ layoutId: id, section: item.section, headline: item.message, dataJson: JSON.stringify(sampleData(id, item)), sourceUrls: [], notes: "가상 검증" }] }) }] }] });
  };
  try {
    const result = await generateCandidates({ provider: "openai", key: "test-only", model: "test" }, input, item, [], "", excluded, true, [], "", 1, previous.map(candidateSignature));
    assert.equal(result.length, 1);
  } finally { globalThis.fetch = original; }
});
test("model-written long section names cannot fail the slide; the outline section is used", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const closing: OutlineItem = { ...item, index: 5, section: "결론" };
  globalThis.fetch = async (_url, init) => {
    calls++;
    const prompt = JSON.parse(JSON.parse(String(init?.body)).input.split("\n앞선 응답")[0]);
    const slides = (prompt.slotPlan as { layoutId: LayoutId }[]).map(({ layoutId }, i) => ({ layoutId, section: "결론 및 다음 검증 단계", headline: closing.message, dataJson: JSON.stringify(sampleData(layoutId, closing, i)), sourceUrls: [], notes: "가상 검증" }));
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ slides }) }] }] });
  };
  try {
    const result = await generateCandidates({ provider: "openai", key: "test-only", model: "test" }, input, closing, [], "");
    assert.equal(calls, 1);
    assert.ok(result.length >= 1);
    for (const slide of result) assert.equal(slide.section, "결론");
  } finally { globalThis.fetch = original; }
});
