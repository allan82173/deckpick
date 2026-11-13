import test from "node:test";
import assert from "node:assert/strict";
import {runResearch} from "../src/lib/research-pipeline";
import {type QuestionResult} from "../src/lib/research-questions";
import {taskAnalysisSchema} from "../src/lib/task-model";
import {taskFingerprint} from "../src/lib/task-analysis";
import {GENERATION_CONFIG} from "../src/lib/generation-config";
import type {DeckInput} from "../src/lib/model";

const c={provider:"openai" as const,key:"test-only",model:"gpt-6-luna"};
const input:DeckInput={topic:"범용 원문 복구",purpose:"다양한 실제 출처를 읽는다",slideCount:5,deckType:"consulting",designSystemId:"ict-forest"};
const original="공식 자료가 확인한 실제 수치 420과 조건 365를 제시합니다.";
const reply=(value:unknown)=>Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(value)}]}]});
function base(){return {analysis:taskAnalysisSchema.parse({questions:["Q1","Q2"].map(id=>({id,question:"검증 가능한 공개 수치는?",publicQuestion:"검증 가능한 공개 수치는?",judgmentForm:"선택",needsPublicEvidence:id==="Q1"})),publicContext:[],privateConditions:[],internalPremises:[],stage:"final",language:"ko",slideCount:5,requiredSections:[],checklist:[{id:"count",requirement:"5장"}],terminology:[],notationRules:[],fingerprint:taskFingerprint(input,"",[])}),plan:{questions:[{questionId:"Q1",evidenceNeeded:"원문",preferredMaterials:["기관·기업 공식 안내" as const],localQuery:"local",englishQuery:"english",focusQueries:["focus"]}]},evidence:[],searchStatus:"not-requested" as const,query:"",notice:""};}
function rows(urls:string[]){return urls.map(url=>({claim:original,title:"공식 자료",url,kind:"공개 사실",locator:"본문",originalText:original,publishedAt:"",materialType:"기관·기업 공식 안내",contextMatch:"일치",contextReason:"합성 조건 일치",questionIds:["Q1"]}));}
const page=(url:string)=>({url,text:original,opened:true,checkedAt:"today",format:"html" as const});

test("original selection interleaves every query instead of using only the first query's list",async()=>{
 const native=fetch,rounds=GENERATION_CONFIG.research.roundsPerQuestion;GENERATION_CONFIG.research.roundsPerQuestion=1;
 const opened:string[]=[];
 globalThis.fetch=async(_,init)=>{const data=JSON.parse(String(JSON.parse(String(init?.body)).input));return reply({rows:rows(data.originalPages.filter((p:{opened:boolean})=>p.opened).map((p:{url:string})=>p.url))});};
 try{await runResearch(c,input,base(),"",[],[],{search:async(_,query)=>({text:"공개 검색",sources:[1,2,3].map(i=>({title:query,url:`https://example.org/${query}/${i}`}))}),readPage:async url=>{opened.push(url);return page(url);}});
 assert.deepEqual(opened.slice(0,3),["local","english","focus"].map(q=>`https://example.org/${q}/1`));
 }finally{globalThis.fetch=native;GENERATION_CONFIG.research.roundsPerQuestion=rounds;}
});

test("blocked originals remain reported while later actual URLs fill the successful-original goal",async()=>{
 const native=fetch,rounds=GENERATION_CONFIG.research.roundsPerQuestion;GENERATION_CONFIG.research.roundsPerQuestion=1;
 const opened:string[]=[],urls=Array.from({length:9},(_,i)=>`https://example.org/${i}`);
 globalThis.fetch=async(_,init)=>{const data=JSON.parse(String(JSON.parse(String(init?.body)).input));return reply({rows:rows(data.originalPages.filter((p:{opened:boolean})=>p.opened).map((p:{url:string})=>p.url))});};
 try{const result=await runResearch(c,input,base(),"",[],[],{search:async()=>({text:"공개 검색",sources:urls.map(url=>({title:"공식 자료",url}))}),readPage:async url=>{opened.push(url);return urls.indexOf(url)<3?{...page(url),opened:false,text:"",error:"원문 HTTP 403"}:page(url);}});
 assert.equal(opened.length,GENERATION_CONFIG.research.originalAttemptsPerQuestion);
 assert.equal(result.researchRecord.originalPages?.filter(p=>!p.opened).length,3);
 assert.equal(result.researchRecord.originalPages?.filter(p=>p.opened).length,3);
 assert.equal(result.researchRecord.evidence.filter(e=>e.originalVerified).length,3);
 }finally{globalThis.fetch=native;GENERATION_CONFIG.research.roundsPerQuestion=rounds;}
});

test("zero evidence after bounded row retries still permits the configured follow-up round",async()=>{
 const native=fetch;let extracts=0,followups=0,searches=0;
 globalThis.fetch=async(_,init)=>{const b=JSON.parse(String(init?.body));if(b.text.format.schema.properties.localQuery){followups++;return reply({localQuery:"followup",englishQuery:"new English query"});}extracts++;return reply({rows:extracts<=1+GENERATION_CONFIG.reliability.emptyRowsRetries?[]:rows(["https://example.org/source"])});};
 try{const result=await runResearch(c,input,base(),"",[],[],{search:async()=>{searches++;return {text:"공개 검색",sources:[{title:"공식 자료",url:"https://example.org/source"}]};},readPage:async url=>page(url)});
 assert.equal(followups,1);assert.equal(searches,3+GENERATION_CONFIG.research.followupQueries);
 assert.equal(result.researchRecord.searchRounds?.length,2);assert.equal(result.researchRecord.evidence.length,1);
 }finally{globalThis.fetch=native;}
});

test("actual linked reports keep their own URL, original text and discovery origin",async()=>{
 const native=fetch,rounds=GENERATION_CONFIG.research.roundsPerQuestion;GENERATION_CONFIG.research.roundsPerQuestion=1;
 const landing="https://example.org/investors",report="https://cdn.example.org/report.pdf";
 globalThis.fetch=async()=>reply({rows:rows([report])});
 try{const result=await runResearch(c,input,base(),"",[],[],{search:async()=>({text:"공개 검색",sources:[{title:"보고서 안내",url:landing}]}),readPage:async url=>url===landing?{...page(url),text:"공식 보고서 목록입니다.",links:[{title:"Annual report",url:report}]}:{...page(url),format:"pdf"}});
 assert.equal(result.researchRecord.evidence[0].url,report);assert.equal(result.researchRecord.evidence[0].originalVerified,true);
 assert.equal(result.researchRecord.originalPages?.find(p=>p.url===report)?.discoveredFrom,landing);
 assert.ok(result.sources.some(s=>s.url===report));
 }finally{globalThis.fetch=native;GENERATION_CONFIG.research.roundsPerQuestion=rounds;}
});

test("controlled same-run seeds reuse actual sources without a repeated first-round search",async()=>{
 const native=fetch,rounds=GENERATION_CONFIG.research.roundsPerQuestion;GENERATION_CONFIG.research.roundsPerQuestion=1;
 const sources=[{title:"IR 목록",url:"https://ir.example.org/list"},{title:"IR 상세",url:"https://ir.example.org/details"},{title:"실적 발표",url:"https://news.example.org/results"}];
 const seed:QuestionResult={sources,evidence:[],pages:[],queries:["local","english","focus"],rounds:[],rejectedRows:[],warnings:[],complete:true};
 globalThis.fetch=async(_,init)=>{const data=JSON.parse(String(JSON.parse(String(init?.body)).input));return reply({rows:rows(data.originalPages.map((p:{url:string})=>p.url))});};
 try{const result=await runResearch(c,input,base(),"",[],[],{seedResults:{Q1:seed},search:async()=>{throw Error("must not repeat prior searches");},readPage:async url=>page(url)});
 assert.equal(result.researchRecord.evidence.length,3);assert.deepEqual(result.researchRecord.queries,seed.queries);
 }finally{globalThis.fetch=native;GENERATION_CONFIG.research.roundsPerQuestion=rounds;}
});
