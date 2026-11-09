import { z } from "zod";
import { taskAnalysisSchema, researchPlanSchema, decisionSchema, materialTypes } from "./task-model";
import {contextMatchValues,contextCheckSchema} from "./context-match";
import { rejectedRowSchema } from "./run-state";

export const slideRoles = ["사실 제시", "비교", "흐름", "우선순위", "계산", "일정", "합의 사항", "판단", "근거", "마무리"] as const;
export const evidenceSchema = z.object({
  id: z.string().regex(/^\d+$/),
  claim: z.string().min(1).max(1600),
  title: z.string().min(1).max(240),
  url: z.union([z.literal(""), z.url().refine(value => /^https?:\/\//.test(value))]).default(""),
  checkedAt: z.string(),
  kind: z.enum(["공개 사실", "내부 전제", "추론", "미검증 가설"]),
  locator: z.string().max(500).default(""),
  originalText: z.string().max(1600).optional(),
  publishedAt: z.string().max(100).optional(),
  materialType: z.enum(materialTypes).optional(),
  contextMatch: z.enum(contextMatchValues).optional(),
  contextChecks:z.array(contextCheckSchema).optional(),
  // Stored explanations may include verification annotations after classification.
  // Keep historical/cached explanations readable without rejecting the entire record.
  contextReason: z.string().optional(),
  questionIds: z.array(z.string()).max(4).optional(),
  originalVerified: z.boolean().optional(),
  verificationStatus:z.enum(["원문 확인","원문 미확인"]).optional(),
  /** 원문 확인 방식: 인용(연속 문구 일치), 수치(인용 불일치 시 수치 동시 출현으로 확인). */
  verificationMethod:z.enum(["인용","수치"]).optional(),
  attachmentType: z.enum(["내부 전제", "일정", "조건", "목표", "제약", "기타"]).optional(),
  aliasIds:z.array(z.string()).optional(),
  primaryQuestionIds:z.array(z.string()).optional(),
  relatedFacts:z.array(z.object({claim:z.string(),originalText:z.string().optional(),originalVerified:z.boolean().optional(),verificationStatus:z.enum(["원문 확인","원문 미확인"]).optional(),contextMatch:z.enum(contextMatchValues).optional(),contextReason:z.string().optional(),questionIds:z.array(z.string()).optional(),locator:z.string().optional(),publishedAt:z.string().optional()})).optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export const researchRecordSchema = z.object({
  evidence: z.array(evidenceSchema),
  attachmentFingerprint: z.string().optional(),
  confirmedDecisions: z.array(z.object({ id:z.string(), text:z.string(), locator:z.string(), confirmedAt:z.string() })).optional(),
  searchRounds: z.array(z.object({questionId:z.string(),round:z.number(),queries:z.array(z.string()),matchedEvidence:z.number()})).optional(),
  evidenceWarnings: z.array(z.object({questionId:z.string(),url:z.string(),reason:z.string()})).optional(),
  rejectedRows:z.array(rejectedRowSchema).optional(),
  evidenceCounts:z.object({raw:z.number(),unique:z.number(),publicRaw:z.number(),publicUnique:z.number()}).optional(),
  researchComplete: z.boolean().optional(),
  requestContext:z.string().regex(/^[a-f0-9]{64}$/).optional(),
  searchStatus: z.enum(["searched", "unavailable", "not-requested"]),
  notice: z.string(),
  query: z.string(),
  analysis: taskAnalysisSchema.optional(),
  plan: researchPlanSchema.optional(),
  decisions: z.array(decisionSchema).optional(),
  gaps: z.array(z.object({ questionId: z.string(), question: z.string(), missing: z.string() })).optional(),
  coverage: z.array(z.object({questionId:z.string(),question:z.string(),status:z.enum(["exact","substituted","insufficient"]),exactSources:z.number(),partialSources:z.number(),evidenceRefs:z.array(z.string()),description:z.string()})).optional(),
  requiresReview: z.boolean().optional(),
  acceptedLimits: z.boolean().optional(),
  queries: z.array(z.string()).optional(),
  originalPages: z.array(z.object({ url: z.string(), opened: z.boolean(), checkedAt: z.string(), error: z.string().optional(), format:z.enum(["html","text","pdf"]).optional(), questionIds:z.array(z.string()).optional(),originalCharacters:z.number().optional(),excerptCharacters:z.number().optional() })).optional(),
});
export type ResearchRecord = z.infer<typeof researchRecordSchema>;
export const slideQualitySchema = z.object({
  warnings: z.array(z.string()),
  attempts: z.number().int().min(0).max(2),
  fillRatio: z.number().min(0).max(1),
  visual: z.object({status:z.enum(["passed","issues","failed","disabled"]),warnings:z.array(z.string())}).optional(),
  rendererWarnings:z.array(z.string()).optional(),
});
