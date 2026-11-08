import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { GENERATION_CONFIG } from "../src/lib/generation-config";
import { taskAnalysisSchema } from "../src/lib/task-model";
import { taskFingerprint } from "../src/lib/task-analysis";
import { runResearch } from "../src/lib/research-pipeline";
import { extractAttachmentEvidence } from "../src/lib/attachment-evidence";
import { structured,generateCandidates } from "../src/lib/ai";
import { createStoryline } from "../src/lib/storyline";
import { withExecution } from "../src/lib/execution-scope";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { demoCandidates } from "../src/lib/demo";
import { forest } from "../src/lib/design";
import type { Deck,DeckInput } from "../src/lib/model";
import { POST } from "../src/app/api/[...action]/route";
import { pipelineFixture } from "./pipeline-fixture";
import { withRunContext,checkpoint,runState } from "../src/lib/run-checkpoints";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FullDraftReview } from "../src/components/full-draft-review";
import { StudioProvider } from "../src/components/store";
const c={provider:"openai" as const,key:"test-only",model:"gpt-6-luna"};
const input:DeckInput={topic:"안정화 합성 과제",purpose:"행 검증과 중단 복원",slideCount:5,deckType:"consulting",designSystemId:"ict-forest"};
const reply=(value:unknown)=>Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(value)}]}],usage:{input_tokens:100,output_tokens:10,total_tokens:110}});
function base(){const analysis=taskAnalysisSchema.parse({questions:["Q1","Q2"].map(id=>({id,question:"공개 근거 선택",publicQuestion:"공개 선택",judgmentForm:"선택",needsPublicEvidence:id==="Q1"})),publicContext:[],privateConditions:[],internalPremises:[],stage:"중간",language:"ko",slideCount:5,requiredSections:[],checklist:[{id:"count",requirement:"5장"}],terminology:[],notationRules:[],fingerprint:taskFingerprint(input,"",[])});return {analysis,plan:{questions:[{questionId:"Q1",evidenceNeeded:"원문",preferredMaterials:["기관·기업 공식 안내" as const],localQuery:"공식 자료",englishQuery:"official evidence"}]},evidence:[],searchStatus:"not-requested" as const,query:"",notice:""};}
const url="https://example.org/official",originalText="원문에서 확인할 수 있는 숫자 42와 조건을 제시합니다.";
const row={claim:originalText,title:"공식 자료",url,kind:"공개 사실",locator:"본문",originalText,publishedAt:"",materialType:"기관·기업 공식 안내",contextMatch:"일치",contextReason:"지역과 대상 일치",questionIds:["Q1"]};
const services={search:async()=>({text:originalText,sources:[{title:"공식 자료",url}]}),readPage:async()=>({url,text:originalText,opened:true,checkedAt:"today",format:"html" as const})};
test("bad URL and question rows are isolated while unmatched originalText is retained",async()=>{
 const strictGate=GENERATION_CONFIG as {autoProceedLimitedEvidence:boolean},previousGate=strictGate.autoProceedLimitedEvidence;strictGate.autoProceedLimitedEvidence=false;try{
 const native=fetch;let calls=0;
 globalThis.fetch=async(_,init)=>{const b=JSON.parse(String(init?.body));if(JSON.stringify(b.text).includes('"localQuery"'))return reply({localQuery:"다른 자료",englishQuery:"another source"});calls++;return reply({rows:[row,{...row,claim:"원문 미확인 주장",originalText:"원문에 없는 인용입니다"},{...row,url:"https://invalid.example/fabricated"},{...row,questionIds:["WRONG"]}]});};
 try{const result=await runResearch(c,input,base(),"",[],[],services);assert.equal(result.researchRecord.evidence.length,1);assert.equal(result.researchRecord.rejectedRows?.length,2*result.researchRecord.searchRounds!.length);const unconfirmed=result.researchRecord.evidence.flatMap(e=>[e,...(e.relatedFacts??[])]).find(e=>e.claim==="원문 미확인 주장")!;assert.equal(unconfirmed.originalText,"");assert.equal(unconfirmed.verificationStatus,"원문 미확인");assert.equal(unconfirmed.originalVerified,false);assert.ok(calls>=1);assert.equal(result.researchRecord.requiresReview,true);}finally{globalThis.fetch=native;}
 }finally{strictGate.autoProceedLimitedEvidence=previousGate;}
});
test("zero valid rows retry once then become a gap instead of failing the pipeline",async()=>{
 const native=fetch;let calls=0;globalThis.fetch=async()=>{calls++;return reply({rows:[{...row,url:"https://invalid.example/wrong"}]});};
 try{const result=await runResearch(c,input,base(),"",[],[],services);assert.equal(calls,1+GENERATION_CONFIG.reliability.emptyRowsRetries);assert.equal(result.researchRecord.evidence.length,0);assert.equal(result.researchRecord.gaps?.length,1);assert.equal(result.researchRecord.rejectedRows?.length,calls);}finally{globalThis.fetch=native;}
});
test("attachment validation keeps other rows and flags unconfirmed text without whole-call retry",async()=>{
 const native=fetch;let calls=0;const text="사용자가 제공한 원문 조건은 42일입니다.",locator="synthetic.txt · 1행";
 globalThis.fetch=async()=>{calls++;return reply({attachmentRows:[{content:text,type:"조건",locator},{content:"원문과 다른 조건입니다",type:"조건",locator},{content:text,type:"조건",locator:"없는 파일 · 2쪽"}]});};
 try{const result=await extractAttachmentEvidence({...c,model:"test-"+randomUUID()},text,[{id:randomUUID(),name:"synthetic.txt",chunks:[{location:"1행",text}]}]);assert.equal(calls,1);assert.equal(result.evidence.length,2);assert.equal(result.rejectedRows.length,1);assert.equal(result.evidence[1].originalText,"");assert.equal(result.evidence[1].verificationStatus,"원문 미확인");}finally{globalThis.fetch=native;}
});
test("network retries use a separate budget and retain returned usage only",async()=>{
 const native=fetch,backoff=GENERATION_CONFIG.reliability.backoffMs;GENERATION_CONFIG.reliability.backoffMs=1;let calls=0;
 globalThis.fetch=async()=>{if(++calls<3)throw TypeError("synthetic disconnect");return reply({ok:true});};
 try{const measured=await withExecution(()=>structured(c,z.object({ok:z.boolean()}),"test","test"));assert.equal(calls,3);assert.deepEqual(measured.execution.calls.map(v=>v.status),[0,0,200]);assert.ok(measured.execution.calls.every(v=>v.stage!=="formatRepair"));assert.equal(measured.execution.calls[0].inputTokens,undefined);}finally{globalThis.fetch=native;GENERATION_CONFIG.reliability.backoffMs=backoff;}
});
test("forced review timeout returns the original slides and an incomplete review",async()=>{
 const native=fetch,deadline=GENERATION_CONFIG.reliability.deadlines.review;GENERATION_CONFIG.reliability.deadlines.review=10;
 globalThis.fetch=async()=>new Promise<Response>(()=>{});
 const outline=[{index:0,section:"표지",message:input.topic,contentHint:""}],slide=demoCandidates(input,outline[0])[0];const deck:Deck={id:randomUUID(),input,designSystem:forest,research:[],outline,candidates:{0:[slide]},picked:{0:0},edited:{},chat:{setup:[],outline:[],slides:{}},demo:false};
 try{const result=await reviewAndRepairDeck(c,deck);assert.equal(result.review.status,"incomplete");assert.deepEqual(result.slides,[slide]);assert.deepEqual(result.replacements,[]);assert.deepEqual(deck.candidates[0],[slide]);}finally{globalThis.fetch=native;GENERATION_CONFIG.reliability.deadlines.review=deadline;}
});
test("a checkpoint interruption resumes after the last completed stage",async()=>{
 const id=randomUUID();let taskCalls=0,storyCalls=0;
 await assert.rejects(withRunContext(id,async()=>{await checkpoint("task-analysis",input,async()=>{taskCalls++;return {questions:["Q1"]};});await checkpoint("storyline",input,async()=>{storyCalls++;throw Error("synthetic interruption");});}),/synthetic interruption/);
 const result=await withRunContext(id,async()=>{await checkpoint("task-analysis",input,async()=>{taskCalls++;return {questions:["Q1"]};});await checkpoint("storyline",input,async()=>{storyCalls++;return {outline:[1,2,3,4,5]};});return runState("complete");});
 assert.equal(taskCalls,1);assert.equal(storyCalls,2);assert.deepEqual(result?.completedStages,["task-analysis","storyline"]);
});
test("API resume reuses task interpretation and preserves the failed attempt report",async()=>{
 const native=fetch,id=randomUUID();let interpretCalls=0,planCalls=0,fail=true;
 globalThis.fetch=async(_,init)=>{const b=JSON.parse(String(init?.body)),properties=b.text.format.schema.properties;if(properties.publicContext)interpretCalls++;else if(properties.questions){planCalls++;if(fail)return Response.json({error:{code:"synthetic"}},{status:401});}return reply(pipelineFixture(b,input));};
 const request=()=>POST(new Request("http://localhost:3100/api/research/prepare",{method:"POST",headers:{"Content-Type":"application/json","x-user-api-key":"test-only"},body:JSON.stringify({runId:id,model:c.model,input})}),{params:Promise.resolve({action:["research","prepare"]})});
 try{const first=await request();assert.equal(first.status,401);const failure=await first.json();const failurePath=`output/run-reports/attempts/${failure.attemptReportFilename}.json`,before=await readFile(failurePath,"utf8");assert.equal(JSON.parse(before).attempt.status,"failed");fail=false;const second=await request();assert.equal(second.status,200);const success=await second.json();assert.equal(success.generationState.status,"complete");assert.ok(success.generationState.completedStages.includes("task-analysis"));assert.ok(success.generationState.completedStages.includes("research-plan"));assert.equal(interpretCalls,1);assert.equal(planCalls,2);assert.equal(await readFile(failurePath,"utf8"),before);}finally{globalThis.fetch=native;}
});
test("the draft screen exposes resume and an explicit incomplete-review retry",()=>{
 const outline=[{index:0,section:"표지",message:input.topic,contentHint:""}];const deck:Deck={id:randomUUID(),input,designSystem:forest,research:[],outline,candidates:{},picked:{},edited:{},chat:{setup:[],outline:[],slides:{}},demo:false};
 const props={deck,busyIndex:null,running:false,failed:true,onRetry:()=>{},onReview:()=>{},onCompare:()=>{},onLoadAlternatives:()=>{},onSelectAlternative:()=>{},onInsert:async()=>{},onEdit:()=>{},onSlideChat:async()=>{},onError:()=>{}};
 const html=renderToStaticMarkup(createElement(StudioProvider,{children:createElement(FullDraftReview,props)}));assert.match(html,/이어서 생성/);
 const slide=demoCandidates(input,outline[0])[0];const complete={...deck,candidates:{0:[slide]},picked:{0:0},review:{status:"incomplete" as const,checklist:[],issues:[],rounds:0,reviewedAt:"today",summary:"검토 미완료"}};
 const reviewed=renderToStaticMarkup(createElement(StudioProvider,{children:createElement(FullDraftReview,{...props,deck:complete,failed:false})}));assert.match(reviewed,/미완료 검토 다시 실행/);assert.match(reviewed,/검토 미완료/);
});
test("mixed bad rows still reach storyline, all slides, and the deck review",async()=>{
 const native=fetch;
 globalThis.fetch=async(_,init)=>{const b=JSON.parse(String(init?.body)),properties=b.text.format.schema.properties;
  if(properties.rows)return reply({rows:[row,{...row,url:url+"-second"},{...row,claim:"인용 미확인",originalText:"존재하지 않는 문구"},{...row,url:"https://invalid.example/not-returned"},{...row,questionIds:["WRONG"]}]});
  if(properties.warnings)return reply({warnings:[]});
  if(properties.checklist)return reply({checklist:[{id:"count",passed:true,reason:"5장"}],issues:[],summary:"합성 검증"});
  if(properties.slides){const data=JSON.parse(String(b.input)) as {item:{section:string;message:string};slotPlan:{layoutId:string}[];layoutExamples:Record<string,unknown>};return reply({slides:data.slotPlan.map(slot=>({layoutId:slot.layoutId,section:data.item.section,headline:data.item.message,dataJson:JSON.stringify(data.layoutExamples[slot.layoutId]),sourceUrls:[],notes:""}))});}
  return reply(pipelineFixture(b,input));
 };
 try{const researched=await runResearch(c,input,base(),"",[],[],{...services,search:async()=>({text:originalText,sources:[{title:"공식 자료",url},{title:"다른 공식 자료",url:url+"-second"}]}),readPage:async sourceUrl=>({...await services.readPage(),url:sourceUrl})});
 const story=await createStoryline(c,input,[],[],{...researched.researchRecord,acceptedLimits:true,requiresReview:false});
 const deck:Deck={id:randomUUID(),input,designSystem:forest,research:researched.sources,researchRecord:story.researchRecord,outline:story.outlineDraft,candidates:{},picked:{},edited:{},chat:{setup:[],outline:[],slides:{}},demo:false};
 for(const item of deck.outline){deck.candidates[item.index]=await generateCandidates(c,input,item,deck.research,"합성 테스트",[],true,deck.outline,"",0,[],[],undefined,deck.researchRecord!.evidence,[],{record:deck.researchRecord,qualityRetries:0});deck.picked[item.index]=0;}
 const reviewed=await reviewAndRepairDeck(c,deck);assert.equal(deck.outline.length,5);assert.equal(reviewed.slides.length,5);assert.ok(reviewed.slides.every(Boolean));assert.equal(reviewed.review.status,"complete");assert.equal(deck.researchRecord!.rejectedRows?.length,2);assert.ok(deck.researchRecord!.evidence.flatMap(e=>[e,...(e.relatedFacts??[])]).some(e=>e.verificationStatus==="원문 미확인"));
 }finally{globalThis.fetch=native;}
});


test("HTTP 520 is a transient retry and does not spend the format retry budget",async()=>{
 const native=fetch,backoff=GENERATION_CONFIG.reliability.backoffMs;GENERATION_CONFIG.reliability.backoffMs=1;let count=0;
 globalThis.fetch=async()=>++count===1?new Response("temporary upstream failure",{status:520}):reply({ok:true});
 try{const measured=await withExecution(()=>structured(c,z.object({ok:z.boolean()}),"test","test",undefined,[],"story"));assert.equal(measured.result.ok,true);assert.deepEqual(measured.execution.calls.map(v=>v.status),[520,200]);assert.deepEqual(measured.execution.calls.map(v=>v.networkRetry),[0,1]);assert.ok(measured.execution.calls.every(v=>v.stage==="story"));assert.equal(measured.execution.calls[0].inputTokens,undefined);}finally{globalThis.fetch=native;GENERATION_CONFIG.reliability.backoffMs=backoff;}
});
