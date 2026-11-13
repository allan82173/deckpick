import test from "node:test";
import assert from "node:assert/strict";
import {sharedSample} from "../src/lib/shared-sample";
import {persistedDeckSchema} from "../src/lib/model";
import {inspectSlide} from "../src/lib/slide-quality";

test("shared example is a complete synthetic workspace without private run records",()=>{
 assert.ok(persistedDeckSchema.safeParse(sharedSample).success);assert.equal(sharedSample.demo,true);assert.equal(sharedSample.outline.length,5);
 assert.equal(sharedSample.execution,undefined);assert.equal(sharedSample.generation,undefined);assert.equal(sharedSample.attachments,undefined);
 for(const row of sharedSample.researchRecord?.evidence??[]){assert.equal(row.kind,"내부 전제");assert.equal(row.url,"");}
 const text=JSON.stringify(sharedSample);assert.ok(!/validation-pending|C:[\\\\/]Users|sk-proj-|sk-ant-|\.cli-jobs|\.generation-runs|@gmail\.com/i.test(text));
 for(const item of sharedSample.outline){const options=sharedSample.candidates[item.index],selected=options[sharedSample.picked[item.index]];assert.ok(selected);assert.ok(options.length>=1&&options.length<=3);assert.deepEqual(inspectSlide(selected,item,sharedSample.input,sharedSample.researchRecord?.evidence??[]).warnings,[],`slide ${item.index+1}`);}
 assert.ok(!sharedSample.candidates[3].some(s=>s.layoutId.endsWith("contract-bars")));
});
