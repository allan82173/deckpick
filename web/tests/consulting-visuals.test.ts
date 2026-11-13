import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {fixtures} from "../scripts/render-consulting-visual-fixtures";
import {consultingVisualSchemas} from "../src/lib/consulting-visuals";
import {slideSchema,type Deck} from "../src/lib/model";
import {forest} from "../src/lib/design";
import {makeScene} from "../src/lib/scene";
import {exportDeck} from "../src/lib/export";
import {validateNativeChart} from "../src/lib/native-charts";

test("six message relationships render from two unrelated inputs without geometry warnings",()=>{
 const slides=fixtures();assert.equal(slides.length,12);assert.equal(new Set(slides.map(s=>s.layoutId)).size,6);
 for(const slide of slides){assert.equal(slideSchema.safeParse(slide).success,true);const scene=makeScene(slide,forest);assert.deepEqual(scene.warnings,[]);assert.ok(scene.nodes.length>=(slide.layoutId.endsWith('end-divider')?4:6));assert.ok(scene.nodes.every(n=>n.x>=0&&n.x+n.w<=13.34&&n.y>=0&&n.y+n.h<=7.51));}
});
test("share comparisons reject a mixed or incomplete percent denominator and retain original data",()=>{
 const slide=fixtures()[2],original=structuredClone(slide.data);makeScene(slide,forest);assert.deepEqual(slide.data,original);
 const invalid=structuredClone(slide.data) as any;invalid.panels[0].items[0].value=10;assert.equal(consultingVisualSchemas["share-comparison"].safeParse(invalid).success,false);
 assert.throws(()=>validateNativeChart({kind:"pie",categories:["A","B"],series:[{name:"관측",values:[35,25]}],unit:"%"}),/100/);
});
test("one source denominator remains one circle without inventing another group or residual category",()=>{
 const slide=fixtures()[2],data=structuredClone(slide.data) as any;data.panels=data.panels.slice(0,1);const single=slideSchema.parse({...slide,data}),scene=makeScene(single,forest);
 assert.equal(scene.nodes.filter(n=>n.kind==="image"&&n.chart?.kind==="pie").length,1);assert.deepEqual(scene.warnings,[]);assert.equal((single.data as any).panels.length,1);assert.equal((single.data as any).panels[0].items.length,2);
});
test("an agenda is a numbered rail, priority has a visible first step, and spotlight preserves its comparison",()=>{
 const [agenda,priority,,,spotlight]=fixtures();const a=makeScene(agenda,forest),p=makeScene(priority,forest),s=makeScene(spotlight,forest);
 assert.equal(a.nodes.filter(n=>n.kind==="ellipse").length,4);assert.ok(a.nodes.some(n=>n.kind==="line"&&n.w>10));
 assert.ok(p.nodes.some(n=>n.kind==="rect"&&n.fill===forest.colors.primary&&n.w>5));
 assert.equal(s.nodes.filter(n=>n.kind==="rect"&&n.opacity===.67).length,2);
 for(const option of (spotlight.data as any).options)assert.ok(s.nodes.some(n=>n.kind==="text"&&n.text===option.finding));
});
test("all charts remain native editable pie/line and the emphasis mask is a native transparent fill",async()=>{
 const slides=fixtures(),deck:Deck={id:"visual-test",input:{topic:"관계 가시화",purpose:"합성 검증",deckType:"consulting",designSystemId:"ict-forest",slideCount:12},designSystem:forest,outline:slides.map((s,index)=>({index,section:s.section,message:s.headline,contentHint:""})),research:[],candidates:Object.fromEntries(slides.map((s,index)=>[index,[s]])),picked:Object.fromEntries(slides.map((_,index)=>[index,0])),edited:{},chat:{setup:[],outline:[],slides:{}},demo:true};
 const pptx=await exportDeck(deck,false),zip=await JSZip.loadAsync(await pptx.write({outputType:"nodebuffer"}) as Buffer),files=Object.keys(zip.files),charts=await Promise.all(files.filter(n=>/^ppt\/charts\/chart\d+\.xml$/.test(n)).map(n=>zip.file(n)!.async("string")));
 assert.equal(charts.filter(x=>x.includes("<c:pieChart>")).length,5);assert.equal(charts.filter(x=>x.includes("<c:lineChart>")).length,1);
 const slide5=await zip.file("ppt/slides/slide5.xml")!.async("string");assert.ok(slide5.includes('alpha val="67000"'));assert.ok(!slide5.includes("<p:pic>"));
 assert.equal(files.filter(n=>/^ppt\/embeddings\/.*\.xlsx$/.test(n)).length,6);
 for(const name of files.filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)))assert.doesNotMatch(await zip.file(name)!.async("string"),/<a:ext[^>]*(?:cx|cy)="-/);
});
