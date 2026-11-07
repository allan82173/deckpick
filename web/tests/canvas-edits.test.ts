import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {makeScene} from "../src/lib/scene";
import {sceneNodeKey,canvasHeadline} from "../src/lib/canvas-edits";
import {forest} from "../src/lib/design";
import {sampleData,demoOutline} from "../src/lib/demo";
import {persistedDeckSchema,slideSchema,type SlideSpec,type Deck} from "../src/lib/model";
import {exportDeck} from "../src/lib/export";
const slide:SlideSpec={layoutId:"c-header-boxes",headline:"기존 제목",section:"현황",data:sampleData("c-header-boxes",{index:0,section:"현황",message:"기존 제목",contentHint:"내용"}),sources:[]};
function fixture(){const input={topic:"캔버스 편집 검증",purpose:"제안",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:5};const outline=demoOutline(input);const deck:Deck={id:"canvas-test",input,outline,designSystem:forest,research:[],chat:{setup:[],outline:[],slides:{}},candidates:{},picked:{},edited:{},demo:true};for(let i=0;i<5;i++){deck.candidates[i]=[slide];deck.picked[i]=0;}return deck;}
test("canvas text and geometry survive persisted deck parsing and export to native PPTX elements",async()=>{
  const nodes=makeScene(slide,forest).nodes;
  const index=nodes.findIndex(n=>n.kind==="text"&&n.text===slide.headline);
  const key=sceneNodeKey(nodes[index],index);
  const edited={...slide,canvasEdits:{[key]:{text:"새로 수정한 제목",color:"#123456",x:1,size:27,bold:true}}};
  const deck=fixture();deck.edited[0]=edited;
  const loaded=persistedDeckSchema.parse(JSON.parse(JSON.stringify(deck))) as Deck;
  assert.deepEqual(loaded.edited[0].canvasEdits,edited.canvasEdits);
  assert.equal(canvasHeadline(loaded.edited[0]),"새로 수정한 제목");assert.equal(slideSchema.safeParse(edited).success,true);
  const changed=makeScene(loaded.edited[0],forest).nodes[index];assert.equal(changed.kind,"text");if(changed.kind==="text"){assert.equal(changed.text,"새로 수정한 제목");assert.equal(changed.color,"#123456");assert.equal(changed.x,1);}
  const result=await exportDeck(loaded,false);const zip=await JSZip.loadAsync(await result.write({outputType:"arraybuffer"}) as ArrayBuffer);const xml=await zip.file("ppt/slides/slide1.xml")!.async("string");assert.match(xml,/새로 수정한 제목/);assert.match(xml,/123456/);assert.doesNotMatch(await zip.file("ppt/slides/slide2.xml")!.async("string"),/새로 수정한 제목/);
});
test("text edit stays attached when navigation section count changes",()=>{
  const before=makeScene(slide,forest,3,"덱",["현황","문제"]).nodes;const i=before.findIndex(n=>n.kind==="text"&&n.text===slide.headline);const edited={...slide,canvasEdits:{[sceneNodeKey(before[i],i)]:{text:"보존될 제목"}}};
  assert.ok(makeScene(edited,forest,4,"덱",["현황","추가","문제"]).nodes.some(n=>n.kind==="text"&&n.text==="보존될 제목"));
});
test("invalid styles are rejected and canvas bounds stay positive",()=>{
  assert.equal(slideSchema.safeParse({...slide,canvasEdits:{bad:{color:"url(secret)"}}}).success,false);
  const nodes=makeScene(slide,forest).nodes;const i=nodes.findIndex(n=>n.kind==="rect");const next=makeScene({...slide,canvasEdits:{[sceneNodeKey(nodes[i],i)]:{x:13.333333,y:7.5,w:12,h:6,fill:"#112233"}}},forest).nodes[i];assert.ok(next.w>0&&next.h>0);assert.ok(next.x+next.w<=13.333334);
});
