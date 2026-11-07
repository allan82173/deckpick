import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { expandedKinds,expandedIds,expandedRegistry,expandedSchemas,scenarioDays,dateRange } from "../src/lib/expanded-layouts";
import { expandedSample } from "../src/lib/expanded-samples";
import { layoutIds,slideSchema,dataSchemas,type Deck,type LayoutId,type SlideSpec } from "../src/lib/model";
import { makeScene,SLIDE } from "../src/lib/scene";
import { forest,design } from "../src/lib/design";
import { roleLayouts } from "../src/lib/slide-quality";
import { candidatePlan } from "../src/lib/candidate-plan";
import { exportDeck } from "../src/lib/export";
import { validateNativeChart,waterfallSeries,chartPreviewDataUrl } from "../src/lib/native-charts";
const input={topic:"유형 확장 합성 검증",purpose:"범용 배치",slideCount:7,deckType:"consulting" as const,designSystemId:"ict-forest" as const};
function fixture(id:LayoutId,v=0):SlideSpec{return slideSchema.parse({layoutId:id,section:"검증",headline:"같은 근거를 다른 구조로 설명합니다.",data:expandedSample(id,v),sources:[]});}
function deckFor(slides:SlideSpec[]):Deck{return {id:"qa",input,designSystem:forest,outline:slides.map((s,index)=>({index,section:s.section,message:s.headline,contentHint:""})),candidates:Object.fromEntries(slides.map((s,i)=>[i,[s]])),picked:Object.fromEntries(slides.map((_,i)=>[i,0])),edited:{},chat:{setup:[],outline:[],slides:{}},research:[],demo:true};}
test("23 physical types are registered for both deck kinds, with role and minimum-data guidance",()=>{
 assert.equal(expandedKinds.length,23);assert.equal(expandedIds.length,46);assert.equal(layoutIds.length,95);
 for(const k of expandedKinds){const meta=expandedRegistry[k];assert.ok(meta.name&&meta.use&&meta.avoid&&meta.minimum&&meta.roles.length);for(const p of ["c","m"])assert.ok(layoutIds.includes(`${p}-${k}` as LayoutId));}
});
test("two distinct datasets per new type validate and render in bounds without text warnings",()=>{
 for(const k of expandedKinds)for(const v of [0,1]){const slide=fixture(`${v?"m":"c"}-${k}` as LayoutId,v),scene=makeScene(slide,forest);assert.deepEqual(scene.warnings,[],slide.layoutId);for(const n of scene.nodes){assert.ok(n.x>=0&&n.y>=0&&n.w>=0&&n.h>=0,slide.layoutId);assert.ok(n.x+n.w<=SLIDE.w+.01&&n.y+n.h<=SLIDE.h+.01,slide.layoutId);}}
});
test("empty or over-capacity data fails instead of rendering a blank input form",()=>{
 for(const id of expandedIds){assert.equal(dataSchemas[id].safeParse({}).success,false);assert.throws(()=>makeScene({layoutId:id,headline:"빈 자료",section:"검증",data:{},sources:[]},forest));}
 const d=expandedSample("c-evaluation-matrix")!;const rows=d.rows as unknown[];assert.equal(expandedSchemas["evaluation-matrix"].safeParse({...d,rows:Array(9).fill(rows[0])}).success,false);
});
test("matrix cell counts, highlights, and survey source requirements are enforced",()=>{
 const d=expandedSample("c-cross-matrix")!;assert.equal(expandedSchemas["cross-matrix"].safeParse({...d,highlights:[{row:100,col:0}]}).success,false);
 const survey=expandedSample("c-survey-findings")!;const {sampleSize:_,...noSample}=survey;assert.equal(expandedSchemas["survey-findings"].safeParse(noSample).success,false);assert.equal(expandedSchemas["survey-findings"].safeParse({...survey,period:""}).success,false);
});
test("real survey personas need evidence and missing screenshot assets fail",()=>{
 const p=expandedSample("c-persona-cards")!;assert.equal(expandedSchemas["persona-cards"].safeParse({...p,basis:"실제 조사",evidenceIds:[]}).success,false);
 const s=expandedSample("c-screenshot-notes")!;assert.equal(expandedSchemas["screenshot-notes"].safeParse({...s,imageSrc:"https://example.com/private"}).success,false);assert.equal(expandedSchemas["screenshot-notes"].safeParse({...s,imageSrc:""}).success,false);
 const scene=makeScene(fixture("c-persona-cards"),forest);assert.ok(scene.nodes.some(n=>n.kind==="text"&&n.text==="가상 페르소나"));
});
test("timeline dates are real ISO dates and scenario results come from inclusive nonoverlapping periods",()=>{
 assert.deepEqual(scenarioDays("2027-01-01","2027-01-31",[{start:"2027-01-01",end:"2027-01-10"},{start:"2027-01-21",end:"2027-01-28"}]),{total:31,occupied:18,vacant:13});
 const d=expandedSample("c-scenario-gantt")!;assert.equal(expandedSchemas["scenario-gantt"].safeParse({...d,start:"2027-02-30"}).success,false);
 const t=expandedSchemas["date-timeline"].parse(expandedSample("c-date-timeline"));assert.deepEqual(dateRange(t),{start:"2027-01-01",end:"2027-01-18"});
});
test("one-lane journey retains the existing scene exactly when optional additions are absent",()=>{
 const cell={action:"조건을 비교합니다",touchpoint:"가상 접점",friction:"같은 정보가 필요합니다"};const stages=["발견","비교","선택"],data={stages,lanes:[{name:"한 고객군",cells:stages.map(()=>cell)}],focus:0,takeaway:"조건을 같은 기준으로 비교합니다."};
 const next:SlideSpec={layoutId:"c-journey-lanes",section:"여정",headline:"조건을 비교합니다.",sources:[],data};const old:SlideSpec={...next,layoutId:"c-journey",data:{stages:stages.map(title=>({title,...cell})),focus:0,takeaway:data.takeaway}};assert.deepEqual(makeScene(next,forest),makeScene(old,forest));
});
test("all previous 49 rendered scenes remain unchanged",async()=>{
 const b=JSON.parse(await readFile("tests/fixtures/legacy-layout-scenes.json","utf8"));for(const [i,r] of b.rows.entries()){const scene=makeScene(r.slide,design(b.input.designSystemId),i+1,b.input.topic,b.outline.map((o:{section:string})=>o.section));assert.equal(createHash("sha256").update(JSON.stringify(scene)).digest("hex"),r.hash,r.id);}
});
test("existing PPTX slide XML stays unchanged for all previous layouts",async()=>{
 const b=JSON.parse(await readFile("tests/fixtures/legacy-layout-scenes.json","utf8"));const d=deckFor(b.rows.map((r:{slide:SlideSpec})=>r.slide));d.input=b.input;d.outline=b.outline;
 const before:Record<string,string>=JSON.parse(await readFile("tests/fixtures/legacy-layout-pptx-slides.json","utf8")),after=await JSZip.loadAsync(await(await exportDeck(d,false)).write({outputType:"nodebuffer"}) as Buffer);
 for(let i=1;i<=b.rows.length;i++){const name=`ppt/slides/slide${i}.xml`;assert.equal(await after.file(name)!.async("string"),before[name],name);}
});
test("native charts contain c:chart and embedded editable workbooks, without raster chart pictures",async()=>{
 const slides=["c-multi-bar","c-line-chart","c-waterfall","c-composition-donut","c-horizontal-formula"].map(id=>fixture(id as LayoutId));
 const zip=await JSZip.loadAsync(await(await exportDeck(deckFor(slides),false)).write({outputType:"nodebuffer"}) as Buffer);
 assert.equal(Object.keys(zip.files).filter(f=>/^ppt\/charts\/chart\d+\.xml$/.test(f)).length,5);assert.equal(Object.keys(zip.files).filter(f=>f.startsWith("ppt/embeddings/")&&f.endsWith(".xlsx")).length,5);
 for(let i=1;i<=5;i++){const xml=await zip.file(`ppt/slides/slide${i}.xml`)!.async("string");assert.ok(xml.includes("c:chart"));assert.ok(!xml.includes("<p:pic>"));const chart=await zip.file(`ppt/charts/chart${i}.xml`)!.async("string");assert.ok(chart.includes("Pretendard"));if(i===3){assert.ok(chart.includes('<c:dLblPos val="ctr"/>'));assert.ok(!chart.includes('<c:dLblPos val="outEnd"/>'));}}
});
test("waterfall floating series handles zero crossing and chart input never fabricates missing numbers",()=>{
 const d={kind:"waterfall" as const,categories:["시작","감소","증가","끝"],series:[{name:"합성",values:[5,-12,10,3]}],unit:"건"};const s=waterfallSeries(d);assert.equal(s.length,8);assert.equal(s[6].values[1],5);assert.equal(s[7].values[1],-7);assert.equal(s[4].values[2],3);assert.equal(s[5].values[2],-7);
 assert.throws(()=>validateNativeChart({...d,series:[{name:"오류",values:[5,6]}]}));assert.throws(()=>validateNativeChart({...d,series:[{name:"오류",values:[5,-12,10,4]}]}));
 assert.ok(chartPreviewDataUrl(d,forest.colors).startsWith("data:image/svg+xml"));
});
test("new role mappings offer judgment and numerical types with three distinct structures",()=>{
 for(const deckType of ["consulting","marketing"] as const){const ids=roleLayouts(deckType,"판단");assert.ok(ids.some(id=>id.endsWith("judgment-reversal")));const plan=candidatePlan({...input,deckType},{index:2,section:"판단",message:"조건에 맞는 후보가 우선입니다.",contentHint:"",role:"판단"});assert.equal(new Set(plan).size,3);assert.ok(plan.every(id=>ids.includes(id)));}
});
