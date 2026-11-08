import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {applyResearchCoverage} from "../src/lib/research-coverage";
import type {ResearchRecord,Evidence} from "../src/lib/evidence-model";
import {researchRecordSchema} from "../src/lib/evidence-model";
import {ResearchScopeNotice} from "../src/components/research-scope-notice";
function fixture():ResearchRecord{return {evidence:[],searchStatus:"searched",notice:"공개 조사 완료",query:"public query",requiresReview:true,analysis:{questions:[{id:"Q1",question:"대학 A 학생 대상 서비스",publicQuestion:"대학생 서비스 이용",judgmentForm:"선택",needsPublicEvidence:true},{id:"Q2",question:"내부 조건",publicQuestion:"내부 조건",judgmentForm:"설명",needsPublicEvidence:false}],publicContext:[{dimension:"대상",value:"대학 A 학생"}],privateConditions:[],internalPremises:[],stage:"중간",language:"ko",slideCount:6,requiredSections:[],checklist:[{id:"1",requirement:"범위 명시"}],terminology:[],notationRules:[],fingerprint:"test"}};}
function row(id:string,match:"일치"|"부분 일치",verified=true):Evidence{return {id,claim:"공개 주장 "+id,title:"자료 "+id,url:`https://example.org/${id}`,checkedAt:"2026-11-08",kind:"공개 사실",locator:"본문",contextMatch:match,originalVerified:verified,questionIds:["Q1"],contextReason:"대학 A 개별 자료가 아닌 20대 전체 기준 자료"};}

test("sufficient original-verified partial sources proceed with explicit scope rather than an exact-match gate",()=>{
 const r=applyResearchCoverage({...fixture(),evidence:[row("1","부분 일치"),row("2","부분 일치"),row("3","부분 일치")]});
 assert.equal(r.requiresReview,false);assert.equal(r.acceptedLimits,true);assert.equal(r.coverage?.[0].status,"substituted");assert.equal(r.coverage?.[0].partialSources,3);assert.match(r.notice,/20대 전체/);assert.match(r.notice,/대학 A 학생/);assert.deepEqual(r.gaps,[]);
 assert.equal(applyResearchCoverage(r).notice,r.notice);assert.equal(researchRecordSchema.parse(r).coverage?.length,1);
});
test("duplicate URLs and unverified or unrelated facts cannot clear the gate",()=>{
 const a=row("1","부분 일치"),b={...row("2","부분 일치"),url:a.url};
 const r=applyResearchCoverage({...fixture(),evidence:[a,b,row("3","부분 일치",false),{...row("4","일치"),questionIds:["Q2"]}]});
 assert.equal(r.requiresReview,true);assert.equal(r.coverage?.[0].partialSources,1);assert.equal(r.gaps?.length,1);
});
test("exact sources pass, and verified related facts retain question attribution",()=>{
 const a=row("1","부분 일치");a.primaryQuestionIds=["Q2"];a.relatedFacts=[{claim:"다른 주장",contextMatch:"일치",originalVerified:true,questionIds:["Q1"]}];
 const r=applyResearchCoverage({...fixture(),evidence:[a,row("2","일치")]});assert.equal(r.coverage?.[0].status,"exact");assert.equal(r.requiresReview,false);
});
test("research notice is absent before research and shows factual scope after substitution",()=>{
 const pending={...fixture(),searchStatus:"not-requested" as const};assert.equal(renderToStaticMarkup(createElement(ResearchScopeNotice,{record:pending})),"");
 const r=applyResearchCoverage({...fixture(),evidence:[row("1","부분 일치"),row("2","부분 일치"),row("3","부분 일치")]});assert.match(renderToStaticMarkup(createElement(ResearchScopeNotice,{record:r})),/20대 전체/);
});
