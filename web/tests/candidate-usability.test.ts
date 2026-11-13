import test from "node:test";
import assert from "node:assert/strict";
import {retainMeaningfulCandidates} from "../src/lib/candidate-usability";
import {demoCandidates,demoOutline} from "../src/lib/demo";
import type {SlideSpec} from "../src/lib/model";
const input={topic:"대안 비교",purpose:"검증",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:6};
const item=demoOutline(input)[2];
const chart=(unit:string):SlideSpec=>({...demoCandidates(input,item)[0],layoutId:"c-multi-bar",headline:"우선순위",data:{unit,categories:["A","B","C","D"],series:[{name:"비교",values:[1,2,3,4]}]}});
test("final gate removes ordinal magnitude, retains real counts and records reason",()=>{
 const result=retainMeaningfulCandidates([chart("순위"),chart("명"),chart("건")],item);
 assert.equal(result.length,2);assert.equal(result[0].quality?.suitableCandidateCount,2);assert.match(result[0].quality?.excludedCandidates?.[0]??"",/순위/);
});
test("all-invalid batches fail clearly instead of inserting fake alternatives",()=>{
 assert.throws(()=>retainMeaningfulCandidates([chart("순위")],item),/후보를 제공하지/);
});

test("rechecking cached valid choices retains excluded-slot provenance",()=>{
 const first=retainMeaningfulCandidates([chart("순위"),chart("명")],item),again=retainMeaningfulCandidates(first,item);
 assert.equal(again.length,1);assert.deepEqual(again[0].quality?.excludedCandidates,first[0].quality?.excludedCandidates);
});
