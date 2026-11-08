import {z} from "zod";
import {researchRecordSchema,type ResearchRecord} from "./evidence-model";
import {sourceSchema,type Source} from "./model";
import {mapConcurrent} from "./concurrency";
import {deduplicateEvidence} from "./evidence-selection";
import {applyResearchCoverage} from "./research-coverage";
import type {GenerationState} from "./run-state";
type Result=Record<string,unknown>;
type Request=(action:string,payload:Result)=>Promise<Result>;
export async function researchContextKey(payload:Result){
 const messages=Array.isArray(payload.messages)?payload.messages.filter((m):m is {role:string;text:string}=>typeof m==="object"&&m!==null&&"role" in m&&m.role==="user"&&"text" in m).map(m=>({role:m.role,text:m.text})):[];
 const bytes=new TextEncoder().encode(JSON.stringify({input:payload.input,messages,attachmentIds:payload.attachmentIds??[],lowDetailImageIds:payload.lowDetailImageIds??[]}));
 return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(v=>v.toString(16).padStart(2,"0")).join("");
}
export function canResumeStoryline(record:ResearchRecord|undefined,state?:GenerationState){
 if(!record?.analysis||record.researchComplete===false)return false;
 if(record.researchComplete)return true;
 const stages=state?.completedStages??[];
 if(stages.some(s=>["judgment","storyline","storyline-calculations","storyline-final"].includes(s)))return true;
 return stages.includes("evidence-table")&&record.analysis.questions.filter(q=>q.needsPublicEvidence).every(q=>stages.includes(`research-question:${q.id}`));
}
const unique=<T,>(rows:T[])=>[...new Map(rows.map(row=>[JSON.stringify(row),row])).values()];
export function mergeQuestionResearch(base:ResearchRecord,parts:Result[]){
 const records=parts.map(p=>researchRecordSchema.parse(p.researchRecord));
 const sources=[...new Map(parts.flatMap(p=>z.array(sourceSchema).parse(p.sources??[])).map(s=>[s.url,s])).values()];
 const raw=[...base.evidence,...records.flatMap(r=>r.evidence.filter(e=>e.kind!=="내부 전제"))].map((e,i)=>({...e,id:String(i+1)}));
 const evidence=deduplicateEvidence(raw),allPages=records.flatMap(r=>r.originalPages??[]);
 const pages=[...new Map(allPages.map(p=>[p.url,{...p,questionIds:[...new Set(allPages.filter(v=>v.url===p.url).flatMap(v=>v.questionIds??[]))]}])).values()];
 const record=applyResearchCoverage({...base,researchComplete:true,evidence,searchStatus:sources.length?"searched":records.some(r=>r.searchStatus==="unavailable")?"unavailable":"not-requested",queries:unique(records.flatMap(r=>r.queries??[])),searchRounds:unique(records.flatMap(r=>r.searchRounds??[])),originalPages:pages,rejectedRows:unique([...(base.rejectedRows??[]),...records.flatMap(r=>r.rejectedRows??[])]),evidenceWarnings:unique(records.flatMap(r=>r.evidenceWarnings??[])),evidenceCounts:{raw:raw.length,unique:evidence.length,publicRaw:raw.filter(e=>e.kind==="공개 사실").length,publicUnique:evidence.filter(e=>e.kind==="공개 사실").length},notice:sources.length?`공개 조사 · 원문 ${pages.filter(p=>p.opened).length}/${pages.length}개 · 근거 ${evidence.length}행`:"웹 검색 없이 첨부 자료만으로 작성됨"});
 return {researchRecord:record,sources};
}
export async function generationFlow(payload:Result,request:Request,options:{cloud:boolean;resumeOnly?:boolean;onResearch?:(record:ResearchRecord,sources:Source[])=>void}){
 const contextKey=await researchContextKey(payload);
 const finish=async(record:ResearchRecord,sources:Source[])=>{
  const judged=await request("storyline/judgment",{...payload,researchRecord:record,sources});
  if(judged.needsResearchReview)return judged;
  const next=researchRecordSchema.parse(judged.researchRecord);options.onResearch?.(next,sources);
  return request("storyline",{...payload,researchRecord:next,sources});
 };
 if(options.resumeOnly){const record=researchRecordSchema.parse(payload.researchRecord);if(!record.analysis||record.researchComplete===false)throw Error("조사가 완료된 저장 결과가 필요합니다.");if(!record.requestContext||record.requestContext===contextKey)return finish(record,z.array(sourceSchema).parse(payload.sources??[]));}
 const prepared=await request("research/prepare",payload);let record=researchRecordSchema.parse(prepared.researchRecord);options.onResearch?.(record,[]);
 let researched:Result;
 if(options.cloud){
  const questions=record.plan?.questions.filter(q=>record.analysis?.questions.some(a=>a.id===q.questionId&&a.needsPublicEvidence))??[];
  const outcomes=await mapConcurrent(questions,q=>request("research/run",{...payload,researchRecord:record,sources:[],researchQuestionId:q.questionId}));
  const parts=outcomes.map(r=>{if(r.status==="rejected")throw r.reason;return r.value;});researched=mergeQuestionResearch(record,parts);
 }else researched=await request("research/run",{...payload,researchRecord:record});
 record={...researchRecordSchema.parse(researched.researchRecord),requestContext:contextKey};const sources=z.array(sourceSchema).parse(researched.sources??[]);options.onResearch?.(record,sources);
 if(record.requiresReview)return {...researched,reply:record.notice,outlineDraft:[],needsResearchReview:true};
 return finish(record,sources);
}
