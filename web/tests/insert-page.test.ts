import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {insertDraftPage,pageNeighborContext} from "../src/lib/insert-page";
import {demoOutline,demoCandidates,sampleData} from "../src/lib/demo";
import {applyPrimaryDraft,draftProgress} from "../src/lib/draft-workflow";
import {forest} from "../src/lib/design";
import {persistedDeckSchema,type Deck,type LayoutId,MAX_DECK_SLIDES} from "../src/lib/model";
import {POST} from "../src/app/api/[...action]/route";
import {exportDeck} from "../src/lib/export";
function fixture(count=6):Deck{const input={topic:"페이지 추가 검증",purpose:"제안",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:count};let d:Deck={id:"insertion-test",input,designSystem:forest,outline:demoOutline(input),research:[],chat:{setup:[],outline:[],slides:{}},candidates:{},picked:{},edited:{},candidateRounds:{},demo:true};for(let i=0;i<count;i++)d=applyPrimaryDraft(d,i,demoCandidates(input,d.outline[i],[],i===0?1:0,1)[0]);return d;}
const addition={message:"고객 여정에서 정보 전달의 조건을 검토합니다",section:"고객 분석",contentHint:"기존 기록과 앞뒤 장의 근거를 연결합니다"};
test("middle insertion shifts slide-bound content, choices, edits, chat and generation history together",()=>{
  const d=fixture();d.edited[3]={...d.candidates[3][0],headline:"직접 수정한 기존 장"};d.chat.slides[3]=[{role:"user",text:"이 장의 수정 요청",createdAt:"test"}];d.candidateRounds![3]=4;const before=JSON.stringify(d);
  const next=insertDraftPage(d,3,addition);assert.equal(next.outline.length,7);assert.equal(next.input.slideCount,7);assert.equal(next.outline[3].message,addition.message);assert.deepEqual(next.outline.map(o=>o.index),[0,1,2,3,4,5,6]);
  assert.strictEqual(next.candidates[4],d.candidates[3]);assert.strictEqual(next.edited[4],d.edited[3]);assert.strictEqual(next.chat.slides[4],d.chat.slides[3]);assert.equal(next.candidateRounds![4],4);assert.equal(next.picked[4],d.picked[3]);assert.equal(next.candidates[3],undefined);assert.strictEqual(next.candidates[2],d.candidates[2]);assert.equal(JSON.stringify(d),before);
});
test("only the inserted slot is missing and filling it leaves previous pages unchanged",()=>{
  const d=fixture(),next=insertDraftPage(d,2,addition);assert.deepEqual(draftProgress(next),{ready:6,total:7,complete:false});
  const complete=applyPrimaryDraft(next,2,demoCandidates(next.input,next.outline[2],[],0,1)[0]);assert.equal(draftProgress(complete).complete,true);assert.equal(complete.candidates[2].length,1);for(let i=0;i<d.outline.length;i++)assert.strictEqual(complete.candidates[i<2?i:i+1],d.candidates[i]);
});
test("neighbors use the edited current content, not just old outline labels",()=>{
  const d=fixture();d.edited[2]={...d.candidates[2][0],headline:"앞 장의 실제 수정 제목"};d.edited[3]={...d.candidates[3][0],headline:"뒤 장의 실제 수정 제목"};const next=insertDraftPage(d,3,addition);const context=pageNeighborContext(next,3);assert.equal(context.previous?.message,"앞 장의 실제 수정 제목");assert.equal(context.next?.message,"뒤 장의 실제 수정 제목");assert.equal(pageNeighborContext(next,6).next,null);
});
test("insertion validates key messages and positions and supports up to thirty pages",()=>{
  const d=fixture();for(const position of [0,-1,7,1.5])assert.throws(()=>insertDraftPage(d,position,addition));assert.throws(()=>insertDraftPage(d,2,{...addition,message:"   "}));assert.throws(()=>insertDraftPage(d,2,{...addition,section:"너무 긴 섹션 이름을 입력"}));assert.equal(insertDraftPage(d,6,addition).outline[6].message,addition.message);
  const longer=insertDraftPage(fixture(12),6,addition);assert.equal(longer.outline.length,13);assert.ok(persistedDeckSchema.safeParse(longer).success);assert.throws(()=>insertDraftPage(fixture(MAX_DECK_SLIDES),1,addition));
});
test("a thirteen-page context generates just the inserted page and exports all pages",async()=>{
  const d=insertDraftPage(fixture(12),6,addition);const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(_url,init)=>{calls++;const prompt=JSON.parse(JSON.parse(String(init?.body)).input);assert.equal(prompt.count,1);assert.equal(prompt.narrativeContext.sequence.length,13);assert.equal(prompt.narrativeContext.previous.index,5);assert.equal(prompt.narrativeContext.next.index,7);const id=prompt.slotPlan[0].layoutId as LayoutId;return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({slides:[{layoutId:id,section:addition.section,headline:addition.message,dataJson:JSON.stringify(sampleData(id,d.outline[6])),sourceUrls:[],notes:"삽입 페이지 대체 응답 검증"}]})}]}]});};
  let complete=d;
  try{const response=await POST(new Request("http://localhost:3100/api/candidates/regenerate",{method:"POST",headers:{"content-type":"application/json","x-user-api-key":"test-only"},body:JSON.stringify({input:d.input,item:d.outline[6],outline:d.outline,provider:"openai",model:"test"})}),{params:Promise.resolve({action:["candidates","regenerate"]})});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,1);complete=applyPrimaryDraft(d,6,result.candidates[0]);}finally{globalThis.fetch=original;}
  const pptx=await exportDeck(complete,false);const zip=await JSZip.loadAsync(await pptx.write({outputType:"nodebuffer"}) as Buffer);assert.equal(Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).length,13);
});
