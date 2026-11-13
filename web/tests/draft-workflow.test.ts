import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {DraftCandidateSidebar} from "../src/components/draft-candidate-sidebar";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import JSZip from "jszip";
import {draftSlide,applyDraftCandidates,draftNeedsCandidates,initializeDraftSelections,applyPrimaryDraft,appendDraftAlternative,draftProgress,sameDraftContext,selectDraftAlternative} from "../src/lib/draft-workflow";
import {demoOutline,demoCandidates} from "../src/lib/demo";
import {forest} from "../src/lib/design";
import {exportDeck} from "../src/lib/export";
import type {Deck} from "../src/lib/model";
function fixture():Deck {const input={topic:"발표 검토",purpose:"테스트",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:6};return {id:"draft-workflow",input,designSystem:forest,outline:demoOutline(input),research:[],chat:{setup:[],outline:[],slides:{}},candidates:{},picked:{},edited:{},demo:true};}
test("sidebar switching preserves each candidate's manual edits and leaves other slides alone",()=>{
  const d=fixture();d.candidates[2]=demoCandidates(d.input,d.outline[2]);d.picked[2]=0;d.edited[2]={...d.candidates[2][0],headline:"수정된 A",canvasEdits:{sample:{text:"직접 수정"}}};d.candidates[3]=demoCandidates(d.input,d.outline[3]);d.picked[3]=1;
  const next=selectDraftAlternative(d,2,1);assert.equal(next.picked[2],1);assert.equal(next.edited[2],undefined);assert.equal(next.candidates[2][0].headline,"수정된 A");assert.strictEqual(next.candidates[3],d.candidates[3]);assert.equal(next.picked[3],1);
  const back=selectDraftAlternative({...next,edited:{2:{...next.candidates[2][1],headline:"수정된 B"}}},2,0);assert.equal(draftSlide(back,2)?.headline,"수정된 A");assert.equal(back.candidates[2][1].headline,"수정된 B");assert.equal(d.edited[2].headline,"수정된 A");assert.strictEqual(selectDraftAlternative(back,2,9),back);
});
test("a complete deck needs only one filled primary per page and no manual layout selection",()=>{
  let deck=fixture();
  for(let i=0;i<deck.outline.length;i++)deck=applyPrimaryDraft(deck,i,demoCandidates(deck.input,deck.outline[i],[],i===0?1:0,1)[0]);
  assert.deepEqual(draftProgress(deck),{ready:6,total:6,complete:true});
  assert.ok(deck.outline.every((_,i)=>deck.candidates[i].length===1&&deck.picked[i]===0&&draftSlide(deck,i)));
});
test("legacy choices and manual edits are preserved; only missing choices are initialized",()=>{
  const d=fixture();d.candidates[0]=demoCandidates(d.input,d.outline[0]);d.picked[0]=2;d.edited[0]={...d.candidates[0][2],headline:"직접 고친 제목"};d.candidates[1]=demoCandidates(d.input,d.outline[1]);
  const next=initializeDraftSelections(d);assert.equal(next.picked[0],2);assert.strictEqual(next.edited[0],d.edited[0]);assert.equal(next.picked[1],0);assert.equal(d.picked[1],undefined);
  assert.strictEqual(applyPrimaryDraft(next,0,d.candidates[0][0]).edited[0],d.edited[0]);
});
test("on-demand alternatives append without changing the current draft or other pages",()=>{
  let d=fixture();d=applyPrimaryDraft(d,2,demoCandidates(d.input,d.outline[2],[],0,1)[0]);d.edited[2]={...d.candidates[2][0],headline:"사용자가 수정한 핵심 메시지"};
  const old=draftSlide(d,2),other=d.candidates[1];const first=demoCandidates(d.input,d.outline[2],d.candidates[2].map(s=>s.layoutId),1,1)[0];const next=appendDraftAlternative(d,2,first);
  assert.equal(next.candidates[2].length,2);assert.equal(next.picked[2],0);assert.strictEqual(draftSlide(next,2),old);assert.strictEqual(next.candidates[1],other);assert.throws(()=>appendDraftAlternative(next,2,first));
});
test("unfinished manual edits survive and partial drafts can be resumed without overwriting completed pages",()=>{
  let d=fixture();const primary=demoCandidates(d.input,d.outline[1],[],0,1)[0];d=applyPrimaryDraft(d,1,primary);d.edited[1]={...primary,headline:""};
  const next=applyPrimaryDraft(d,1,primary);assert.equal(next.edited[1].headline,"");assert.equal(draftProgress(next).complete,false);
  const completed=draftSlide(next,1);const resumed=applyPrimaryDraft(next,2,demoCandidates(d.input,d.outline[2],[],0,1)[0]);assert.strictEqual(draftSlide(resumed,1),completed);assert.equal(resumed.candidates[2].length,1);
  assert.equal(sameDraftContext(d,{...d,outline:d.outline.map((o,i)=>i===1?{...o,message:"바뀐 목차"}:o)}),false);
});
test("the automatic primary selection exports a full editable deck before reviewing any alternatives",async()=>{
  let d=fixture();for(let i=0;i<d.outline.length;i++)d=applyPrimaryDraft(d,i,demoCandidates(d.input,d.outline[i],[],i===0?1:0,1)[0]);
  const pptx=await exportDeck(d,false);const bytes=await pptx.write({outputType:"nodebuffer"}) as Buffer;const zip=await JSZip.loadAsync(bytes);const pages=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p));assert.equal(pages.length,6);for(const page of pages)assert.ok((await zip.file(page)!.async("string")).includes("<a:t>"));
  await mkdir("output",{recursive:true});await writeFile("output/full-draft-workflow-validation.pptx",bytes);
});

test("initial candidate batch is available without a load click and preserves existing manual edits",()=>{
 const d=fixture(),options=demoCandidates(d.input,d.outline[0]);
 assert.equal(options.length,3);
 const initial=applyDraftCandidates(d,0,options);assert.equal(initial.candidates[0].length,3);assert.equal(initial.picked[0],0);assert.equal(draftNeedsCandidates(initial,0),false);
 const legacy={...d,candidates:{0:[options[0]]},picked:{0:0},edited:{0:{...options[0],headline:"직접 편집 유지"}}};
 assert.equal(draftNeedsCandidates(legacy,0),true);
 const filled=applyDraftCandidates(legacy,0,options);assert.equal(filled.candidates[0].length,3);assert.equal(filled.edited[0].headline,"직접 편집 유지");assert.equal(filled.picked[0],0);assert.equal(d.candidates[0],undefined);
});

test("initial sidebar renders three populated candidates without asking to load them",()=>{
 const d=fixture();const deck=applyDraftCandidates(d,0,demoCandidates(d.input,d.outline[0]));
 const html=renderToStaticMarkup(createElement(DraftCandidateSidebar,{deck,index:0,busy:false,disabled:false,onLoad:()=>{},onSelect:()=>{},onCompare:()=>{}}));
 assert.equal((html.match(/aria-label="1번 장 후보 /g)??[]).length,3);
 assert.doesNotMatch(html,/초안과 함께 준비할 후보입니다/);
});

test("rejected third slot is not regenerated after saving and restoring two valid choices",()=>{
 const d=fixture(),options=demoCandidates(d.input,d.outline[0]).slice(0,2).map(s=>({...s,quality:{warnings:[],fillRatio:1,attempts:2,suitableCandidateCount:2,excludedCandidates:["순위 막대 제외"]}}));
 const next=applyDraftCandidates(d,0,options),restored=JSON.parse(JSON.stringify(next));
 assert.equal(next.candidates[0].length,2);assert.equal(draftNeedsCandidates(restored,0),false);assert.equal(sameDraftContext(d,next),true);
 const html=renderToStaticMarkup(createElement(DraftCandidateSidebar,{deck:restored,index:0,busy:false,disabled:false,onLoad:()=>{},onSelect:()=>{},onCompare:()=>{}}));
 assert.equal((html.match(/aria-label="1번 장 후보 /g)??[]).length,2);
});
