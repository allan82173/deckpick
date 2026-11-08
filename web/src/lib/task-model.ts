import { z } from "zod";

const phrase = z.string().min(1).max(500);
export const questionSchema = z.object({
  id: z.string().regex(/^Q[1-4]$/),
  question: phrase,
  publicQuestion: phrase,
  judgmentForm: z.enum(["우선순위", "선택", "규모 추정", "원인 진단", "설명", "실행 제안"]),
  needsPublicEvidence: z.boolean(),
});
export const taskAnalysisSchema = z.object({
  questions: z.array(questionSchema).min(2).max(4),
  publicContext: z.array(z.object({ dimension: z.enum(["지역", "시장", "기관", "기간", "대상", "기타"]), value: phrase })).max(16),
  privateConditions: z.array(z.object({ value: phrase, reason: phrase })).max(30),
  internalPremises: z.array(phrase).max(30),
  stage: phrase,
  language: z.string().min(2).max(20),
  slideCount: z.number().int().min(5).max(30),
  requiredSections: z.array(z.string().min(1).max(80)).max(16),
  checklist: z.array(z.object({ id: z.string(), requirement: phrase })).min(1).max(20),
  terminology: z.array(z.object({ term: phrase, meaning: phrase })).max(20),
  notationRules: z.array(phrase).max(12),
  fingerprint: z.string(),
});
export type TaskAnalysis = z.infer<typeof taskAnalysisSchema>;
export const materialTypes = ["공식 통계·공공기관", "기관·기업 공식 안내", "원 연구", "신뢰 보도", "업계 리포트", "블로그·커뮤니티", "내부 자료", "도출한 판단", "미확인"] as const;
export const researchPlanSchema = z.object({
  questions: z.array(z.object({
    questionId: z.string(), evidenceNeeded: phrase, preferredMaterials: z.array(z.enum(materialTypes)).min(1).max(4),
    localQuery: phrase, englishQuery: phrase,
    // 한 가지 회사·지표만 겨냥한 짧은 검색어. 긴 키워드 나열 검색어는 검색 결과가 흐려진다.
    // 저장된 이전 조사 계획과 호환되도록 선택 항목으로 두고, 모델 응답 스키마에서는 필수로 요구한다.
    focusQueries: z.array(z.string().min(2).max(60)).max(2).optional(),
  })).min(1).max(4),
});
export type ResearchPlan = z.infer<typeof researchPlanSchema>;
export const researchPlanWire = z.object({
  questions: z.array(researchPlanSchema.shape.questions.element.extend({ focusQueries: z.array(z.string().min(2).max(60)).max(2) })).min(1).max(4),
});
export const decisionSchema = z.object({
  questionId: z.string(),
  candidates: z.array(z.object({ name: phrase, rationale: phrase, evidenceRefs: z.array(z.string()) })).min(2).max(8),
  criteria: z.array(phrase).min(2).max(5),
  selected: phrase,
  judgment: phrase,
  strength: z.enum(["공개 사실", "내부 전제", "추론", "가설"]),
  evidenceRefs: z.array(z.string()),
  reversalConditions: z.array(phrase).min(1).max(4),
  limitations: z.array(phrase).max(5),
});
export type TaskDecision = z.infer<typeof decisionSchema>;
export const argumentSchema = z.object({
  questionId: z.string(),
  judgment: phrase,
  support: z.array(z.object({ text: phrase, evidenceRefs: z.array(z.string()) })).min(1).max(5),
  reversalCondition: phrase,
  limitation: z.string().max(500),
  transition: z.string().max(300),
  visualIntent: phrase,
  preferredLayouts: z.array(z.string()).max(3),
});
export const calculationSchema = z.object({
  title: phrase,
  assumptions: z.array(z.object({ name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/), label: phrase, value: z.number().finite(), unit: z.string().max(60), basis: phrase, evidenceRefs: z.array(z.string()), origin: z.enum(["근거", "가정"]) })).min(2).max(8),
  steps: z.array(z.object({ name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/), label: phrase, operation: z.enum(["add", "subtract", "multiply", "divide"]), operands: z.array(z.string()).min(2).max(4), unit: z.string().max(60) })).min(1).max(5),
  interpretation: phrase,
});
export type Calculation = z.infer<typeof calculationSchema>;
export const reviewSchema = z.object({
  status:z.enum(["complete","incomplete"]).optional(),
  checklist: z.array(z.object({ id: z.string(), passed: z.boolean(), reason: phrase })),
  issues: z.array(z.object({ index: z.number().int().min(0).max(29), category: z.enum(["과제 요구", "판단", "근거 과장", "맥락 불일치", "빈 양식", "문자·표기", "구성", "용어 정합성"]), reason: phrase, repair: phrase })).max(80),
  summary: phrase,
  rounds: z.number().int().min(0).max(2),
  reviewedAt: z.string(),
});
export type DeckReview = z.infer<typeof reviewSchema>;
