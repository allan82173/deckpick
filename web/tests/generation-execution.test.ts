import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { structured } from "../src/lib/ai";
import { withExecution } from "../src/lib/execution-scope";
import { GENERATION_CONFIG } from "../src/lib/generation-config";
import { extractAttachmentEvidence,confirmedUserDecisions } from "../src/lib/attachment-evidence";
import { candidatePlan } from "../src/lib/candidate-plan";
import { roleLayouts } from "../src/lib/slide-quality";
import { inspectSceneGeometry } from "../src/lib/visual-quality";
import { renderSlidePng } from "../src/lib/visual-review";
import { forest } from "../src/lib/design";
import { demoCandidates } from "../src/lib/demo";
import { generationReport,reportMarkdown } from "../src/lib/run-report";
import { saveGenerationReport } from "../src/lib/run-report-storage";
import { persistedDeckSchema,type Deck,type DeckInput } from "../src/lib/model";
import { taskAnalysisSchema } from "../src/lib/task-model";
import { runResearch } from "../src/lib/research-pipeline";
import { taskFingerprint } from "../src/lib/task-analysis";
import { readFile } from "node:fs/promises";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { mergeExecution } from "../src/lib/execution-model";
const input:DeckInput={topic:"범용 검증",purpose:"공개 근거와 내부 조건 구분",deckType:"consulting",designSystemId:"ict-forest",slideCount:5};
const c={provider:"openai" as const,key:"test-only",model:"gpt-6-luna"};
const reply=(value:unknown)=>Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(value)}]}],usage:{input_tokens:100,output_tokens:10,total_tokens:110}});
const body=(init?:RequestInit)=>JSON.parse(String(init?.body)) as Record<string,unknown>;

test("late execution responses preserve the latest finish time and deduplicate calls",()=>{
 const call={id:"same-call",stage:"story",model:c.model,provider:c.provider,effort:"medium",maxOutputTokens:24000,startedAt:"2026-11-07T00:00:00Z",durationMs:20,status:200,truncated:false};
 const merged=mergeExecution({startedAt:"2026-11-07T00:00:00Z",updatedAt:"2026-11-07T00:03:00Z",calls:[call],config:{version:"new"}},{startedAt:"2026-11-07T00:01:00Z",updatedAt:"2026-11-07T00:02:00Z",calls:[call],config:{version:"old"}});
 assert.equal(merged.calls.length,1);assert.equal(merged.updatedAt,"2026-11-07T00:03:00Z");assert.equal(merged.config?.version,"new");
});

test("deck-level repairs retain the image review result in the generation report",async()=>{
 const item={index:0,section:"표지",message:input.topic,contentHint:"",role:"사실 제시" as const};const slide=demoCandidates(input,item)[0];
 const deck:Deck={id:"visual-review-preserved",input,designSystem:forest,outline:[item],research:[],candidates:{0:[slide]},picked:{0:0},edited:{},chat:{setup:[],outline:[],slides:{}},demo:false};
 const original=fetch;let reviews=0;
 globalThis.fetch=async(_,init)=>{const b=body(init),properties=(b.text as {format:{schema:{properties:Record<string,unknown>}}}).format.schema.properties;
  if(properties.checklist)return reply({checklist:[],issues:++reviews===1?[{index:0,category:"구성",reason:"표지 설명 보완",repair:"설명 보완"}]:[],summary:"검토"});
  if(properties.warnings)return reply({warnings:[]});
  return reply({slides:[{layoutId:slide.layoutId,section:slide.section,headline:slide.headline,dataJson:JSON.stringify(slide.data),sourceUrls:[],notes:""}]});
 };
 try{const result=await reviewAndRepairDeck(c,deck);assert.equal(result.replacements.length,1);const repaired=result.replacements[0].slide;assert.equal(repaired.quality?.visual?.status,"passed");assert.ok(repaired.quality!.attempts>=1&&repaired.quality!.attempts<=GENERATION_CONFIG.qualityRetries);const report=generationReport({...deck,candidates:{0:[repaired]},review:result.review});assert.equal(report.slides[0].visualReview?.status,"passed");assert.equal(report.slides[0].regenerationCount,repaired.quality!.attempts);}finally{globalThis.fetch=original;}
});
test("stages apply medium 24k/16k, low repair and preserve native Claude format",async()=>{
 const original=fetch;const bodies:Record<string,unknown>[]=[];
 globalThis.fetch=async(_,init)=>{const b=body(init);bodies.push(b);return String(b.model).startsWith("claude")?Response.json({content:[{type:"text",text:'{"ok":true}'}]}):reply({ok:true});};
 try{await structured(c,z.object({ok:z.boolean()}),"test","test",undefined,[],"interpretTask");await structured(c,z.object({ok:z.boolean()}),"test","test",undefined,[],"candidates");await structured({...c,provider:"anthropic",model:"claude-sonnet-5-5"},z.object({ok:z.boolean()}),"test","test",undefined,[],"assessDeck");
 assert.equal(bodies[0].max_output_tokens,24000);assert.deepEqual(bodies[0].reasoning,{effort:"medium"});assert.equal(bodies[1].max_output_tokens,16000);assert.equal(bodies[2].max_tokens,24000);assert.equal((bodies[2].output_config as {effort:string}).effort,"medium");assert.ok((bodies[2].output_config as {format:unknown}).format);
 }finally{globalThis.fetch=original;}
});
test("output truncation retries one larger cap before format retries and records returned usage",async()=>{
 const original=fetch;const limits:unknown[]=[];let n=0;
 globalThis.fetch=async(_,init)=>{limits.push(body(init).max_output_tokens);return ++n===1?Response.json({status:"incomplete",incomplete_details:{reason:"max_output_tokens"},usage:{input_tokens:80,output_tokens:16000}}):reply({ok:true});};
 try{const {result,execution}=await withExecution(()=>structured(c,z.object({ok:z.boolean()}),"test","test",undefined,[],"candidates"));assert.equal(result.ok,true);assert.deepEqual(limits,[16000,24000]);assert.equal(execution.calls.length,2);assert.equal(execution.calls[0].truncated,true);assert.equal(execution.calls[0].totalTokens,undefined);assert.equal(execution.calls[1].totalTokens,110);assert.ok(execution.calls.every(x=>x.stage==="candidates"));assert.ok(!JSON.stringify(execution).includes("test-only"));}finally{globalThis.fetch=original;}
});
test("exhausted truncation does not silently parse a partial object or loop format attempts",async()=>{
 const original=fetch;let n=0;globalThis.fetch=async()=>{n++;return Response.json({status:"incomplete",incomplete_details:{reason:"max_output_tokens"}});};
 try{await assert.rejects(()=>structured(c,z.object({ok:z.boolean()}),"test","test",undefined,[],"story"),/응답이 잘렸/);assert.equal(n,2);}finally{globalThis.fetch=original;}
});
test("attachment table batches all tail conditions, preserves units and locations and reuses extraction",async()=>{
 const original=fetch;let n=0;globalThis.fetch=async(_,init)=>{n++;const p=JSON.parse(String(body(init).input)) as {sources:{locator:string;text:string}[]};return reply({attachmentRows:p.sources.map(s=>({content:s.text.split("\n")[0],type:"조건",locator:s.locator}))});};
 try{const docs=[{id:randomUUID(),name:"합성.pdf",chunks:Array.from({length:15},(_,i)=>({location:`${i+1}쪽`,text:`조건 ${i+1}: 월 ${100+i}건\n`+"배경 설명 ".repeat(100)}))}];
 const first=await extractAttachmentEvidence(c,"관련 발췌",docs);assert.equal(first.evidence.length,15);assert.ok(first.evidence.some(e=>e.claim.includes("114건")&&e.locator.includes("15쪽")));assert.ok(n<15);const count=n;const cached=await extractAttachmentEvidence(c,"관련 발췌",docs);assert.equal(n,count);assert.deepEqual(cached.evidence,first.evidence);assert.ok(first.evidence.every(e=>e.kind==="내부 전제"&&!e.url&&!!e.locator));}finally{globalThis.fetch=original;}
});
test("confirmed user statements persist beyond compact chat and assistant statements are excluded",()=>{
 const old=[{role:"user" as const,text:"이 조건으로 진행해줘",createdAt:"2026-11-07"},{role:"assistant" as const,text:"확정",createdAt:"2026-11-07"}];const rows=confirmedUserDecisions(old);assert.equal(rows.length,1);assert.deepEqual(confirmedUserDecisions([],rows),rows);assert.equal(confirmedUserDecisions(old,rows).length,1);
});
test("role preferences stay first and a two-layout role remainder returns two without forcing a family",()=>{
 const item={index:2,section:"일정",message:"원인과 흐름",contentHint:"",role:"흐름" as const,argument:{questionId:"Q1",judgment:"선택",support:[{text:"근거",evidenceRefs:[]}],reversalCondition:"변경 조건",limitation:"",transition:"다음",visualIntent:"과정",preferredLayouts:["c-cause-chain","c-system-flow","c-swimlane"]}};
 const pool=roleLayouts("consulting","흐름");const allowed=["c-cause-chain","c-swimlane"];/* system-flow는 4단계 사람 평가 후 자동 후보에서 제외 */
 assert.deepEqual(candidatePlan(input,item,pool.filter(id=>!allowed.includes(id)),10),allowed);assert.equal(candidatePlan(input,item)[0],"c-cause-chain");
});
test("geometry inspection catches overlapping text, overflow and large unused body bottom",()=>{
 const text={kind:"text" as const,x:1,y:2,w:3,h:.2,text:"서로 겹치는 본문입니다",size:18,color:"#000000",lineHeight:1.25};
 const warnings=inspectSceneGeometry({nodes:[text,{...text,x:1.1,y:2.05}],warnings:[]});assert.ok(warnings.some(w=>/텍스트끼리/.test(w)));assert.ok(warnings.some(w=>/박스 높이/.test(w)));assert.ok(warnings.some(w=>/본문 하단/.test(w)));
});
test("server renders actual scene to PNG with expected 16:9 dimensions",async()=>{
 const slide=demoCandidates(input,{index:1,section:"비교",message:"근거를 비교합니다",contentHint:""})[0];const png=await renderSlidePng(slide,forest);assert.equal(png.subarray(1,4).toString(),"PNG");assert.equal(png.readUInt32BE(16),GENERATION_CONFIG.visual.width);
});
test("report whitelists outputs, masks private values and never includes credentials or attachment transcript",async()=>{
 const analysis=taskAnalysisSchema.parse({questions:["Q1","Q2"].map(id=>({id,question:"선택",publicQuestion:"선택",judgmentForm:"선택",needsPublicEvidence:false})),publicContext:[],privateConditions:[{value:"SECRET_MARKER_987 370만원",reason:"내부"}],internalPremises:["full attachment transcript"],stage:"최종",language:"ko",slideCount:5,requiredSections:[],checklist:[{id:"count",requirement:"5장"}],terminology:[],notationRules:[],fingerprint:"test"});
 const outline=[{index:0,section:"표지",message:input.topic,contentHint:""}],slide=demoCandidates(input,outline[0])[0];const deck:Deck={id:randomUUID(),input,designSystem:forest,research:[],researchRecord:{analysis,evidence:[{id:"1",kind:"내부 전제",claim:"SECRET_MARKER_987 370만원",url:"",title:"자료",locator:"1쪽",checkedAt:"today"}],notice:"",query:"",searchStatus:"not-requested"},outline,candidates:{0:[slide]},picked:{0:0},edited:{},chat:{setup:[{role:"user",text:"full attachment transcript",createdAt:"test"}],outline:[],slides:{}},demo:true};
 const report=generationReport(deck);assert.equal(report.task?.privateConditionCount,1);assert.ok(!JSON.stringify(report).includes("SECRET_MARKER_987"));assert.ok(!JSON.stringify(report).includes("370"));assert.ok(!JSON.stringify(report).includes("full attachment transcript"));assert.equal(report.execution.totalDurationMs,null);const saved=await saveGenerationReport(deck);assert.deepEqual(JSON.parse(await readFile(saved.paths.json,"utf8")),report);assert.equal(await readFile(saved.paths.markdown,"utf8"),reportMarkdown(report));assert.ok(persistedDeckSchema.safeParse(deck).success);
 deck.researchRecord!.evidence.push({id:"2",kind:"공개 사실",claim:"공개 자료",title:"공식 자료",url:"https://example.org/report/370",locator:"본문",checkedAt:"today"});
 assert.equal(generationReport(deck).evidence[1].url,"https://example.org/report/370");
});
test("question budgets use both languages, stop at two verified matches and retain failed PDF/HTML opens",async()=>{
 const attachment="",messages:[]=[];const analysis=taskAnalysisSchema.parse({questions:["Q1","Q2"].map(id=>({id,question:"대안",publicQuestion:"공개 대안",judgmentForm:"선택",needsPublicEvidence:true})),publicContext:[{dimension:"지역",value:"한국"}],privateConditions:[{value:"PRIVATE_TOKEN_93 370만원",reason:"내부"}],internalPremises:[],stage:"중간",language:"ko",slideCount:5,requiredSections:[],checklist:[{id:"count",requirement:"5장"}],terminology:[],notationRules:[],fingerprint:taskFingerprint(input,attachment,messages)});
 const planned={questions:analysis.questions.map(q=>({questionId:q.id,evidenceNeeded:"공식 조건",preferredMaterials:["기관·기업 공식 안내" as const],localQuery:`한국 ${q.id} PRIVATE_TOKEN_93 370만원`,englishQuery:`Korea ${q.id} official`}))};
 const original=fetch;globalThis.fetch=async(_,init)=>{const requestBody=body(init);const p=JSON.parse(String(requestBody.input)) as {question:{id:string};originalPages:{url:string;text:string;opened:boolean}[]};const nativeSchema=JSON.stringify(requestBody.text);assert.match(nativeSchema,/"const":"공개 사실"/);assert.ok(nativeSchema.includes(`"const":"${p.question.id}"`));assert.ok(nativeSchema.includes("https://example.com/"));
 const rows=p.originalPages.filter(x=>x.opened).map(x=>({claim:x.text,title:"공식 자료",url:x.url,kind:"공개 사실",locator:"본문",originalText:x.text,publishedAt:"",materialType:"기관·기업 공식 안내",contextMatch:"일치",contextReason:"한국 공식 조건",questionIds:[p.question.id]}));
 return reply({rows:[...rows,{...rows[0],claim:"만들어낸 주장은 쓰면 안 됩니다",originalText:"원문에는 존재하지 않는 긴 인용입니다"}]});};
 const searches:string[]=[];let opens=0;
 try{const result=await runResearch(c,input,{analysis,plan:planned,evidence:[],searchStatus:"not-requested",notice:"",query:""},attachment,messages,[],{search:async(_,query)=>{searches.push(query);return {text:"공식 결과",sources:[0,1,2,3].map(i=>({title:"공식 자료",url:`https://example.com/${query.includes("Q1")?"Q1":"Q2"}/${i}${i===1?".pdf":""}`}))};},readPage:async url=>{opens++;return {url,opened:!url.endsWith("/0"),text:"공식 조건은 동일 기간의 비교 가능한 수치입니다.",checkedAt:"today",format:url.endsWith(".pdf")?"pdf":"html",error:url.endsWith("/0")?"원문 차단":undefined};}});
 assert.equal(searches.length,4);assert.ok(searches.every(q=>!/PRIVATE_|370/.test(q)));assert.equal(opens,6);assert.equal(result.researchRecord.searchRounds?.length,2);assert.equal(result.researchRecord.gaps?.length,0);assert.equal(result.researchRecord.originalPages?.filter(p=>!p.opened&&p.error).length,2);assert.equal(result.researchRecord.originalPages?.filter(p=>p.format==="pdf").length,2);assert.equal(result.researchRecord.evidenceWarnings?.length,2);assert.equal(result.researchRecord.evidence.length,4);assert.deepEqual(result.researchRecord.evidenceCounts,{raw:6,unique:4,publicRaw:6,publicUnique:4});assert.equal(result.researchRecord.evidence.flatMap(e=>[e,...(e.relatedFacts??[])]).filter(e=>e.claim.includes("만들어낸")&&e.originalText===""&&!e.originalVerified).length,2);assert.match(result.researchRecord.notice,/원문 미확인/);
 }finally{globalThis.fetch=original;}
});

test("unconfirmed quotes are retained without satisfying the evidence approval gate",async()=>{
 const messages:[]=[];const analysis=taskAnalysisSchema.parse({questions:["Q1","Q2"].map(id=>({id,question:"선택",publicQuestion:"공개 선택",judgmentForm:"선택",needsPublicEvidence:id==="Q1"})),publicContext:[],privateConditions:[],internalPremises:[],stage:"중간",language:"ko",slideCount:5,requiredSections:[],checklist:[{id:"count",requirement:"5장"}],terminology:[],notationRules:[],fingerprint:taskFingerprint(input,"",messages)});
 const plan={questions:[{questionId:"Q1",evidenceNeeded:"원문",preferredMaterials:["기관·기업 공식 안내" as const],localQuery:"공개 자료",englishQuery:"public source"}]};const original=fetch;let followup=0;
 globalThis.fetch=async(_,init)=>JSON.stringify(body(init).text).includes('"localQuery"')?reply({localQuery:`다른 공개 자료 ${++followup}`,englishQuery:`different public source ${followup}`}):reply({rows:[{claim:"인용에 없는 주장",title:"공식 자료",url:"https://example.org/official",kind:"공개 사실",locator:"본문",originalText:"원문에는 없는 숫자와 문장을 조합했습니다",publishedAt:"",materialType:"기관·기업 공식 안내",contextMatch:"일치",contextReason:"주제 일치",questionIds:["Q1"]}]});
 try{const result=await runResearch(c,input,{analysis,plan,evidence:[],searchStatus:"not-requested",query:"",notice:""},"",messages,[],{search:async()=>({text:"공개 자료",sources:[{title:"공식 자료",url:"https://example.org/official"}]}),readPage:async url=>({url,text:"실제 원문에 포함된 검증 가능한 문장입니다.",opened:true,checkedAt:"today",format:"html"})});assert.equal(result.researchRecord.evidence.length,1);assert.equal(result.researchRecord.evidence[0].originalText,"");assert.equal(result.researchRecord.evidence[0].verificationStatus,"원문 미확인");assert.equal(result.researchRecord.evidenceWarnings?.length,1);assert.equal(result.researchRecord.requiresReview,true);assert.equal(result.researchRecord.acceptedLimits,false);assert.equal(result.researchRecord.gaps?.length,1);}finally{globalThis.fetch=original;}
});
