import test from "node:test";
import assert from "node:assert/strict";
import {acceptanceWarnings,editorialCoverage} from "../src/lib/editorial-quality";
import {visualReviewBatch} from "../src/lib/visual-review";
import {candidatePlan,widerPool} from "../src/lib/candidate-plan";
import {demoCandidates,demoOutline} from "../src/lib/demo";
import {forest} from "../src/lib/design";
import {passedCriteria,visualFixture} from "./editorial-fixture";
import {sourceBibliography} from "../src/lib/source-bibliography";
import {generateCandidates} from "../src/lib/ai";
import {assessDeck} from "../src/lib/deck-review";
import type {Deck} from "../src/lib/model";
import type {Evidence} from "../src/lib/evidence-model";
const input={topic:"업무 지연의 원인",purpose:"원인과 대책을 결정",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:6};

test("a historical image-pass flag is not a completed four-point review",()=>{
 assert.deepEqual(editorialCoverage([{status:"passed"}]).unchecked,1);
 assert.equal(editorialCoverage([{status:"passed",criteria:passedCriteria()}]).allPagesPassed,true);
 assert.throws(()=>acceptanceWarnings([1,1,3,4].map(criterion=>({...passedCriteria()[0],criterion}))),/각각/);
});
test("a content flow never falls back to a decorative section divider",()=>{
 const item={index:2,section:"원인",role:"흐름" as const,message:"이관 지연이 처리시간을 늘립니다.",contentHint:"접수에서 담당 부서까지의 경로와 지연시간"};
 assert.ok(!candidatePlan(input,item).includes("c-section-divider"));assert.ok(!widerPool(input,item).includes("c-section-divider"));
 assert.deepEqual(candidatePlan(input,item,[],0,1,"c-section-divider"),["c-section-divider"],"직접 고른 구성은 허용");
 assert.ok(widerPool(input,{...item,section:"섹션 구분",contentHint:"본문 없는 전환 장"}).includes("c-section-divider"));
});
test("a visually tidy but uninformative layout fails criterion three in one existing call",async()=>{
 const native=fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const b=JSON.parse(String(init?.body)),value=visualFixture(b) as {warnings:string[];reviews:{index:number;warnings:string[];criteria:ReturnType<typeof passedCriteria>}[]};
  value.reviews[0].criteria[2]={criterion:3,passed:false,reason:"원인과 기여량을 같은 상자에 나열해 관계가 보이지 않습니다.",improvement:"비용 기여분을 워터폴로 분해하세요."};
  return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(value)}]}]});};
 try{const result=await visualReviewBatch({provider:"openai",key:"test-only",model:"mock"},demoCandidates(input,demoOutline(input)[0]),forest,1,input.topic,[],{previousHeadline:"처리시간이 증가했습니다.",nextHeadline:"이관 단계를 줄입니다."});assert.equal(calls,1);assert.equal(result[0].status,"issues");assert.match(result[0].warnings.join(" "),/품질 기준 3 미달/);assert.equal(result[1].status,"passed");}finally{globalThis.fetch=native;}
});
test("omitted rubric results stay incomplete without expensive format retries",async()=>{
 const native=fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({output:[{content:[{type:"output_text",text:'{"warnings":[]}'}]}]});};
 try{const result=await visualReviewBatch({provider:"openai",key:"test-only",model:"mock"},demoCandidates(input,demoOutline(input)[0]),forest,1,input.topic);assert.equal(calls,1);assert.ok(result.every(r=>r.status==="failed"));}finally{globalThis.fetch=native;}
});

test("the source page uses recorded metadata, with only the existing image-review call",async()=>{
 const evidence=Array.from({length:8},(_,i)=>({id:String(i+1),kind:"공개 사실",title:`공공기관 운영 보고서 ${i+1}`,claim:"조사된 조건",url:`https://example.org/report/${i+1}`,checkedAt:"2026-11-13",contextMatch:"일치",originalVerified:true})) as Evidence[];
 const sourceInput={...input,appendSources:true},item={index:5,section:"출처",message:"원문 자료를 제시합니다.",contentHint:"",role:"근거" as const};
 const direct=sourceBibliography(sourceInput,item,evidence)!;assert.equal(direct.data.mode,"bibliography");assert.equal((direct.data.rows as unknown[]).length,8);assert.ok(direct.notes?.includes(evidence[7].url));
 const native=fetch;let calls=0;globalThis.fetch=async(_url,init)=>{calls++;const b=JSON.parse(String(init?.body));assert.ok(!b.text.format.schema.properties.slides,"출처 내용을 모델에 다시 생성시키지 않는다");return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(visualFixture(b))}]}]});};
 try{const result=await generateCandidates({provider:"openai",key:"test-only",model:"mock"},sourceInput,item,[],"",[],false,[item],"",0,[],[],undefined,evidence);assert.equal(calls,1);assert.equal(result.length,1);assert.equal(result[0].quality?.visual?.criteria?.length,4);}finally{globalThis.fetch=native;}
});

test("a focused reassessment cannot fail the unseen global checklist",async()=>{
 const outline=demoOutline(input),candidates=Object.fromEntries(outline.map((item,i)=>[i,demoCandidates(input,item)]));
 const deck={id:"focus-scope",input,outline,candidates,picked:{},edited:{},designSystem:forest,research:[],chat:{setup:[],outline:[],slides:{}},demo:false} as Deck;
 const native=fetch;globalThis.fetch=async()=>Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({checklist:[{id:"unseen-cover",passed:false,reason:"표지 본문을 받지 못했습니다"}],issues:[],summary:"일부 장 검토"})}]}]});
 try{const result=await assessDeck({provider:"openai",key:"test-only",model:"mock"},deck,[2]);assert.deepEqual(result.checklist,[]);}finally{globalThis.fetch=native;}
});

test("explicit selection-first runs defer source review without reporting a pass",async()=>{
 const evidence=[{id:"1",kind:"공개 사실",title:"공식 자료",claim:"조건",url:"https://example.org/source",checkedAt:"2026-11-13",contextMatch:"일치"}] as Evidence[];
 const item={index:5,section:"출처",message:"원문 자료",contentHint:"",role:"근거" as const};
 const native=fetch;globalThis.fetch=async()=>{throw Error("선택 전 모델 검수 호출 금지");};
 try{const result=await generateCandidates({provider:"openai",key:"test-only",model:"mock"},{...input,appendSources:true},item,[],"",[],false,[item],"",0,[],[],undefined,evidence,[],{visualReviewTiming:"after-selection"});assert.equal(result[0].quality?.visual?.status,"disabled");assert.equal(editorialCoverage(result.map(s=>s.quality?.visual)).unchecked,1);}finally{globalThis.fetch=native;}
});
