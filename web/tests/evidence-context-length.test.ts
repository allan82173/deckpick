import test from "node:test";
import assert from "node:assert/strict";
import {evidenceSchema,researchRecordSchema} from "../src/lib/evidence-model";
import {classifyContext} from "../src/lib/context-match";

test("cached context explanations plus verification suffix cannot invalidate a research record",()=>{
 const explanation="가".repeat(500)+" · 원문 미확인";
 const row={id:"1",claim:"원문에서 확인할 주장",title:"공식 자료",url:"https://example.org/report",checkedAt:"2026-11-08",kind:"공개 사실",contextMatch:"부분 일치",contextReason:explanation,originalVerified:false,verificationStatus:"원문 미확인"};
 const record=researchRecordSchema.parse({evidence:[row],searchStatus:"searched",query:"공개 검색",notice:"조사 완료",requiresReview:true});
 assert.equal(record.evidence.length,1);
 assert.equal(record.evidence[0].contextReason,explanation);
 assert.equal(record.evidence[0].originalVerified,false);
 assert.equal(record.requiresReview,true);
 // Removing the explanation length check must not relax substantive evidence validation.
 assert.equal(evidenceSchema.safeParse({...row,url:"invalid-url"}).success,false);
});

test("aggregate context classification stays bounded and all detailed checks survive",()=>{
 const publicContext=[{dimension:"지역" as const,value:"서울"},{dimension:"시장" as const,value:"주거"}];
 const context=classifyContext(publicContext,publicContext.map(item=>({...item,match:"일치" as const,reason:"근거".repeat(200)})));
 assert.equal(context.contextMatch,"일치");
 assert.ok(context.contextReason.length<=500);
 assert.equal(context.contextChecks.length,2);
 assert.equal(context.contextChecks[1].reason,"근거".repeat(200));
});
