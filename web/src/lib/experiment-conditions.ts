import { GENERATION_CONFIG, type GenerationStage, type Effort } from "./generation-config";

export type ExperimentCondition = "A" | "B" | "C";
const stages = Object.keys(GENERATION_CONFIG.stages) as GenerationStage[];
const defaults = Object.fromEntries(stages.map(stage => [stage, GENERATION_CONFIG.stages[stage].effort])) as Record<GenerationStage, Effort>;
export function defaultEfforts() { return { ...defaults }; }
/** 3차 4단계 조건. A: 전 단계 low · B: 판단·스토리라인·덱 검토 medium, 나머지 low · C: 전 단계 medium. keyCheck(연결 확인)는 실험과 무관해 기본값 유지. */
export function conditionEfforts(condition: ExperimentCondition): Record<GenerationStage, Effort> {
  return Object.fromEntries(stages.map(stage => [stage, stage === "keyCheck" ? defaults[stage] : condition === "C" ? "medium" : condition === "B" && ["judgment", "story", "assessDeck"].includes(stage) ? "medium" : "low"])) as Record<GenerationStage, Effort>;
}
export function applyEfforts(efforts: Record<GenerationStage, Effort>) { for (const stage of stages) GENERATION_CONFIG.stages[stage].effort = efforts[stage]; }
