import test from "node:test";
import assert from "node:assert/strict";
import {retainMeaningfulCandidates} from "../src/lib/candidate-usability";
import {demoCandidates,demoOutline} from "../src/lib/demo";
import {expandedSample} from "../src/lib/expanded-samples";
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

test("final gate excludes a share bar and an analysis plan instead of disguising them as alternatives",()=>{
 const context={...item,index:5,section:"시장",role:"비교" as const,message:"전체 구성비는 두 집단에서 다릅니다.",contentHint:"전체100 점유율비교"};
 const badShare={...chart("%"),data:{unit:"%",mode:"누적",categories:["집단1","집단2"],series:[{name:"A",values:[60,40]},{name:"B",values:[40,60]}]}};
 const badPlan={...demoCandidates(input,item)[0],data:{points:[{title:"추가 조사",body:"고객 인터뷰를 해야 합니다."}]}} as SlideSpec;
 assert.throws(()=>retainMeaningfulCandidates([badShare,badPlan],context),/후보를 제공하지/);
 const real={...demoCandidates(input,item)[0],layoutId:"c-share-comparison",data:expandedSample("c-share-comparison")!} as SlideSpec;
 const kept=retainMeaningfulCandidates([badPlan,real],context);assert.equal(kept.length,1);assert.ok(kept[0].quality?.excludedCandidates?.length);
});
