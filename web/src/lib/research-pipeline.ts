import { runQuestionResearch } from "./research-questions";
import { GENERATION_CONFIG } from "./generation-config";
import { extractAttachmentEvidence, confirmedUserDecisions } from "./attachment-evidence";
import type { AttachmentDocument } from "./attachment-context";
import { AIError, research, type connection } from "./ai";
import type { ChatMessage, DeckInput, OutlineItem } from "./model";
import type { ResearchRecord } from "./evidence-model";
import { interpretTask, planResearch, redactPrivateQuery, taskFingerprint } from "./task-analysis";
import { readOriginalPage } from "./source-pages";
import type { VisionImage } from "./vision";
import { createStoryline } from "./storyline";
import { checkpoint } from "./run-checkpoints";
import { verifiedQuestionEvidence } from "./evidence-selection";
export { createStoryline } from "./storyline";

type Connection = ReturnType<typeof connection>;
export function safePublicQuery(generated: string, explicit?: string, analysis?: ResearchRecord["analysis"]): string {
  return analysis ? redactPrivateQuery(explicit || generated, analysis) : explicit?.trim() ?? "";
}
export function researchGaps(record: ResearchRecord) {
  return (record.analysis?.questions ?? []).filter(question => question.needsPublicEvidence).flatMap(question => {
    const matched = record.evidence.filter(row => row.kind === "공개 사실" && verifiedQuestionEvidence(row,question.id)).length >= GENERATION_CONFIG.research.matchingEvidencePerQuestion;
    return matched ? [] : [{ questionId: question.id, question: question.question, missing: "과제 맥락과 일치하고 원문 문구가 대조된 공개 근거가 부족합니다." }];
  });
}
export async function prepareTask(c: Connection, input: DeckInput, attachment: string, messages: ChatMessage[], images: VisionImage[] = [], previous?: ResearchRecord, documents:AttachmentDocument[] = []) {
  const material=await extractAttachmentEvidence(c,attachment,documents,previous,images);
  const confirmedDecisions=confirmedUserDecisions(messages,previous?.confirmedDecisions);
  const analysis = await checkpoint("task-analysis",{model:c.model,input,fingerprint:material.fingerprint,messages},()=>interpretTask(c, input, attachment, messages, images, material.fingerprint===previous?.attachmentFingerprint?previous?.analysis:undefined,material.evidence,confirmedDecisions));
  const plan = await checkpoint("research-plan",{model:c.model,analysis,previousQueries:previous?.queries,gaps:previous?.gaps},()=>planResearch(c, analysis, previous));
  return { evidence: material.evidence,rejectedRows:material.rejectedRows, attachmentFingerprint:material.fingerprint,confirmedDecisions,searchStatus: "not-requested" as const, notice: "첨부 근거표·과제 해석·질문별 조사 계획을 준비했습니다.", query: "", analysis, plan, gaps: [], requiresReview: false, acceptedLimits: false, queries: [] } satisfies ResearchRecord;
}
export async function runResearch(c: Connection, input: DeckInput, record: ResearchRecord, attachment: string, messages: ChatMessage[], images: VisionImage[] = [], services:{search?:typeof research;readPage?:typeof readOriginalPage}={}) {
  const analysis = record.analysis;
  if (!analysis || !record.plan) throw new AIError("과제 해석과 조사 계획을 먼저 준비해 주세요.", 400);
  if (analysis.fingerprint !== taskFingerprint(input, attachment, messages)) throw new AIError("입력이나 첨부가 바뀌었습니다. 과제 해석부터 다시 진행해 주세요.", 409);
  return runQuestionResearch(c,input,record,services);
}

export async function prepareResearch(c: Connection, input: DeckInput, attachment: string, messages: ChatMessage[], existing: OutlineItem[], images: VisionImage[] = [], options: { allowLimitedEvidence?: boolean; record?: ResearchRecord; documents?:AttachmentDocument[] } = {}) {
  const prepared = await prepareTask(c, input, attachment, messages, images, options.record,options.documents);
  const result = await runResearch(c, input, prepared, attachment, messages, images);
  if (result.researchRecord.requiresReview && !options.allowLimitedEvidence) return { ...result, reply: result.researchRecord.notice, outlineDraft: [], needsResearchReview: true };
  const record = { ...result.researchRecord, acceptedLimits: !!options.allowLimitedEvidence, requiresReview: false };
  const storyline = await createStoryline(c, input, messages, existing, record, images);
  return { ...storyline, sources: result.sources, researchRecord: storyline.researchRecord, needsResearchReview: false };
}
