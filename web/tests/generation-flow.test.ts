import test from "node:test";
import assert from "node:assert/strict";
import {generationFlow,canResumeStoryline,mergeQuestionResearch,researchContextKey} from "../src/lib/generation-flow";
import {providerTimeout} from "../src/lib/run-budget";
import {createStoryJudgments} from "../src/lib/storyline";
import {GENERATION_CONFIG} from "../src/lib/generation-config";
import type {ResearchRecord} from "../src/lib/evidence-model";
const input={topic:"업무 개선",purpose:"범용 검증",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:5};
function record():ResearchRecord{return {evidence:[],searchStatus:"not-requested",notice:"준비됨",query:"",analysis:{questions:[1,2,3,4].map(i=>({id:`Q${i}`,question:`판단 ${i}`,publicQuestion:`공개 질문 ${i}`,judgmentForm:"선택",needsPublicEvidence:true})),publicContext:[],privateConditions:[],internalPremises:[],stage:"중간",language:"ko",slideCount:5,requiredSections:[],checklist:[{id:"1",requirement:"판단"}],terminology:[],notationRules:[],fingerprint:"stored"},plan:{questions:[1,2,3,4].map(i=>({questionId:`Q${i}`,evidenceNeeded:"공개 근거",preferredMaterials:["공식 통계·공공기관"],localQuery:`주제 ${i}`,englishQuery:`topic ${i}`}))}};}
function part(id:string){return {sources:[{title:"공식 자료",url:`https://example.org/${id}`}],researchRecord:{...record(),researchComplete:false,searchStatus:"searched",evidence:[{id:"1",claim:"확인된 사실",title:"공식 자료",url:`https://example.org/${id}`,locator:"본문",checkedAt:"today",kind:"공개 사실",contextMatch:"일치",originalVerified:true,questionIds:[id]}]}};}
test("cloud research runs within configured question concurrency then uses separate judgment and story requests",async()=>{
 const actions:string[]=[];let active=0,max=0;const saved:ResearchRecord[]=[];
 const result=await generationFlow({input},async(action,payload)=>{actions.push(action);if(action==="research/prepare")return {researchRecord:record()};if(action==="research/run"){active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,10));active--;return part(String(payload.researchQuestionId));}if(action==="storyline/judgment")return {researchRecord:payload.researchRecord};return {reply:"완료"};},{cloud:true,onResearch:r=>saved.push(r)});
 assert.equal(max,Math.min(4,GENERATION_CONFIG.research.questionConcurrency));assert.deepEqual(actions.slice(-2),["storyline/judgment","storyline"]);assert.equal(result.reply,"완료");assert.equal(saved.at(-1)?.evidence.length,4);assert.equal(saved.at(-1)?.researchComplete,true);
});
test("a failed storyline retry never calls research prepare or run and retains the saved record",async()=>{
 const ready=mergeQuestionResearch(record(),[1,2,3,4].map(i=>part(`Q${i}`))).researchRecord;let saved:ResearchRecord|undefined;const calls:string[]=[];
 await assert.rejects(()=>generationFlow({input,researchRecord:ready,sources:[]},async(action,payload)=>{calls.push(action);if(action==="storyline/judgment")return {researchRecord:payload.researchRecord};throw Error("story timeout");},{cloud:true,resumeOnly:true,onResearch:r=>saved=r}),/story timeout/);
 assert.deepEqual(calls,["storyline/judgment","storyline"]);assert.equal(saved?.evidence.length,4);assert.equal(canResumeStoryline(saved),true);
 calls.length=0;await generationFlow({input,researchRecord:saved,sources:[]},async(action,payload)=>{calls.push(action);return action==="storyline/judgment"?{researchRecord:payload.researchRecord}:{reply:"재개 완료"};},{cloud:true,resumeOnly:true});assert.deepEqual(calls,["storyline/judgment","storyline"]);
});
test("incomplete research cannot be silently reused as a completed storyline input",async()=>{
 const incomplete={...record(),researchComplete:false};assert.equal(canResumeStoryline(incomplete),false);let calls=0;await assert.rejects(()=>generationFlow({researchRecord:incomplete},async()=>{calls++;return {};},{cloud:true,resumeOnly:true}),/조사가 완료/);assert.equal(calls,0);
});
test("cloud individual calls fit the function budget while local 330-second story wait is retained",()=>{
 const previous=process.env.VERCEL;try{delete process.env.VERCEL;assert.equal(providerTimeout("story"),330000);process.env.VERCEL="1";assert.equal(providerTimeout("story"),260000);assert.ok(providerTimeout("story")<GENERATION_CONFIG.hosting.stageBudgetMs);}finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
});
test("saved valid judgments do not call the model again",async()=>{
 const r={...record(),searchStatus:"searched" as const,evidence:[{id:"1",claim:"사실",title:"자료",url:"https://example.org",locator:"본문",checkedAt:"today",kind:"공개 사실" as const}],decisions:[1,2,3,4].map(i=>({questionId:`Q${i}`,candidates:[{name:"A",rationale:"근거",evidenceRefs:["1"]},{name:"B",rationale:"대안",evidenceRefs:["1"]}],criteria:["효과","비용"],selected:"A",judgment:"A가 우선",strength:"추론" as const,evidenceRefs:["1"],reversalConditions:["비용 증가"],limitations:[]}))};
 const original=fetch;globalThis.fetch=async()=>{throw Error("must not request provider");};try{assert.strictEqual(await createStoryJudgments({provider:"openai",key:"test-only",model:"test"},input,[],r),r);}finally{globalThis.fetch=original;}
});

test("resume context ignores assistant error text and credentials but changes with user input or files",async()=>{
 const base={input,messages:[{role:"user",text:"요청"}],attachmentIds:["file1"]};
 const key=await researchContextKey(base);
 assert.equal(await researchContextKey({...base,messages:[...base.messages,{role:"assistant",text:"오류"}],key:"never-store-this"}),key);
 assert.notEqual(await researchContextKey({...base,input:{...input,slideCount:6}}),key);
 assert.notEqual(await researchContextKey({...base,attachmentIds:["file2"]}),key);
});
