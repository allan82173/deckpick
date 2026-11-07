import { pipelineFixture } from "./pipeline-fixture";
import { calculateScenario, applyCalculation } from "../src/lib/scenario-calculation";
import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { prepareResearch, safePublicQuery } from "../src/lib/research-pipeline";
import { generateCandidates, structured } from "../src/lib/ai";
import { z } from "zod";
import { sampleData, demoOutline } from "../src/lib/demo";
import { analyticalIds } from "../src/lib/analytical-layouts";
import { deckInputSchema, persistedDeckSchema, type Deck, type DeckInput, type LayoutId, type OutlineItem } from "../src/lib/model";
import { evidenceNotes, inspectSlide, isPlanHeadline, roleLayouts, deckCountWarning } from "../src/lib/slide-quality";
import { selectResearchContext } from "../src/lib/attachment-context";
import { makeScene } from "../src/lib/scene";
import { forest } from "../src/lib/design";
import { exportDeck } from "../src/lib/export";

const input: DeckInput = { topic: "MGRV 비공개 5실 200만원", purpose: "마케팅 전략", slideCount: 16, deckType: "marketing", designSystemId: "ict-forest" };
const evidence = [{ id: "1", claim: "내부 전제로 5실을 검토합니다.", title: "내부 자료", url: "", checkedAt: "2026-11-05", kind: "내부 전제" as const, locator: "5쪽" }];
const c = { provider: "openai" as const, key: "test-only", model: "same-selected-model" };
const response = (value: unknown) => Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });

test("public queries discard customer names, numbers and private conditions unless a public topic is explicitly supplied", () => {
  const query = safePublicQuery("MGRV BIT 5실 200만원 2026-11-10 외국인 단기임대 기숙사");
  assert.equal(/MGRV|BIT|5|200|2026/.test(query), false);
  assert.equal(query, "");
  assert.equal(safePublicQuery("anything", "연세대학교 기숙사 공개 일정"), "연세대학교 기숙사 공개 일정");
});

test("research retrieval balances project goals with tail product conditions and stays bounded", () => {
  const result = selectResearchContext([{ id: "private", name: "자료.md", chunks: [
    { location: "1행", text: "타깃 채널 마케팅 전략 산출물 목표".repeat(30) },
    { location: "2행", text: "상품 조건 가격 200만원 보증금 없음 5실 계약 기간 28~186박" },
    { location: "3행", text: "공실 운영 일정 신청 입주 퇴실 1년 전대차" },
  ] }], "타깃 채널 마케팅 전략");
  assert.ok(result.text.includes("200만원"));
  assert.ok(result.text.includes("전대차"));
  assert.ok(result.estimatedTokens <= 7200);
});

test("OpenAI schema normalization preserves local URL validation", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.ok(!JSON.stringify(body.text.format.schema).includes('"format":"uri"'));
    return response({ url: calls === 1 ? "invalid-url" : "https://www.yskli.com/" });
  };
  try {
    const result = await structured(c, z.object({ url: z.url() }), "검증", "URL 반환");
    assert.equal(result.url, "https://www.yskli.com/"); assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test("generic scenarios compute labeled assumptions without industry-specific inference", () => {
  const calculation = { title: "시간 절감 예시", assumptions: [
    { name: "count", label: "월 처리 건수", value: 600, unit: "건", basis: "가정", evidenceRefs: [], origin: "가정" as const },
    { name: "minutes", label: "건당 절감", value: 3, unit: "분/건", basis: "검증 전 가정", evidenceRefs: [], origin: "가정" as const },
  ], steps: [{ name: "total", label: "총 절감", operation: "multiply" as const, operands: ["count", "minutes"], unit: "분" }], interpretation: "실적이 아닌 가정 기반 예시" };
  assert.equal(calculateScenario(calculation).outputs[0].value, 1800);
  const slide = { layoutId: "m-formula-cards" as const, section: "계산", headline: "가정에 따른 절감 규모", sources: [], data: {} };
  assert.ok(JSON.stringify(applyCalculation(slide, calculation).data).includes("1,800"));
  assert.throws(() => calculateScenario({ ...calculation, steps: [{ ...calculation.steps[0], operands: ["unknown", "minutes"] }] }));
});

test("unavailable search pauses generation and requires explicit acceptance of evidence limits", async () => {
  const original = globalThis.fetch;
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); calls.push(body);
    assert.equal(body.model, c.model);
    if (body.tools) {
      assert.ok(!body.input.includes("5실")); assert.ok(!body.input.includes("200만원"));
      return Response.json({ error: { code: "unsupported_tool" } }, { status: 400 });
    }
    return response(pipelineFixture(body, input, evidence[0].claim, true));
  };
  try {
    const paused = await prepareResearch(c, input, "첨부 5실 200만원", [], []);
    assert.equal(paused.needsResearchReview, true);
    assert.equal(paused.outlineDraft.length, 0);
    assert.equal(paused.researchRecord.gaps?.length, 2);
    assert.ok(paused.researchRecord.notice.includes("웹 검색 없이 첨부 자료만으로 작성됨"));
    const accepted = await prepareResearch(c, input, "첨부 5실 200만원", [], [], [], { allowLimitedEvidence: true });
    assert.equal(accepted.outlineDraft.length, 16);
    assert.equal(accepted.researchRecord.acceptedLimits, true);
  } finally { globalThis.fetch = original; }
});

test("quality checks identify plans, missing evidence, todo-only content, repetition and count drift", () => {
  const item: OutlineItem = { index: 2, section: "현황", message: "수요를 확인합니다.", contentHint: "", role: "사실 제시", evidenceRefs: [] };
  const slide = { layoutId: "m-feature-cards" as const, section: "현황", headline: item.message, data: { features: Array.from({ length: 3 }, () => ({ icon: "1", title: "조건을 확인합니다", desc: "수요를 확인합니다" })) }, sources: [] };
  const result = inspectSlide(slide, item, input, [], [slide.layoutId, slide.layoutId]);
  assert.ok(isPlanHeadline(slide.headline));
  assert.ok(result.warnings.some(w => w.includes("근거표")));
  assert.ok(result.warnings.some(w => w.includes("할 일")));
  assert.ok(result.warnings.some(w => w.includes("연속 3장")));
  assert.ok(result.warnings.some(w => w.includes("채움")));
  assert.equal(deckCountWarning(16, 10).length, 1);
  assert.equal(deckInputSchema.safeParse({ ...input, slideCount: 20 }).success, true);
  assert.equal(deckInputSchema.safeParse({ ...input, slideCount: 21 }).success, false);
});

test("failed slides get at most two quality repairs and retain warnings, evidence and notes", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); assert.equal(body.model, c.model);
    if(body.text?.format?.schema?.properties?.warnings)return response({warnings:[]});
    calls++;
    const prompt = JSON.parse(body.input);
    assert.deepEqual(body.text.format.schema.properties.slides.items.properties.layoutId.enum, [...new Set(prompt.slotPlan.map((slot: { layoutId: string }) => slot.layoutId))]);
    return response({ slides: prompt.slotPlan.map((slot: { layoutId: LayoutId }) => ({ layoutId: slot.layoutId, section: "흐름", headline: "조건을 확인합니다.", dataJson: JSON.stringify(sampleData(slot.layoutId, item)), sourceUrls: [], notes: "검증 기록" })) });
  };
  const item: OutlineItem = { index: 2, section: "흐름", message: "조건에 따라 경로가 달라집니다.", contentHint: "", role: "흐름", evidenceRefs: ["1"] };
  try {
    const [slide] = await generateCandidates(c, input, item, [], "", [], true, [item], "", 0, [], [], undefined, evidence);
    assert.equal(calls, 3);
    assert.equal(slide.quality?.attempts, 2);
    assert.ok(slide.quality?.warnings.some(w => w.includes("계획형")));
    assert.deepEqual(slide.evidenceRefs, ["1"]);
    assert.ok(slide.notes?.includes("확인일 2026-11-05"));
  } finally { globalThis.fetch = original; }
});

test("all new analytical layouts render in bounds and export native editable text, shapes and evidence notes", async () => {
  const outline = analyticalIds.map((_, index) => ({ index, section: "본문", message: "근거와 판단 범위를 구분합니다.", contentHint: "" }));
  const candidates = Object.fromEntries(analyticalIds.map((layoutId, index) => [index, [{ layoutId, section: "본문", headline: outline[index].message, data: sampleData(layoutId, outline[index]), sources: [], evidenceRefs: ["1"], internalReview: true, notes: evidenceNotes(["1"], evidence) }]]));
  const deck: Deck = { id: "qa", input: { ...input, slideCount: 12 }, designSystem: forest, outline, candidates, picked: Object.fromEntries(outline.map((_, i) => [i, 0])), edited: {}, chat: { setup: [], outline: [], slides: {} }, research: [], demo: true };
  assert.equal(persistedDeckSchema.safeParse(deck).success, true);
  for (const [index, slides] of Object.entries(candidates)) {
    const scene = makeScene(slides[0], forest, Number(index) + 1);
    assert.deepEqual(scene.warnings, [], slides[0].layoutId);
    for (const node of scene.nodes) assert.ok(node.x >= 0 && node.y >= 0 && node.x + node.w <= 13.344 && node.y + node.h <= 7.51);
    assert.ok(scene.nodes.some(n => n.kind === "text" && n.text === "[1]"));
  }
  for (const type of ["consulting", "marketing"] as const) for (const role of ["비교", "일정", "계산", "우선순위"] as const) assert.ok(roleLayouts(type, role).length >= 3);
  const zip = await JSZip.loadAsync(await (await exportDeck(deck, false)).write({ outputType: "nodebuffer" }) as Buffer);
  assert.ok((await zip.file("ppt/slides/slide1.xml")!.async("string")).includes("<p:sp>"));
  assert.ok((await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string")).includes("2026-11-05"));
});
