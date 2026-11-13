import test from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {storyLayoutGuidance,storyResponseSchema} from "../src/lib/storyline";
import {slideRoles} from "../src/lib/evidence-model";
import {roleLayouts} from "../src/lib/slide-quality";
import {expandedKind,expandedRegistry} from "../src/lib/expanded-layouts";

test("normalized storyline layout guidance preserves every role ID and descriptor field",()=>{
 for(const deckType of ["consulting","marketing"] as const){
  const previous=Object.fromEntries(slideRoles.map(role=>[role,roleLayouts(deckType,role).map(id=>({id,...(expandedKind(id)?expandedRegistry[expandedKind(id)!]:{})}))]));
  const normalized=storyLayoutGuidance(deckType);
  for(const role of slideRoles){
   assert.deepEqual(normalized.roleLayouts[role],roleLayouts(deckType,role));
   assert.deepEqual(normalized.roleLayouts[role].map(id=>normalized.layoutCatalog[id]),previous[role]);
  }
  assert.equal(Object.keys(normalized.layoutCatalog).length,new Set(Object.values(previous).flat().map(item=>item.id)).size);
  assert.ok(JSON.stringify(normalized).length<JSON.stringify({availableLayouts:previous}).length,"normalization removes repeated descriptors without deleting guidance");
 }
});

test("story wire requires the exact requested count and excludes saved candidate metadata",()=>{
 const schema=storyResponseSchema(20),wire=z.toJSONSchema(schema,{unrepresentable:"any"});
 const item={section:"전략",message:"고객 접점이 경쟁의 초점입니다.",contentHint:"근거와 판단을 함께 보여 줍니다.",role:"판단",evidenceRefs:["1"],claimType:"추론",calculation:null,argument:{questionId:"Q1",judgment:"접점 우선",support:[{text:"확인한 근거",evidenceRefs:["1"]}],reversalCondition:"채택이 줄면 재검토",limitation:"가정 포함",transition:"실행으로 연결",visualIntent:"판단과 근거의 연결",preferredLayouts:["c-evidence-convergence"]}};
 const outlineDraft=Array.from({length:20},(_,index)=>({...item,index}));
 assert.equal(schema.safeParse({reply:"설계 완료",outlineDraft}).success,true);
 assert.equal(schema.safeParse({reply:"설계 완료",outlineDraft:outlineDraft.slice(0,19)}).success,false);
 assert.equal(schema.safeParse({reply:"설계 완료",outlineDraft:[...outlineDraft,{...item,index:20}]}).success,false);
 const array=(wire.properties as Record<string,any>).outlineDraft;
 assert.equal(array.minItems,20);assert.equal(array.maxItems,20);
 assert.equal("acceptedCandidateCount" in array.items.properties,false);
 assert.ok("contentContract" in array.items.properties,"content-preservation contracts remain available");
});
