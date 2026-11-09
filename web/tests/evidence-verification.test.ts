import test from "node:test";
import assert from "node:assert/strict";
import { taskAnalysisSchema } from "../src/lib/task-model";
import { taskFingerprint } from "../src/lib/task-analysis";
import { runResearch } from "../src/lib/research-pipeline";
import { verifyAgainstOriginal } from "../src/lib/research-questions";
import { looseQuoteExists, numbersExist, numbersSnippet, quoteExists } from "../src/lib/source-pages";
import { GENERATION_CONFIG } from "../src/lib/generation-config";
import type { DeckInput } from "../src/lib/model";

const c = { provider: "openai" as const, key: "test-only", model: "gpt-6-luna" };
const input: DeckInput = { topic: "근거 확인 합성 과제", purpose: "원문 대조 확인", slideCount: 5, deckType: "consulting", designSystemId: "ict-forest" };
const reply = (value: unknown) => Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }], usage: { input_tokens: 100, output_tokens: 10, total_tokens: 110 } });
const pdfText = "연결 손익계산서\n매출액 1,862,545 1,752,312\n영업이익 114,679 142,396\n(단위: 억원)";
function base() {
  const analysis = taskAnalysisSchema.parse({ questions: ["Q1", "Q2"].map(id => ({ id, question: "공개 근거 선택", publicQuestion: "공개 선택", judgmentForm: "선택", needsPublicEvidence: id === "Q1" })), publicContext: [], privateConditions: [], internalPremises: [], stage: "중간", language: "ko", slideCount: 5, requiredSections: [], checklist: [{ id: "count", requirement: "5장" }], terminology: [], notationRules: [], fingerprint: taskFingerprint(input, "", []) });
  return { analysis, plan: { questions: [{ questionId: "Q1", evidenceNeeded: "연결 매출 영업이익", preferredMaterials: ["기관·기업 공식 안내" as const], localQuery: "연결 매출", englishQuery: "revenue" }] }, evidence: [], searchStatus: "not-requested" as const, query: "", notice: "" };
}

test("원문 대조: 정확 인용 → 구두점 무시 → 수치 동시 출현 순서로 확인하고, 조각 결합·다른 수치는 거부한다", () => {
  assert.equal(looseQuoteExists("매출액: 1,862,545 · 1,752,312", pdfText), true);
  assert.equal(quoteExists("매출액: 1,862,545 · 1,752,312", pdfText), false);
  assert.equal(looseQuoteExists("81% vs. 75%", "실험군 81%를 회상했다. 비교군은 75%였다."), false);
  assert.equal(numbersExist("2025년 매출은 1,862,545억원, 영업이익은 114,679억원", pdfText), true);
  assert.equal(numbersExist("2025년 매출은 1,862,545억원, 영업이익은 999,999억원", pdfText), false, "원문에 없는 수치");
  assert.equal(numbersExist("점유율 39.2%", "39.2%"), false, "수치 1개는 보조 확인 대상이 아님");
  assert.equal(numbersExist("120명 중 81명", "1120명 중 181명"), false, "숫자 일부 일치는 인정하지 않음");
  assert.equal(numbersExist("매출 1,862,545, 영업이익 114,679", "매출 1,862,545 " + "가".repeat(4000) + " 114,679"), false, "서로 먼 구간은 인정하지 않음");
  const v = verifyAgainstOriginal({ claim: "2025년 매출 1,862,545억원, 영업이익 114,679억원", originalText: "2025년 매출은 186조 2,545억원" }, pdfText);
  assert.equal(v.method, "수치"); assert.ok(v.originalText.includes("1862545") && v.originalText.includes("114679"), "인용 칸에는 실제 원문 구간을 둔다");
  assert.equal(verifyAgainstOriginal({ claim: "영업이익 감소", originalText: "" }, pdfText).method, undefined);
  assert.ok((numbersSnippet("매출 1,862,545 영업이익 114,679", pdfText) ?? "").length <= 400);
});

test("검색 요약에만 있던 근거는 인용된 원문을 추가로 열어 확인하고, 원문은 한꺼번에 연다", async () => {
  const native = fetch, opened: string[] = []; let inFlight = 0, maxInFlight = 0;
  const urls = ["https://example.org/a", "https://example.org/b", "https://example.org/c", "https://example.org/report.pdf"];
  globalThis.fetch = async (_, init) => { const b = JSON.parse(String(init?.body)); if (JSON.stringify(b.text).includes('"localQuery"')) return reply({ localQuery: "후속", englishQuery: "follow-up" }); return reply({ rows: [{ claim: "2025년 매출 1,862,545억원, 영업이익 114,679억원", title: "감사보고서", url: urls[3], kind: "공개 사실", locator: "손익계산서", originalText: "매출은 186조원", publishedAt: "", materialType: "기관·기업 공식 안내", contextMatch: "일치", contextReason: "합성", questionIds: ["Q1"] }] }); };
  const readPage = async (url: string) => { opened.push(url); inFlight++; maxInFlight = Math.max(maxInFlight, inFlight); await new Promise(r => setTimeout(r, 20)); inFlight--; return { url, text: url.endsWith(".pdf") ? pdfText : "관련 없는 본문입니다. ".repeat(10), opened: true, checkedAt: "today", format: "html" as const }; };
  try {
    const result = await runResearch(c, input, base(), "", [], [], { search: async () => ({ text: "요약", sources: urls.map(url => ({ title: "자료", url })) }), readPage });
    assert.ok(maxInFlight >= 2, "원문을 순서대로 하나씩 기다리지 않는다");
    assert.ok(opened.includes(urls[3]), "질문당 원문 한도 밖이지만 근거로 인용된 원문을 연다");
    assert.ok(opened.length <= GENERATION_CONFIG.research.originalsPerQuestion + GENERATION_CONFIG.research.citedOriginalsPerQuestion);
    const row = result.researchRecord.evidence.find(e => e.url === urls[3])!;
    assert.equal(row.verificationStatus, "원문 확인"); assert.equal(row.verificationMethod, "수치"); assert.match(row.contextReason ?? "", /수치 대조/);
  } finally { globalThis.fetch = native; }
});
