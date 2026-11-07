import {canvasHeadline,canvasTextChanges} from "./canvas-edits";
import {z} from "zod";
import {MAX_DECK_SLIDES,type Deck,type OutlineItem} from "./model";
import {draftSlide} from "./draft-workflow";
import {attachmentsSchema,attachmentOptions,type Attachment} from "./attachment-model";
export const insertPageSchema=z.object({message:z.string().trim().min(1).max(120),section:z.string().trim().max(8).default(""),contentHint:z.string().trim().max(1200).default(""),attachments:attachmentsSchema.optional()});
export type InsertPageInput=z.infer<typeof insertPageSchema>;
function shift<T>(records:Record<number,T>,at:number):Record<number,T>{return Object.fromEntries(Object.entries(records).map(([key,value])=>[Number(key)>=at?Number(key)+1:Number(key),value]));}
export function insertDraftPage(deck:Deck,at:number,raw:InsertPageInput):Deck{
  const input=insertPageSchema.safeParse(raw);
  if(!input.success)throw Error("키메시지를 1~120자로 입력하고, 섹션은 8자·추가 내용은 1,200자 이내로 적어 주세요.");
  if(!Number.isInteger(at)||at<1||at>deck.outline.length)throw Error("표지 다음부터 마지막 장 뒤까지 추가할 수 있습니다.");
  if(deck.outline.length>=MAX_DECK_SLIDES)throw Error(`페이지는 최대 ${MAX_DECK_SLIDES}장까지 넣을 수 있습니다.`);
  const item:OutlineItem={index:at,section:input.data.section||"추가",message:input.data.message,contentHint:input.data.contentHint||"키메시지를 뒷받침하는 근거와 앞뒤 장의 연결을 정리합니다. 미확인 실적을 만들지 않으며 필요하면 가정·산식이 있는 계산 예시와 잠정 판단을 구분합니다.",...(input.data.attachments?.length?{attachments:input.data.attachments}:{})};
  const outline=[...deck.outline.slice(0,at),item,...deck.outline.slice(at)].map((o,index)=>({...o,index}));
  const researchRecord = deck.researchRecord?.analysis ? { ...deck.researchRecord, analysis: { ...deck.researchRecord.analysis, slideCount: outline.length, checklist: deck.researchRecord.analysis.checklist.map(check => ({ ...check, requirement: check.requirement.replace(new RegExp(`(?<![0-9])${deck.outline.length}(?=\\s*장)`, "g"), String(outline.length)) })) } } : deck.researchRecord;
  return {...deck,researchRecord,review:undefined,input:{...deck.input,slideCount:outline.length},outline,candidates:shift(deck.candidates,at),picked:shift(deck.picked,at),edited:shift(deck.edited,at),candidateRounds:deck.candidateRounds?shift(deck.candidateRounds,at):undefined,chat:{...deck.chat,slides:shift(deck.chat.slides,at)}};
}
export function slideAttachmentOptions(deck:Pick<Deck,"outline"|"attachments">,index:number){
  const all:Attachment[]=[...(deck.outline[index]?.attachments??[]),...(deck.attachments??[])];
  const unique=[...new Map(all.filter(f=>f.kind!=="image"||f.includeForAI!==false).map(f=>[f.id,f])).values()];
  return attachmentOptions(unique);
}
export function pageNeighborContext(deck:Deck,index:number){
  const summarize=(i:number)=>{if(i<0||i>=deck.outline.length)return null;const slide=draftSlide(deck,i);return {section:deck.outline[i].section,message:slide?canvasHeadline(slide):deck.outline[i].message,content:slide?.data??deck.outline[i].contentHint,...(slide?.canvasEdits?{userTextChanges:canvasTextChanges(slide)}:{})};};
  return {previous:summarize(index-1),next:summarize(index+1)};
}
