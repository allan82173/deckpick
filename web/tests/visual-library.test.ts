import test from "node:test";
import assert from "node:assert/strict";
import { visualIds } from "../src/lib/visual-model";
import { bodyLayouts,layoutGroups,layoutGroup } from "../src/lib/layout-catalog";
import { sampleData,demoCandidates } from "../src/lib/demo";
import { candidatePlan,replaceCandidate } from "../src/lib/candidate-plan";
import { slideSchema,validateCandidates,type DeckInput,type Deck } from "../src/lib/model";
import { makeScene } from "../src/lib/scene";
import { forest } from "../src/lib/design";
import { POST } from "../src/app/api/[...action]/route";
const input:DeckInput={topic:"고객 경험 검토",purpose:"제안",deckType:"consulting",slideCount:6,designSystemId:"ict-forest"};
const item={index:2,section:"현황",message:"고객이 구매 접점에서 이탈하는 과정을 살펴봅니다",contentHint:"고객 여정"};
test("both deck types expose all six families and nine new visual structures",()=>{
  assert.equal(visualIds.length,18);
  for(const deckType of ["consulting","marketing"] as const){const ids=bodyLayouts({deckType});assert.equal(new Set(ids.map(layoutGroup)).size,layoutGroups.length);assert.ok(visualIds.filter(id=>id.startsWith(deckType==="consulting"?"c-":"m-")).every(id=>ids.includes(id)));assert.ok(!ids.some(id=>id.endsWith("cover")));}
});
test("new structures validate and fit preview bounds without text overflow",()=>{
  for(const id of visualIds){const s=slideSchema.parse({layoutId:id,section:item.section,headline:item.message,data:sampleData(id,item),sources:[]});const scene=makeScene(s,forest);assert.deepEqual(scene.warnings,[],id);for(const n of scene.nodes)assert.ok(n.x>=0&&n.y>=0&&n.x+n.w<=13.343&&n.y+n.h<=7.51,id);}
});
test("content relationship takes precedence over generic section labels",()=>{
  assert.equal(candidatePlan(input,item)[0],"c-journey");
  assert.ok(!candidatePlan(input,{...item,message:"데이터 연결 레이어의 시스템 구조를 제안합니다",contentHint:""}).includes("c-system-flow"),"system-flow is excluded from automatic candidates after the stage 4 human scores");
  assert.equal(candidatePlan({...input,deckType:"marketing"},item)[0],"m-journey");
});
test("explicit layout replaces one card while preserving other selections and edits",()=>{
  const previous=demoCandidates(input,item);
  const deck:Deck={id:"library-test",input,designSystem:forest,outline:[item],research:[],chat:{setup:[],outline:[],slides:{}},candidates:{2:previous},picked:{2:1},edited:{2:previous[1]},demo:true};
  const s=demoCandidates(input,item,previous.map(p=>p.layoutId),1,1,[],"c-system-compare")[0];
  const result=replaceCandidate(deck,2,0,s);assert.equal(result.candidates[2][0].layoutId,"c-system-compare");assert.strictEqual(result.candidates[2][1],previous[1]);assert.strictEqual(result.edited[2],previous[1]);assert.equal(result.picked[2],1);
  assert.throws(()=>candidatePlan(input,item,[],0,1,"m-system-flow"));assert.throws(()=>candidatePlan(input,{...item,index:0},[],0,1,"c-system-flow"));
});
test("trend schema rejects invalid numbers and measured trends require traceable evidence",()=>{
  const data=sampleData("c-trend",item),base={layoutId:"c-trend",section:item.section,headline:item.message,data,sources:[]};
  assert.ok(slideSchema.safeParse(base).success);
  assert.ok(!slideSchema.safeParse({...base,data:{...data,points:[{period:"1",value:-2},{period:"2",value:3},{period:"3",value:4}]}}).success);
  assert.throws(()=>validateCandidates([{...base,data:{...data,mode:"observed"}}],input,[]));
  assert.equal(validateCandidates([{...base,data:{...data,mode:"observed"},notes:"첨부 월별실적.csv 2~5행"}],input,[]).length,1);
});
test("API single-candidate request honors chosen library layout",async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(_url,init)=>{calls++;const prompt=JSON.parse(JSON.parse(String(init?.body)).input);assert.equal(prompt.count,1);assert.equal(prompt.slotPlan[0].layoutId,"c-system-compare");return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({slides:[{layoutId:"c-system-compare",section:item.section,headline:item.message,dataJson:JSON.stringify(sampleData("c-system-compare",item)),sourceUrls:[],notes:"대체 응답"}]})}]}]});};
  try {const r=await POST(new Request("http://localhost:3100/api/candidates/regenerate",{method:"POST",headers:{"content-type":"application/json","x-user-api-key":"test-only"},body:JSON.stringify({input,item,provider:"openai",model:"test",requestedLayout:"c-system-compare"})}),{params:Promise.resolve({action:["candidates","regenerate"]})});const json=await r.json();assert.equal(r.status,200,JSON.stringify(json));assert.equal(json.candidates[0].layoutId,"c-system-compare");assert.equal(calls,1);} finally {globalThis.fetch=original;}
});

