export type GenerationStage = "interpretTask" | "judgment" | "story" | "assessDeck" | "planResearch" | "research" | "evidence" | "attachments" | "candidates" | "formatRepair" | "headlineRepair" | "slideChat" | "keyCheck" | "visualReview";
export type Effort = "low" | "medium" | "high";
const high = { effort: "medium" as Effort, maxOutputTokens: 24000 };
const medium = { effort: "medium" as Effort, maxOutputTokens: 16000 };
const low = { effort: "low" as Effort, maxOutputTokens: 10000 };
/** All generation budgets live here. This module is safe to import in the UI. */
export const GENERATION_CONFIG = {
  version: "2026-11-08-stage6-final-c",
  /** Checkpoint compatibility key. Bump only when a saved stage result can no longer be reused (schema or stage meaning changed), not for every budget/version change. */
  checkpointVersion: "2026-11-07-stability-v3-revised",
  stages: {
    interpretTask: { ...high }, judgment: { ...high }, story: { ...high }, assessDeck: { ...high },
    planResearch: { ...medium }, research: { ...medium }, evidence: { ...medium }, attachments: { ...medium },
    // 6단계 확정(2026-11-08, 사용자 결정): 사람 점수가 가장 높은 C(전 단계 medium) 채택. C의 실패 대부분이 스토리라인 시간 제한이라 storyline 제한을 6분으로 늘려 완료 가능성을 높인다. 근거 추출 medium(원문 확인 54/77 vs 41/64).
    candidates: { ...medium },
    formatRepair: { ...low }, headlineRepair: { ...low }, slideChat: { ...low }, keyCheck: { ...low, maxOutputTokens: 32 }, visualReview: { ...medium },
  } satisfies Record<GenerationStage, { effort: Effort; maxOutputTokens: number }>,
  outputLimitLadder: [10000, 16000, 24000, 32000],
  outputLimitRetries: 1, formatAttempts: 3, calculationRepairAttempts: 2, qualityRetries: 2, providerTimeoutMs: 75000,
  /** 한 번의 응답이 큰 단계는 개별 호출 대기 시간을 늘린다. 스토리라인은 75초를 넘기면 같은 큰 호출을 3번 반복하다 504로 실패했다(2026-11-08). 단계 시간 제한(storyline 6분) 안에 들어가도록 둔다. */
  providerTimeoutMsByStage: { story: 240000, judgment: 150000, assessDeck: 150000, interpretTask: 120000, formatRepair: 180000 } as Partial<Record<GenerationStage, number>>,
  transport: { heartbeatMs: 10000 },
  hosting: { stageBudgetMs: 270000 },
  reliability: { networkRetries: 2, backoffMs: 1000, emptyRowsRetries: 1,
    deadlines: { researchQuestion: 240000, storyline: 360000, candidate: 180000, review: 240000 } },
  efficiency:{concurrency:3,evidencePerQuestion:8,factsPerSourceInPrompt:3,excerptCharactersPerPage:5000,adjacentParagraphs:1,paragraphChunkCharacters:900},
  benchmark: { minimumVerifiedClaimRatio: .8, maxDurationMs: 900000, minimumTimeReduction: .40, maxInputRatioToBaseline: 1/3, externalRunRetries: 1 },
  measurement: { encoding:"o200k_base", imageInputFallbackTokens:3000 },
  research: { roundsPerQuestion: 2, partialStopEvidence: 3, followupQueries: 1, originalsPerQuestion: 3, originalsPerDeck: 12, matchingEvidencePerQuestion: 2, toolCallsPerQuery: 1, sourcesPerQuery: 8, queryCharacters: 500, summaryCharactersPerRound: 6000, maxPageBytes: 8 * 1024 * 1024, pageTimeoutMs: 20000, redirectLimit: 3 },
  attachments: { chunkCharacters: 12000, rowsPerChunk: 80, extractVersion: "3", imagesPerExtraction: 4, contextTokens: 2400, researchTokens: 7200 },
  candidates: { maximum: 3 },
  /** 자동 후보에서 빼는 레이아웃(사용자가 직접 고를 때만 사용). 4단계 사람 평가에서 장표 점수가 가장 낮았다: calculation-flow 평균 2.38(16덱 중 11덱이 2점 이하), system-flow 2.14(7덱 중 5덱). */
  // 2026-11-08 사용자 결정: 텍스트 격자형 표(행·열에 문장을 채우는 표)도 자동 후보에서 제외 — comparison-table, validation-plan, cross-matrix, evidence-scope, compare. 출처 장의 evidence-table은 유지.
  layouts: { autoExcludedKinds: ["calculation-flow", "system-flow", "comparison-table", "validation-plan", "cross-matrix", "evidence-scope", "compare"] as string[] },
  /** Deck review: start another repair round only if this much of the review budget remains (repairs run in parallel, then one re-assessment). */
  review: { roundReserveMs: 120000, repairConcurrency: 3 },
  visual: { enabled: true, width: 1280, minFontPt: 10, overlapAreaFraction: .15, toleranceInches: .025, bodyTop: 1.7, bodyBottom: 6.3, emptyBottomFraction: .30, defaultMinimumFill: .18,
    minimumFill: { "comparison-table": .20, calendar: .16, quadrants: .17, "contract-bars": .14, "formula-cards": .22, "evidence-table": .17, journey: .17, "cause-chain": .18, "system-flow": .17, swimlane: .16 } as Record<string,number> },
  rendererRepair: {layouts:["c-argument-board","c-metrics-panel","c-comparison-table"] as string[],top:1.95,bottom:6.85,padding:.10,gap:.08,safety:.035,bodyPt:12,minBodyPt:11,denseBodyPt:10,denseGap:.04,metricValuePt:18,minMetricValuePt:14},
  reports: { topicCharacters: 36, maxRequestBytes: 4 * 1024 * 1024 },
};
export function stageSettings(stage: GenerationStage) { return { ...GENERATION_CONFIG.stages[stage] }; }
export function nextOutputLimit(current: number) { return GENERATION_CONFIG.outputLimitLadder.find(limit => limit > current) ?? current; }
