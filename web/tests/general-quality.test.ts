import { invalidateStaleReview } from "../src/lib/review-state";
import { insertDraftPage } from "../src/lib/insert-page";
import { placePositionLabels } from "../src/lib/positioning-labels";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { taskAnalysisSchema } from "../src/lib/task-model";
import { pipelineFixture } from "./pipeline-fixture";
import { taskFingerprint, redactPrivateQuery } from "../src/lib/task-analysis";
import { prepareResearch, researchGaps } from "../src/lib/research-pipeline";
import { isPublicAddress, validatePublicUrl, plainHtml, quoteExists, publicationDateExists, readOriginalPage } from "../src/lib/source-pages";
import { calculateScenario } from "../src/lib/scenario-calculation";
import { textArtifacts, evidenceNotes } from "../src/lib/slide-quality";
import { candidatePlan } from "../src/lib/candidate-plan";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { demoCandidates } from "../src/lib/demo";
import { design } from "../src/lib/design";
import type { Deck, DeckInput, ChatMessage } from "../src/lib/model";
const input: DeckInput = { topic: "범용 과제", purpose: "선택", slideCount: 6, deckType: "consulting", designSystemId: "ict-forest" };
const analysis = taskAnalysisSchema.parse({ ...pipelineFixture({ text: { format: { schema: { properties: { publicContext: {} } } } } }, input, "비공개", true), fingerprint: "test" });
const record = { analysis, evidence: [], searchStatus: "unavailable" as const, notice: "한계", query: "" };

test("five generic fixtures cover distinct purposes without private markers in public search topics", async () => {
  const fixtures = JSON.parse(await readFile("tests/fixtures/general-decks.json", "utf8"));
  assert.equal(fixtures.length, 5);
  assert.equal(new Set(fixtures.map((f: any) => f.category)).size, 5);
  for (const fixture of fixtures) assert.ok(!/PRIVATE_/.test(fixture.input.publicSearchTopic ?? ""));
});
test("privacy redaction preserves approved public context and removes private markers and quantities", () => {
  const interpreted = { ...analysis, privateConditions: [{ value: "PRIVATE_ORBIT_47", reason: "비공개" }, { value: "370만원 예산", reason: "내부" }], publicContext: [{ dimension: "지역" as const, value: "한국 서울 2026" }] };
  const query = redactPrivateQuery("한국 서울 2026 PRIVATE_ORBIT_47 370만원 공식 통계", interpreted);
  assert.match(query, /한국 서울 2026/); assert.doesNotMatch(query, /PRIVATE_|370/);
});
test("assistant status updates do not invalidate the research gate but new user instructions do", () => {
  const user = { role: "user" as const, text: "선택 기준", createdAt: "test" };
  const assistant: ChatMessage = { role: "assistant", text: "근거 보완 필요", createdAt: "test" };
  assert.equal(taskFingerprint(input, "첨부", [user]), taskFingerprint(input, "첨부", [user, assistant]));
  assert.notEqual(taskFingerprint(input, "첨부", [user]), taskFingerprint(input, "첨부 변경", [user]));
});
test("foreign comparison and unverified quotations cannot satisfy question-specific evidence gates", () => {
  const row = { id: "1", title: "공식 자료", claim: "조건", url: "https://example.com", locator: "본문", checkedAt: "today", kind: "공개 사실" as const, questionIds: ["Q1"], originalVerified: true, contextMatch: "비교 참고" as const };
  assert.equal(researchGaps({ ...record, evidence: [row] }).length, 2);
  assert.equal(researchGaps({ ...record, evidence: [{ ...row, contextMatch: "일치" }] }).length, 2);
  assert.equal(researchGaps({ ...record, evidence: [{ ...row, contextMatch: "일치", originalVerified: false }] }).length, 2);
});
test("original-page reader refuses private networks and only verifies exact normalized quotes", async () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "100.64.0.1", "::1", "::ffff:127.0.0.1"]) assert.equal(isPublicAddress(address), false);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.throws(() => validatePublicUrl("http://localhost/secret"));
  assert.throws(() => validatePublicUrl("https://user:pass@example.com"));
  assert.equal((await readOriginalPage("http://127.0.0.1/secret")).opened, false);
  assert.equal(quoteExists("연구 참여자 120명", "원문 연구 참여자  120명 가운데"), true);
  assert.equal(quoteExists("“연구 참여자 120명”", "원문 연구 참여자 120명 가운데"), true);
  assert.equal(quoteExists("81% vs. 75%", "실험군 81%를 회상했다. 비교군은 75%였다."), false);
  assert.equal(quoteExists("연구 참여자 150명", "원문 연구 참여자 120명"), false);
  assert.equal(plainHtml("<script>bad()</script><p>표본&nbsp;120명</p>"), "표본 120명");
});
test("calculation arithmetic rejects zero divisors and undefined intermediate variables", () => {
  const calculation = { title: "비율", assumptions: [{ name: "n", label: "분자", value: 10, unit: "건", basis: "예시", origin: "가정" as const, evidenceRefs: [] }, { name: "d", label: "분모", value: 0, unit: "건", basis: "예시", origin: "가정" as const, evidenceRefs: [] }], steps: [{ name: "result", label: "비율", operation: "divide" as const, operands: ["n", "d"], unit: "배" }], interpretation: "예시" };
  assert.throws(() => calculateScenario(calculation), /0으로/);
  assert.throws(() => calculateScenario({ ...calculation, steps: [{ ...calculation.steps[0], operands: ["missing", "d"] }] }), /missing.*사용 가능한 이름: n, d/);
});
test("artifact checks allow approved foreign terms and speaker notes only list sources actually used", () => {
  assert.ok(textArtifacts("TBD 데이터 입력 후 산출").length);
  assert.ok(textArtifacts("한국어 結果").length);
  assert.deepEqual(textArtifacts("한국어 東京 연구", { ...analysis, terminology: [{ term: "東京", meaning: "승인 기관명" }] }), []);
  const rows = [1, 2].map(id => ({ id: String(id), claim: "노트에 반복하지 않을 주장", title: `출처${id}`, url: "https://example.com", checkedAt: "today", kind: "공개 사실" as const, locator: "본문" }));
  const notes = evidenceNotes(["1"], rows);
  assert.match(notes, /출처1/); assert.doesNotMatch(notes, /출처2|반복하지/);
});
test("content-first preferred layouts guide distinct candidates within the role", () => {
  const item = { index: 2, section: "판단", message: "대안을 비교한 잠정 선택", contentHint: "", role: "비교" as const, argument: { questionId: "Q1", judgment: "A", support: [{ text: "조건", evidenceRefs: [] }], reversalCondition: "비용 상승", limitation: "가설", transition: "다음", visualIntent: "주장과 근거 통합", preferredLayouts: ["c-argument-board"] } };
  const candidates = candidatePlan(input, item);
  assert.equal(candidates[0], "c-argument-board"); assert.equal(new Set(candidates).size, 3);
});
test("semantic review reports problems while preserving manual edits and exhausted repair budgets", async () => {
  const outline = [{ index: 0, section: "표지", message: "범용 과제", contentHint: "" }];
  const slide = demoCandidates(input, outline[0])[0];
  const deck: Deck = { id: "review", input, designSystem: design(input.designSystemId), research: [], researchRecord: record, outline, candidates: { 0: [slide] }, picked: { 0: 0 }, edited: { 0: slide }, chat: { setup: [], outline: [], slides: {} }, demo: false };
  const before = JSON.stringify(deck);
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (_url, init) => { calls++; assert.equal(JSON.parse(String(init?.body)).model, "same-model"); return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ checklist: [{ id: "count", passed: false, reason: "불완전" }], issues: [{ index: 0, category: "과제 요구", reason: "중간발표 표기 누락", repair: "표기 추가" }], summary: "수정 필요" }) }] }] }); };
  try {
    const result = await reviewAndRepairDeck({ provider: "openai", key: "test-only", model: "same-model" }, deck);
    assert.equal(calls, 1); assert.equal(result.replacements.length, 0); assert.equal(result.review.issues.length, 1);
    assert.equal(JSON.stringify(deck), before);
    const budget = { ...deck, edited: {}, candidates: { 0: [{ ...slide, quality: { warnings: [], attempts: 2, fillRatio: .5 } }] } };
    assert.equal((await reviewAndRepairDeck({ provider: "openai", key: "test-only", model: "same-model" }, budget)).replacements.length, 0);
  } finally { globalThis.fetch = original; }
});

test("coincident positioning labels remain readable without changing their data anchors", () => {
  const placed = placePositionLabels(Array.from({ length: 6 }, () => ({ x: .5, y: .5 })));
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i]; assert.equal(a.anchorX, placed[0].anchorX); assert.equal(a.anchorY, placed[0].anchorY);
    for (const b of placed.slice(i + 1)) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }
});

test("publication dates are retained only when their complete date occurs in the original", () => {
  assert.equal(publicationDateExists("2025-01-22", "발행 2025. 1. 22. 조사 기간 2024년 9월"), true);
  assert.equal(publicationDateExists("2024-01-22", "발행 2025. 1. 22. 조사 기간 2024년 9월"), false);
  assert.equal(publicationDateExists("2024", "조사 기간 2024년 9월"), false);
});

test("positional cover and closing labels are normalized without discarding a valid storyline", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const value = pipelineFixture(body, { ...input, appendSources: true }) as any;
    if (value.outlineDraft) { value.outlineDraft[0].section = "발표 범위"; value.outlineDraft[0].message = "솔루션을 제안합니다."; value.outlineDraft.at(-1).section = "출처 및 범위"; }
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
  };
  try {
    const result = await prepareResearch({ provider: "openai", key: "test-only", model: "same-model" }, { ...input, appendSources: true }, "내부 조건", [], []);
    assert.equal(result.outlineDraft[0].section, "표지"); assert.equal(result.outlineDraft[0].message, input.topic); assert.equal(result.outlineDraft.at(-1)?.section, "출처");
    assert.deepEqual(result.outlineDraft.map(item => item.index), [0, 1, 2, 3, 4, 5]);
  } finally { globalThis.fetch = original; }
});

test("manual edits invalidate old review results while explicit fresh reviews are retained", () => {
  const outline = [{ index: 0, section: "표지", message: "범용 과제", contentHint: "" }];
  const slide = demoCandidates(input, outline[0])[0];
  const review = { checklist: [], issues: [], summary: "이전 검토", rounds: 0, reviewedAt: "test" };
  const deck: Deck = { id: "stale", input, designSystem: design(input.designSystemId), outline, candidates: { 0: [slide] }, picked: { 0: 0 }, edited: {}, research: [], chat: { setup: [], outline: [], slides: {} }, demo: false, review };
  const edited = { ...deck, edited: { 0: { ...slide, headline: "수정된 문장" } } };
  assert.equal(invalidateStaleReview(deck, edited)?.review, undefined);
  assert.strictEqual(invalidateStaleReview(deck, { ...deck, chat: { ...deck.chat, setup: [] } })?.review, review);
  const fresh = { ...review, summary: "새 검토" };
  assert.strictEqual(invalidateStaleReview(deck, { ...edited, review: fresh })?.review, fresh);
});
test("inserting a page updates the active count requirement and clears displaced review indices", () => {
  const outline = Array.from({ length: 6 }, (_, index) => ({ index, section: index ? "본문" : "표지", message: "조건부 판단", contentHint: "" }));
  const deck: Deck = { id: "insert", input, designSystem: design(input.designSystemId), outline, candidates: {}, picked: {}, edited: {}, research: [], researchRecord: record, chat: { setup: [], outline: [], slides: {} }, demo: false, review: { checklist: [], issues: [], summary: "이전", rounds: 0, reviewedAt: "test" } };
  const next = insertDraftPage(deck, 2, { message: "새 근거와 조건", section: "비교", contentHint: "" });
  assert.equal(next.review, undefined); assert.equal(next.researchRecord?.analysis?.slideCount, 7);
  assert.match(next.researchRecord!.analysis!.checklist[0].requirement, /7장/);
  assert.strictEqual(next.researchRecord!.evidence, record.evidence);
});

test("a lingering plan headline is repaired separately without regenerating the whole storyline", async () => {
  const original = globalThis.fetch; let headlineRepairs = 0;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); assert.equal(body.model, "same-model");
    let value: any;
    if (body.text.format.schema.properties.headlines) { headlineRepairs++; value = { headlines: [{ index: 2, text: "[가설] 조건부 대안 A가 초기 검증에 적합합니다." }] }; }
    else { value = pipelineFixture(body, input); if (value.outlineDraft) value.outlineDraft[2].message = "대안을 확인합니다."; }
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
  };
  try {
    const result = await prepareResearch({ provider: "openai", key: "test-only", model: "same-model" }, input, "내부 조건", [], []);
    assert.equal(headlineRepairs, 1); assert.equal(result.outlineDraft.length, 6);
    assert.match(result.outlineDraft[2].message, /조건부 대안 A/);
  } finally { globalThis.fetch = original; }
});

test("percentage quantities must be converted explicitly before multiplying counts or time", () => {
  const assumptions = [{ name: "hours", label: "총 시간", value: 120, unit: "시간", basis: "가정", origin: "가정" as const, evidenceRefs: [] }, { name: "rate", label: "절감률", value: .1, unit: "%", basis: "가정", origin: "가정" as const, evidenceRefs: [] }, { name: "hundred", label: "퍼센트 기준", value: 100, unit: "", basis: "단위 변환", origin: "가정" as const, evidenceRefs: [] }];
  const multiply = { name: "saved", label: "절감", operation: "multiply" as const, operands: ["hours", "rate"], unit: "시간" };
  assert.throws(() => calculateScenario({ title: "절감", assumptions, steps: [multiply], interpretation: "예시" }), /퍼센트 입력/);
  const result = calculateScenario({ title: "절감", assumptions, steps: [{ name: "ratio", label: "비율", operation: "divide", operands: ["rate", "hundred"], unit: "비율" }, { ...multiply, operands: ["hours", "ratio"] }], interpretation: "0.1%의 절감" });
  assert.equal(result.outputs.at(-1)?.value, .12);
});
