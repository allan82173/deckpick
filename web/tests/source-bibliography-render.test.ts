import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {makeScene,richLines,type TextNode} from "../src/lib/scene";
import {sourceBibliography} from "../src/lib/source-bibliography";
import {forest} from "../src/lib/design";
import {exportDeck} from "../src/lib/export";
import type {Deck,SlideSpec} from "../src/lib/model";
import type {Evidence} from "../src/lib/evidence-model";

const input={topic:"원문 목록 합성 렌더 검증",purpose:"출처 가독성",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:5,appendSources:true};
const item={index:4,section:"출처",message:"검토 자료",contentHint:"",role:"근거" as const};
function sourceSlide(count:number,long=true):SlideSpec{
 const evidence=Array.from({length:count},(_,index)=>({id:String(index+1),kind:"공개 사실",claim:"합성 검증 자료이며 실제 분석이 아닙니다.",title:long?`${index+1}번 공개 자료 제목 Public Evidence Review ${"긴 자료 제목과 판정 범위를 보존하는 병기된 제목 International Evidence Assessment ".repeat(4)}`.slice(0,240):`공식 자료 ${index+1}`,url:`https://example.org/source-${index+1}`,checkedAt:"2026-11-13T09:12:34.567Z",contextMatch:"일치",originalVerified:true})) as Evidence[];
 const slide=sourceBibliography(input,item,evidence)!;
 // Also cover older stored variants that still contain the full ISO timestamp.
 (slide.data.rows as {dateLabel:string}[]).forEach(row=>{row.dateLabel="확인 2026-11-13T09:12:34.567Z";});
 return slide;
}
test("fourteen long bilingual bibliography titles fit two columns without shrinking below 10pt",()=>{
 const slide=sourceSlide(14),before=structuredClone(slide),scene=makeScene(slide,forest),body=scene.nodes.filter((node):node is TextNode=>node.kind==="text"&&node.y>=1.94&&node.y<6.1);
 assert.deepEqual(slide,before,"Rendering cannot shorten stored material or notes");
 assert.deepEqual(scene.warnings,[]);
 assert.equal(body.filter(node=>node.bold&&node.w>2).length,14);
 assert.ok(body.some(node=>node.text.endsWith("…")),"Only the displayed long title is ellipsized");
 for(const node of body){assert.ok(node.size>=10);assert.ok(node.y+node.h<=6.11,`Body overflow: ${node.text}`);assert.ok(richLines(node.text,node.size,node.w).length*node.size*node.lineHeight/72<=node.h+.025);}
 for(const title of body.filter(node=>node.bold&&node.w>2))assert.ok(richLines(title.text,title.size,title.w).length<=2);
 assert.ok(!body.some(node=>node.text.includes("T09:")));
 assert.equal(body.filter(node=>node.text==="확인 2026-11-13").length,14);
 assert.equal(scene.nodes.filter(node=>node.kind==="text"&&node.text===slide.data.takeaway).length,1,"No duplicate conclusion bar");
});
test("small bibliographies retain full short titles in one column",()=>{
 const slide=sourceSlide(4,false),scene=makeScene(slide,forest),titles=scene.nodes.filter((node):node is TextNode=>node.kind==="text"&&/^공식 자료/.test(node.text));
 assert.equal(titles.length,4);assert.ok(titles.every(node=>node.size===12&&node.x<1.1&&!node.text.includes("…")));assert.deepEqual(scene.warnings,[]);
});
test("bibliography exports editable text, exact original titles in notes and 14 native hyperlinks",async()=>{
 const slide=sourceSlide(14),deck:Deck={id:"source-render",input,designSystem:forest,outline:[{...item,index:0}],candidates:{0:[slide]},picked:{0:0},edited:{},research:[],chat:{setup:[],outline:[],slides:{}},demo:true};
 const zip=await JSZip.loadAsync(await(await exportDeck(deck,false)).write({outputType:"nodebuffer"}) as Buffer),xml=await zip.file("ppt/slides/slide1.xml")!.async("string"),rels=await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string"),notes=await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string");
 assert.ok(xml.includes("<a:t>"));assert.ok(!xml.includes("<p:pic>"));assert.equal((xml.match(/<a:hlinkClick /g)??[]).length,14);
 for(const row of slide.data.rows as {material:string;url:string}[]){assert.ok(notes.includes(row.material),"Full source title remains in speaker notes");assert.ok(notes.includes(row.url));assert.ok(rels.includes(row.url));}
});
