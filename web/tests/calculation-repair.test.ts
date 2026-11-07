import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCalculation, calculationError, repairStoryCalculations } from "../src/lib/calculation-repair";
import { calculateScenario } from "../src/lib/scenario-calculation";
import { createStoryline } from "../src/lib/storyline";
import { taskAnalysisSchema, type Calculation } from "../src/lib/task-model";
import type { DeckInput } from "../src/lib/model";
import type { ResearchRecord } from "../src/lib/evidence-model";
import { pipelineFixture } from "./pipeline-fixture";
import { randomUUID } from "node:crypto";
import { withRunContext, checkpoint } from "../src/lib/run-checkpoints";
import { GENERATION_CONFIG } from "../src/lib/generation-config";

const ids = new Set(["1"]);
const base: Calculation = { title: "월 이용 규모", interpretation: "가정 기반 예시",
  assumptions: [
    { name: "households", label: "대상 가구 수", value: 1000, unit: "가구", basis: "예시", evidenceRefs: ["1"], origin: "근거" },
    { name: "rate", label: "이용률", value: 10, unit: "%", basis: "가정", evidenceRefs: [], origin: "가정" },
  ],
  steps: [
    { name: "rateRatio", label: "이용 비율", operation: "divide", operands: ["rate", "100"], unit: "비율" },
    { name: "users", label: "이용 가구", operation: "multiply", operands: ["대상 가구 수", "rateRatio"], unit: "가구" },
  ] };
const item = (calculation: Calculation | null) => ({ role: "계산", claimType: "계산", calculation, argument: { limitation: "실적 미확인" } });

test("labels and numeric literals in operands are normalized without changing the arithmetic", () => {
  assert.throws(() => calculateScenario(base));
  const { calculation, fixes } = normalizeCalculation(base, ids);
  assert.equal(calculationError(calculation, ids), undefined);
  assert.equal(calculateScenario(calculation).outputs.at(-1)!.value, 100);
  assert.ok(calculation.assumptions.some(a => a.name === "c_100" && a.origin === "가정" && a.value === 100));
  assert.equal(fixes.length, 2);
});

test("evidence variables without a real ID are lowered to assumptions, not dropped", () => {
  const broken = { ...base, assumptions: base.assumptions.map(a => a.name === "households" ? { ...a, evidenceRefs: ["999"] } : a) };
  const { calculation } = normalizeCalculation(broken, ids);
  const households = calculation.assumptions.find(a => a.name === "households")!;
  assert.equal(households.origin, "가정"); assert.deepEqual(households.evidenceRefs, []); assert.equal(households.value, 1000);
});

test("an unknown name triggers one per-slide repair and then removal with a lowered claim, never a guessed value", async () => {
  const unknown = { ...base, steps: [{ ...base.steps[0], operands: ["rate", "missingDenominator"] }] };
  let repairs = 0;
  const failed = await repairStoryCalculations([item(null), item(unknown)], ids, async () => { repairs++; throw Error("repair failed"); });
  assert.equal(repairs, 1);
  assert.equal(failed.items[1].calculation, null); assert.equal(failed.items[1].claimType, "추론"); assert.equal(failed.items[1].role, "판단");
  assert.match(failed.items[1].argument.limitation, /산식을 제외/);
  assert.deepEqual(failed.issues.map(i => [i.index, i.status]), [[1, "removed"]]);
  const fixed = await repairStoryCalculations([item(unknown)], ids, async () => base);
  assert.equal(fixed.issues[0].status, "repaired"); assert.equal(calculateScenario(fixed.items[0].calculation!).outputs.at(-1)!.value, 100);
});

test("a broken calculation no longer regenerates the whole storyline", async () => {
  const input: DeckInput = { topic: "계산 격리 합성 과제", purpose: "계산 오류 처리", slideCount: 5, deckType: "consulting", designSystemId: "ict-forest" };
  const analysis = taskAnalysisSchema.parse({ questions: ["Q1", "Q2"].map(id => ({ id, question: "공개 근거 선택", publicQuestion: "공개 선택", judgmentForm: "선택", needsPublicEvidence: id === "Q1" })), publicContext: [], privateConditions: [], internalPremises: [], stage: "중간", language: "ko", slideCount: 5, requiredSections: [], checklist: [{ id: "count", requirement: "5장" }], terminology: [], notationRules: [], fingerprint: "f" });
  const evidence = [{ id: "1", claim: "원문 숫자 42", title: "공식 자료", url: "https://example.org/official", kind: "공개 사실", locator: "본문", originalText: "원문 숫자 42", publishedAt: "", materialType: "기관·기업 공식 안내", contextMatch: "일치", contextReason: "일치", questionIds: ["Q1"], verificationStatus: "원문 확인" }];
  const record = { analysis, evidence, gaps: [], acceptedLimits: true, requiresReview: false } as unknown as ResearchRecord;
  const unknown = { ...base, steps: [{ ...base.steps[0], operands: ["rate", "missingDenominator"] }] };
  const native = fetch; let storyCalls = 0, repairCalls = 0;
  globalThis.fetch = async (_, init) => {
    const body = JSON.parse(String(init?.body)), properties = body.text.format.schema.properties;
    let value: unknown;
    if (properties.outlineDraft) { storyCalls++; const story = pipelineFixture(body, input) as { outlineDraft: Record<string, unknown>[] }; story.outlineDraft[2] = { ...story.outlineDraft[2], role: "계산", claimType: "계산", calculation: unknown }; story.outlineDraft[3] = { ...story.outlineDraft[3], calculation: base }; value = story; }
    else if (properties.calculation) { repairCalls++; value = { calculation: base }; }
    else value = pipelineFixture(body, input);
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } });
  };
  try {
    const story = await createStoryline({ provider: "openai", key: "test-only", model: "gpt-6-luna" }, input, [], [], record);
    assert.equal(storyCalls, 1); assert.equal(repairCalls, 1);
    assert.deepEqual(story.calculationIssues.map(i => [i.index, i.status]), [[2, "repaired"], [3, "normalized"]]);
    for (const slide of story.outlineDraft) if (slide.calculation) assert.equal(calculationError(slide.calculation, ids), undefined);
  } finally { globalThis.fetch = native; }
});

test("a budget/version bump keeps earlier checkpoints reusable for resume", async () => {
  const id = randomUUID(), original = GENERATION_CONFIG.version; let calls = 0;
  try {
    await withRunContext(id, () => checkpoint("judgment", { q: 1 }, async () => ++calls));
    GENERATION_CONFIG.version = original + "-bumped";
    await withRunContext(id, () => checkpoint("judgment", { q: 1 }, async () => ++calls));
    assert.equal(calls, 1);
  } finally { GENERATION_CONFIG.version = original; }
});
