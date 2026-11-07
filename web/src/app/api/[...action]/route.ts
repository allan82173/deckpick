import { withExecution } from "@/lib/execution-scope";
import { withRunContext,runState } from "@/lib/run-checkpoints";
import { saveAttemptReport } from "@/lib/run-attempt-report";
import { design } from "@/lib/design";
import type { Deck } from "@/lib/model";
import { GENERATION_CONFIG } from "@/lib/generation-config";
import {isDemoOnly} from "@/lib/runtime-mode";
import {isSameOriginRequest} from "@/lib/request-origin";
import {slideConversation} from "@/lib/ai";
import {deckContextSchema} from "@/lib/slide-chat";
import {slideSchema,persistedDeckSchema} from "@/lib/model";
import { attachmentIdsSchema } from "@/lib/attachment-model";
import { readAttachments, readAttachmentImages } from "@/lib/attachments";
import { selectAttachmentContext, selectResearchContext } from "@/lib/attachment-context";
import { z } from "zod";
import { researchRecordSchema } from "@/lib/evidence-model";
import { prepareResearch, prepareTask, runResearch, createStoryline } from "@/lib/research-pipeline";
import { taskFingerprint } from "@/lib/task-analysis";
import { reviewAndRepairDeck } from "@/lib/deck-review";
import {
  AIError,
  connection,
  keyCheck,
  generateCandidates,
} from "@/lib/ai";
import {
  deckInputSchema,
  outlineItemSchema,
  messageSchema,
  sourceSchema,
  layoutIds,
} from "@/lib/model";
export const runtime = "nodejs";
export const maxDuration = 300;
const requestSchema = z.object({
  runId:z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).optional(),
  provider: z.enum(["openai", "anthropic"]).default("openai"),
  model: z.string().optional(),
  attachmentIds: attachmentIdsSchema,
  lowDetailImageIds: attachmentIdsSchema,
  input: deckInputSchema.extend({ slideCount: z.number().int().min(5).max(30) }).optional(),
  messages: z.array(messageSchema).max(40).default([]),
  outline: z.array(outlineItemSchema).max(30).default([]),
  sources: z.array(sourceSchema).max(30).default([]),
  researchRecord: researchRecordSchema.optional(),
  previousLayouts: z.array(z.enum(layoutIds)).max(30).default([]),
  item: outlineItemSchema.optional(),
  instruction: z.string().max(5000).default(""),
  requestedLayout:z.enum(layoutIds).optional(),
  exclude: z.array(z.string()).max(12).default([]),
  rotation: z.number().int().min(0).max(10000).default(0),
  previousSignatures: z.array(z.string().regex(/^[a-f0-9]{8}$/)).max(3).default([]),
  context: z.enum(["setup", "outline", "slide"]).default("setup"),
  webSearch: z.boolean().default(false),
  currentSlide:slideSchema.optional(),
  designSystem:persistedDeckSchema.shape.designSystem.optional(),
  targetIndex:z.number().int().min(0).max(29).optional(),
  deckContext:deckContextSchema.optional(),
  currentDeck: persistedDeckSchema.optional(),
  acceptLimitedEvidence: z.boolean().default(false),
});
async function handlePost(
  request: Request,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    if (isDemoOnly()) return Response.json({error:"공개 데모에서는 AI 호출·파일 첨부를 지원하지 않습니다."},{status:403});
    if (!isSameOriginRequest(request))
      return Response.json(
        { error: "허용되지 않은 요청입니다." },
        { status: 403 },
      );
    const raw = await request.text();
    if (Buffer.byteLength(raw) > GENERATION_CONFIG.reports.maxRequestBytes)
      return Response.json(
        { error: "내용을 조금 줄여 주세요." },
        { status: 413 },
      );
    const b = requestSchema.parse(JSON.parse(raw)),
      c = connection(request, b),
      action = (await params).action.join("/");
    if (action === "key-check") {
      await keyCheck(c);
      return Response.json({ ok: true, model: c.model });
    }
    if (!b.input) throw new AIError("주제와 목적을 입력해 주세요.", 400);
    let evidence;let documents:Awaited<ReturnType<typeof readAttachments>>=[];
    try {
      documents = await readAttachments(b.attachmentIds);
      const query = [b.messages.findLast(message => message.role === "user")?.text, b.item?.message, b.item?.contentHint, b.input.topic, b.input.purpose].filter(Boolean).join(" ");
      evidence = ["chat", "outline", "research/prepare", "research/run", "research/continue", "storyline"].includes(action) ? selectResearchContext(documents, query) : selectAttachmentContext(documents, query);
    }
    catch { throw new AIError("첨부 자료를 읽지 못했습니다. 파일을 다시 첨부해 주세요.", 400); }
    const images = await readAttachmentImages(b.attachmentIds, b.lowDetailImageIds);
    const attachmentUsage = { estimatedTokens: evidence.estimatedTokens, selected: evidence.selected, total: evidence.total, budget: evidence.budget, images: images.length };
    if(action==="slides/chat"){
      if(!b.currentSlide||!b.designSystem||b.targetIndex===undefined)throw new AIError("수정할 장표를 선택해 주세요.",400);
      const result=await slideConversation(c,b.input,b.currentSlide,b.designSystem,b.targetIndex,b.messages,b.deckContext??[],evidence.text,images,b.researchRecord);
      return Response.json({...result,attachmentUsage});
    }
    if (action === "candidates" || action === "candidates/regenerate") {
      if (!b.item) throw new AIError("슬라이드를 선택해 주세요.", 400);
      return Response.json({
        candidates: await generateCandidates(
          c,
          b.input,
          b.item,
          b.sources,
          b.instruction,
          b.exclude,
          action.endsWith("regenerate"),
          b.outline,
          evidence.text,
          b.rotation,
          b.previousSignatures,
          images,
          b.requestedLayout,
          b.researchRecord?.evidence,
          b.previousLayouts,
          { record: b.researchRecord },
        ),
        attachmentUsage,
      });
    }
    if (action === "deck/review") {
      if (!b.currentDeck) throw new AIError("검토할 덱이 필요합니다.", 400);
      return Response.json(await reviewAndRepairDeck(c, b.currentDeck));
    }
    if (["research/prepare", "research/run", "research/continue", "storyline"].includes(action) && b.input.slideCount > 20) throw new AIError("새 구성은 20장 이내로 만들어 주세요.", 400);
    if (action === "research/prepare") {
      const record = await prepareTask(c, b.input, evidence.text, b.messages, images, b.researchRecord,documents);
      return Response.json({ researchRecord: record, sources: [], attachmentUsage });
    }
    if (action === "research/run") {
      if (!b.researchRecord) throw new AIError("과제 해석이 필요합니다.", 400);
      return Response.json({ ...await runResearch(c, b.input, b.researchRecord, evidence.text, b.messages, images), attachmentUsage });
    }
    if (action === "storyline" || action === "research/continue") {
      const record = b.researchRecord;
      if (!record?.analysis || record.analysis.fingerprint !== taskFingerprint(b.input, evidence.text, b.messages)) throw new AIError("입력이나 첨부가 바뀌었습니다. 과제 해석부터 다시 진행해 주세요.", 409);
      if (record.requiresReview && !b.acceptLimitedEvidence) return Response.json({ needsResearchReview: true, reply: record.notice, outlineDraft: [], researchRecord: record, sources: b.sources });
      const approved = { ...record, acceptedLimits: b.acceptLimitedEvidence || record.acceptedLimits, requiresReview: false };
      const result = await createStoryline(c, b.input, b.messages, b.outline, approved, images);
      return Response.json({ ...result, sources: b.sources, needsResearchReview: false, attachmentUsage });
    }
    if (action === "chat" || action === "outline") {
      if (b.input.slideCount > 20) throw new AIError("새 구성은 20장 이내로 만들어 주세요.", 400);
      if (b.context === "slide")
        return Response.json({
          reply: "요청 내용을 반영해 현재 슬라이드의 세 후보를 다시 만듭니다.",
          action: "regenerate_candidates",
        });
      const result = await prepareResearch(c, b.input, evidence.text, b.messages, b.outline, images, {documents});
      return Response.json({ ...result, attachmentUsage });
    }
    return Response.json(
      { error: "요청한 기능을 찾을 수 없습니다." },
      { status: 404 },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof AIError
            ? e.message
            : e instanceof z.ZodError
              ? "입력 내용과 길이를 확인해 주세요."
              : "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
      },
      {
        status:
          e instanceof AIError ? e.status : e instanceof z.ZodError ? 400 : 500,
      },
    );
  }
}

export async function POST(request:Request,context:{params:Promise<{action:string[]}>}){
 if(isDemoOnly()||!isSameOriginRequest(request))return handlePost(request,context);
 const raw:unknown=await request.clone().json().catch(()=>null);const parsed=requestSchema.safeParse(raw);
 const id=parsed.success?parsed.data.runId??crypto.randomUUID():crypto.randomUUID();
 return withRunContext(id,async()=>{
 const {result,execution}=await withExecution(()=>handlePost(request,context));
 const payload=await result.json();
 const state=await runState(!result.ok?"failed":payload.review?.status==="incomplete"?"incomplete":payload.researchRecord?.requiresReview?"awaiting-review":"complete",typeof payload.error==="string"?payload.error:undefined);
 const action=(await context.params).action.join("/");let reportWarning:string|undefined,attemptReportFilename:string|undefined;
 if(parsed.success&&parsed.data.input&&action!=="key-check"){
  const b=parsed.data,input=parsed.data.input,base:Deck=b.currentDeck??{id,input,designSystem:design(input.designSystemId,input.customPrimary),research:b.sources,outline:b.outline,chat:{setup:[],outline:[],slides:{}},candidates:{},picked:{},edited:{},demo:false};
  const snapshot:Deck={...base,execution,generation:state,researchRecord:payload.researchRecord??base.researchRecord??b.researchRecord,outline:payload.outlineDraft??base.outline,research:payload.sources??base.research,review:payload.review??base.review};
  if(payload.candidates&&b.item){snapshot.candidates={...snapshot.candidates,[b.item.index]:payload.candidates};snapshot.picked={...snapshot.picked,[b.item.index]:0};}
  try{attemptReportFilename=await saveAttemptReport(snapshot,action,result.status,payload.error);}catch{reportWarning="실행 리포트를 저장하지 못했습니다. 생성 결과는 화면에서 보관해 주세요.";}
 }
 return Response.json({...payload,generationState:state,executionDelta:execution,attemptReportFilename,...(reportWarning?{reportWarning}:{})},{status:result.status});
 });
}
