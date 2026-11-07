import test from "node:test";
import assert from "node:assert/strict";
import {classifyContext,comparableEvidenceCounts} from "../src/lib/context-match";
import {estimateRequestInput,inputUsage} from "../src/lib/usage-estimate";
import {benchmarkGates} from "../src/lib/benchmark-gates";
import type {CallMetric} from "../src/lib/execution-model";
import {extractAttachmentEvidence} from "../src/lib/attachment-evidence";
import {withRunContext} from "../src/lib/run-checkpoints";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {researchRecordSchema} from "../src/lib/evidence-model";
const context=[{dimension:"지역" as const,value:"지역 A"},{dimension:"시장" as const,value:"시장 B"},{dimension:"대상" as const,value:"대상 C"}];
test("context uses approved region and market or target, preserves partial matches and ignores company names",()=>{
 const checks=context.map(c=>({...c,match:"일치" as const,reason:"원문 범위"}));assert.equal(classifyContext(context,checks).contextMatch,"일치");assert.equal(classifyContext(context,checks.map(c=>c.dimension==="지역"?{...c,match:"부분 일치"}:c)).contextMatch,"부분 일치");assert.equal(classifyContext(context,checks.map(c=>({...c,match:"불일치"}))).contextMatch,"비교 참고");assert.equal(classifyContext(context,[{dimension:"기타",value:"가상 회사",match:"일치",reason:"같은 이름"}]).contextMatch,"불명확");assert.equal(classifyContext(context,[checks[0],checks[2]]).contextMatch,"일치");assert.match(classifyContext(context,[checks[0]]).contextReason,/시장.*불명확/);
});
test("reported rows, claims and independent URLs are separate without losing partial or verified evidence",()=>{
 const result=comparableEvidenceCounts([{kind:"공개 사실",claim:"첫 주장",url:"https://example.org",contextMatch:"부분 일치",originalVerified:true,relatedFacts:[{claim:"둘째 주장",contextMatch:"일치",originalVerified:false}]}]);assert.equal(result.recordRows.partial,1);assert.equal(result.distinctClaims.publicRows,2);assert.equal(result.distinctUrls.matched,1);assert.equal(result.distinctUrls.originalVerified,1);
});
test("missing input usage is estimated by request length and is never disguised as provider usage",()=>{
 const estimate=estimateRequestInput({input:"한국어 요청 내용",image_url:"data:image/png;base64,PRIVATE_IMAGE"},1);assert.ok(estimate.estimatedInputTokens>3000);assert.ok(!JSON.stringify(estimate).includes("PRIVATE_IMAGE"));const call:CallMetric={id:"1",stage:"story",model:"gpt-6-luna",provider:"openai",effort:"medium",maxOutputTokens:24000,startedAt:"today",durationMs:1,status:520,truncated:false,...estimate};const usage=inputUsage([call,{...call,id:"2",inputTokens:100}]);assert.equal(usage.total,estimate.estimatedInputTokens+100);assert.equal(usage.estimatedCalls,1);assert.equal(usage.label,"추정 포함");assert.equal(call.inputTokens,undefined);
});
test("clean benchmark requires full completion, both time criteria, and the estimated-inclusive input cap",()=>{
 const baseline={durationMs:1500880,inputTokens:1898015};const usage={measured:500000,estimated:10000,total:510000,estimatedCalls:1,unestimatedCalls:0,label:"추정 포함",limitations:"test"};assert.ok(Object.values(benchmarkGates(899000,baseline,usage,true)).every(Boolean));assert.equal(benchmarkGates(901000,baseline,usage,true).time,false);assert.equal(benchmarkGates(899000,baseline,{...usage,total:640000},true).input,false);assert.equal(benchmarkGates(899000,baseline,usage,false).completion,false);
});
test("clean runs bypass shared attachment cache while regular sessions keep caching",async()=>{
 const old=fetch;let calls=0;const c={provider:"openai" as const,key:"test-only",model:"test-"+randomUUID()};globalThis.fetch=async()=>{calls++;return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({attachmentRows:[{content:"조건 12건",type:"조건",locator:"첨부 발췌 · 제공 위치"}]})}]}]});};try{await withRunContext(randomUUID(),()=>extractAttachmentEvidence(c,"조건 12건"),{fresh:true});await withRunContext(randomUUID(),()=>extractAttachmentEvidence(c,"조건 12건"),{fresh:true});assert.equal(calls,2);await extractAttachmentEvidence(c,"조건 12건");assert.equal(calls,2);}finally{globalThis.fetch=old;}
});
test("fixtures have five real public contexts and fifteen independent evaluation facts, with human review left blank",async()=>{
 const fixtures=JSON.parse(await readFile("tests/fixtures/general-decks-v3.json","utf8"));assert.equal(fixtures.length,5);for(const f of fixtures){assert.equal(f.expectedFacts.length,3);assert.ok(f.input.publicSearchTopic);assert.ok(f.expectedFacts.every((e:{url:string;humanReview:string})=>e.url.startsWith("https://")&&e.humanReview==="미검토"));assert.ok(!JSON.stringify(f.input).includes("expectedFacts"));}
});
test("partial match records survive persisted evidence validation",()=>{
 assert.ok(researchRecordSchema.safeParse({evidence:[{id:"1",claim:"공개 근거",title:"공식 자료",url:"https://example.org",checkedAt:"today",kind:"공개 사실",contextMatch:"부분 일치"}],searchStatus:"searched",query:"",notice:""}).success);

});
