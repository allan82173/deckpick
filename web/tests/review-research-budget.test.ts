import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GENERATION_CONFIG } from "../src/lib/generation-config";
import { taskAnalysisSchema } from "../src/lib/task-model";
import { taskFingerprint } from "../src/lib/task-analysis";
import { runResearch } from "../src/lib/research-pipeline";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { demoOutline, demoCandidates } from "../src/lib/demo";
import { forest } from "../src/lib/design";
import type { Deck, DeckInput } from "../src/lib/model";

const c = { provider: "openai" as const, key: "test-only", model: "gpt-6-luna" };
const input: DeckInput = { topic: "예산 합성 과제", purpose: "조사·검토 예산 확인", slideCount: 5, deckType: "consulting", designSystemId: "ict-forest" };
const reply = (value: unknown) => Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }], usage: { input_tokens: 100, output_tokens: 10, total_tokens: 110 } });
const originalText = "원문에서 확인할 수 있는 숫자 42와 조건을 제시합니다.";
function base() {
  const analysis = taskAnalysisSchema.parse({ questions: ["Q1", "Q2"].map(id => ({ id, question: "공개 근거 선택", publicQuestion: "공개 선택", judgmentForm: "선택", needsPublicEvidence: id === "Q1" })), publicContext: [], privateConditions: [], internalPremises: [], stage: "중간", language: "ko", slideCount: 5, requiredSections: [], checklist: [{ id: "count", requirement: "5장" }], terminology: [], notationRules: [], fingerprint: taskFingerprint(input, "", []) });
  return { analysis, plan: { questions: [{ questionId: "Q1", evidenceNeeded: "원문", preferredMaterials: ["기관·기업 공식 안내" as const], localQuery: "공식 자료", englishQuery: "official evidence" }] }, evidence: [], searchStatus: "not-requested" as const, query: "", notice: "" };
}
const row = (url: string, contextMatch: string) => ({ claim: originalText + url, title: "공식 자료", url, kind: "공개 사실", locator: "본문", originalText, publishedAt: "", materialType: "기관·기업 공식 안내", contextMatch, contextReason: "합성", questionIds: ["Q1"] });
const readPage = async (url: string) => ({ url, text: originalText, opened: true, checkedAt: "today", format: "html" as const });

test("enough verified partial-context evidence ends the question after one round", async () => {
  const native = fetch, urls = ["https://example.org/a", "https://example.org/b", "https://example.org/c"]; let searches = 0, followups = 0;
  globalThis.fetch = async (_, init) => { const b = JSON.parse(String(init?.body)); if (JSON.stringify(b.text).includes('"localQuery"')) { followups++; return reply({ localQuery: "후속", englishQuery: "follow-up" }); } return reply({ rows: urls.map(url => row(url, "부분 일치")) }); };
  try {
    const result = await runResearch(c, input, base(), "", [], [], { search: async () => { searches++; return { text: originalText, sources: urls.map(url => ({ title: "공식 자료", url })) }; }, readPage });
    assert.equal(searches, 2); assert.equal(followups, 0); assert.equal(result.researchRecord.searchRounds!.length, 1);
    assert.equal(result.researchRecord.gaps?.length, 0, "verified partial-context sources clear the gate with scope disclosed");
    assert.equal(result.researchRecord.requiresReview,false);
    assert.equal(result.researchRecord.coverage?.[0].status,"substituted");
  } finally { globalThis.fetch = native; }
});

test("follow-up rounds use one query and re-send all sources so earlier originals keep new claims verifiable", async () => {
  const native = fetch, sent: string[][] = []; let searches = 0;
  globalThis.fetch = async (_, init) => { const b = JSON.parse(String(init?.body)); if (JSON.stringify(b.text).includes('"localQuery"')) return reply({ localQuery: "후속", englishQuery: "follow-up" }); const data = JSON.parse(String(b.input)) as { allowedSources: { url: string }[] }; sent.push(data.allowedSources.map(s => s.url)); return reply({ rows: data.allowedSources.map(s => row(s.url, "비교 참고")) }); };
  try {
    await runResearch(c, input, base(), "", [], [], { search: async () => { searches++; return { text: originalText, sources: [{ title: "공식 자료", url: searches <= 2 ? "https://example.org/first" : "https://example.org/second" }] }; }, readPage });
    assert.equal(searches, 2 + GENERATION_CONFIG.research.followupQueries);
    assert.deepEqual(sent, [["https://example.org/first"], ["https://example.org/first", "https://example.org/second"]]);
  } finally { globalThis.fetch = native; }
});

test("a repair round is not started when the review budget cannot fit it, and the review stays complete", async () => {
  const native = fetch, deadline = GENERATION_CONFIG.reliability.deadlines.review; let assessments = 0, candidateCalls = 0;
  const outline = demoOutline(input);
  const deck: Deck = { id: randomUUID(), input, designSystem: forest, research: [], outline, candidates: Object.fromEntries(outline.map(item => [item.index, demoCandidates(input, item)])), picked: Object.fromEntries(outline.map(item => [item.index, 0])), edited: {}, chat: { setup: [], outline: [], slides: {} }, demo: false };
  globalThis.fetch = async (_, init) => { const properties = JSON.parse(String(init?.body)).text.format.schema.properties; if (properties.checklist) { assessments++; return reply({ checklist: [], issues: [{ index: 1, category: "판단", reason: "결론이 약합니다.", repair: "판단을 먼저 쓰세요." }], summary: "합성 검토" }); } candidateCalls++; return reply({}); };
  GENERATION_CONFIG.reliability.deadlines.review = GENERATION_CONFIG.review.roundReserveMs - 1000;
  try {
    const reviewed = await reviewAndRepairDeck(c, deck);
    assert.equal(assessments, 1); assert.equal(candidateCalls, 0); assert.equal(reviewed.review.status, "complete");
    assert.match(reviewed.review.summary, /추가 수정 라운드를 생략/); assert.ok(reviewed.review.issues.some(issue => issue.index === 1));
  } finally { globalThis.fetch = native; GENERATION_CONFIG.reliability.deadlines.review = deadline; }
});
