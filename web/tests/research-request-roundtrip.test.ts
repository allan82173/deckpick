import test from "node:test";
import assert from "node:assert/strict";
import {requestSchema} from "../src/lib/api-request";
import {researchRecordSchema} from "../src/lib/evidence-model";

test("a collected research source list passes unchanged into the continuation request",()=>{
 const sources=Array.from({length:80},(_,i)=>({title:`공개 출처 ${i+1}`,url:`https://example.org/report/${i+1}`}));
 const researchRecord=researchRecordSchema.parse({evidence:sources.map((s,i)=>({id:String(i+1),claim:`공개 주장 ${i+1}`,title:s.title,url:s.url,checkedAt:"2026-11-08",kind:"공개 사실"})),searchStatus:"searched",notice:"공개 조사 완료",query:"공개 검색",requiresReview:true});
 const request=requestSchema.parse({sources,researchRecord,acceptLimitedEvidence:true});
 assert.deepEqual(request.sources,sources);assert.equal(request.researchRecord?.evidence.length,80);
 assert.equal(request.acceptLimitedEvidence,true);
});
test("research source-count compatibility does not permit invalid URLs or oversized slide outlines",()=>{
 assert.equal(requestSchema.safeParse({sources:[{title:"문서",url:"javascript:invalid"}]}).success,false);
 assert.equal(requestSchema.safeParse({outline:Array(31).fill({})}).success,false);
});
