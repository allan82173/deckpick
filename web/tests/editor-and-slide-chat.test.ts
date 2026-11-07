import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {writeFile} from "node:fs/promises";
import {forest} from "../src/lib/design";
import {demoCandidates,demoOutline} from "../src/lib/demo";
import {patchCanvasNode} from "../src/lib/canvas-edits";
import {makeScene,richLines,wrap} from "../src/lib/scene";
import {deckChatContext,applySlideChatChanges} from "../src/lib/slide-chat";
import {insertDraftPage,slideAttachmentOptions} from "../src/lib/insert-page";
import {persistedDeckSchema,type Deck} from "../src/lib/model";
import {exportDeck} from "../src/lib/export";
import {POST} from "../src/app/api/[...action]/route";
import {storeAttachment} from "../src/lib/attachments";
import {isSameOriginRequest} from "../src/lib/request-origin";
test("same-origin checks use the browser Host while still rejecting foreign origins",()=>{
 assert.equal(isSameOriginRequest(new Request("http://localhost:3105/api/attachments",{headers:{host:"127.0.0.1:3105",origin:"http://127.0.0.1:3105"}})),true);
 assert.equal(isSameOriginRequest(new Request("http://localhost:3105/api/attachments",{headers:{host:"127.0.0.1:3105",origin:"https://foreign.example"}})),false);
});
function fixture():Deck{const input={topic:"편집 기능 검증",purpose:"검증",slideCount:14,deckType:"consulting" as const,designSystemId:"ict-forest" as const};const outline=demoOutline(input);return {id:"editor-regression",input,outline,designSystem:forest,candidates:Object.fromEntries(outline.map((o,i)=>[i,demoCandidates(input,o,[],i===0?1:0,1)])),picked:Object.fromEntries(outline.map((_,i)=>[i,0])),edited:{},chat:{setup:[],outline:[],slides:{}},research:[],demo:true};}
test("text then resize then style is retained through save, candidate switch and native export",async()=>{
 const d=fixture(),primary=d.candidates[0][0];const nodes=makeScene(primary,forest).nodes;const original=nodes.find(n=>n.kind==="text"&&n.text===String(primary.data.title).replace(/\s+/g," ").trim())!;
 let edited=patchCanvasNode(primary,original,{text:"타깃은 2030 직장인입니다"});edited=patchCanvasNode(edited,original,{w:12,h:2});edited=patchCanvasNode(edited,original,{size:24});d.edited[0]=edited;
 const loaded=persistedDeckSchema.parse(JSON.parse(JSON.stringify(d))) as Deck;const text=makeScene(loaded.edited[0],forest).nodes.find(n=>n.kind==="text"&&n.text==="타깃은 2030 직장인입니다");assert.ok(text);assert.equal(text.w,12);assert.equal(text.h,2);if(text.kind==="text")assert.equal(text.size,24);
 const ppt=await exportDeck(loaded,false),zip=await JSZip.loadAsync(await ppt.write({outputType:"nodebuffer"}) as Buffer);const xml=await zip.file("ppt/slides/slide1.xml")!.async("string");assert.match(xml,/타깃은 2030 직장인입니다/);assert.match(xml,/sz="2400"/);
});
test("word wrapping keeps Korean words whole and normal cover titles fit one line",()=>{
 const lines=wrap("MGRV 마케팅의 핵심 쟁점과 실행 과제",37,8.35);assert.ok(lines.some(l=>l.includes("과제")));assert.ok(!lines.some(l=>l.trim()==="제"));
 const d=fixture(),s=d.candidates[0][0];const n=makeScene(s,forest).nodes.find(n=>n.kind==="text"&&n.text===String(s.data.title).replace(/\s+/g," ").trim());assert.ok(n&&n.kind==="text"&&n.oneLine);if(n.kind==="text")assert.equal(richLines(n.text,n.size,n.w,n.oneLine).length,1);
});
test("page files stay scoped, shift with the page and are prioritized for bounded reading",async()=>{
 const file=await storeAttachment(new File(["검증용 공개 예시: 고객의 자료 확인 시간이 길다."],"페이지-근거.txt"));const d=insertDraftPage(fixture(),3,{message:"근거를 확인합니다",section:"근거",contentHint:"첨부를 참고",attachments:[file]});const loaded=persistedDeckSchema.parse(d) as Deck;assert.equal(loaded.outline[3].attachments?.[0].id,file.id);assert.deepEqual(slideAttachmentOptions(loaded,3).attachmentIds,[file.id]);assert.deepEqual(slideAttachmentOptions(loaded,2).attachmentIds,[]);assert.equal(insertDraftPage(loaded,2,{message:"추가",section:"추가",contentHint:""}).outline[4].attachments?.[0].id,file.id);
 await writeFile("output/page-evidence-demo.txt","첨부 테스트용 가상 자료입니다. 핵심 요청은 자료 연결과 기록 확인입니다.");
});
test("14th slide receives first slide's latest manual changes and recent request; changes affect only its target",async()=>{
 const d=fixture();const first=d.candidates[0][0],original=makeScene(first,forest).nodes.find(n=>n.kind==="text"&&n.text===String(first.data.title).replace(/\s+/g," ").trim())!;d.edited[0]=patchCanvasNode(first,original,{text:"2030 직장인 대상 전략"});d.chat.slides[0]=[{role:"user",text:"타깃은 2030 직장인으로 확정",createdAt:"test"}];
 const current=d.candidates[13][0],visible=makeScene(current,forest,14,d.input.topic).nodes.find(n=>n.kind==="text"&&n.text===current.headline)!;assert.equal(visible.kind,"text");const before=visible.kind==="text"?visible.text:"";const ctx=deckChatContext(d);assert.match(JSON.stringify(ctx[0]),/2030 직장인/);
 const old=globalThis.fetch;let called=0;globalThis.fetch=async(_url,init)=>{called++;const prompt=JSON.parse(JSON.parse(String(init?.body)).input);assert.equal(prompt.currentPage,14);assert.match(JSON.stringify(prompt.sharedDeckContext[0]),/2030 직장인/);return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({reply:"1번 장의 타깃에 맞춰 수정했습니다.",changes:[{before,after:"2030 직장인 대상의 실행을 검증합니다"}]})}]}]});};
 try{const response=await POST(new Request("http://localhost:3100/api/slides/chat",{method:"POST",headers:{"content-type":"application/json","x-user-api-key":"mock-only"},body:JSON.stringify({input:d.input,currentSlide:current,designSystem:forest,targetIndex:13,deckContext:ctx,messages:[{role:"user",text:"1번의 타깃에 맞춰 바꿔줘",createdAt:"test"}]})}),{params:Promise.resolve({action:["slides","chat"]})});assert.equal(response.status,200);const reply=await response.json();const next=applySlideChatChanges(current,forest,13,d.input.topic,d.outline.map(o=>o.section),reply.changes);assert.ok(makeScene(next,forest).nodes.some(n=>n.kind==="text"&&n.text.includes("2030 직장인")));assert.equal(d.candidates[13][0],current);assert.equal(called,1);assert.throws(()=>applySlideChatChanges(current,forest,13,d.input.topic,[],[{before:"없는 문장",after:"임의 변경"}]));}finally{globalThis.fetch=old;}
});
