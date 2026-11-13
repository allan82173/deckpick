import test from "node:test";
import assert from "node:assert/strict";
import {checkpoint,recoverCheckpoint,withRunContext} from "../src/lib/run-checkpoints";

test("recovery only returns completed matching evidence from its own run",async()=>{
 type Value={fingerprint:string;revision:number};
 const matching=(v:unknown):v is Value=>!!v&&typeof v==="object"&&"fingerprint" in v&&v.fingerprint==="current";
 await withRunContext(`recovery-test-${crypto.randomUUID()}`,async()=>{
  await checkpoint("evidence-table",{revision:1},async()=>({fingerprint:"current",revision:1}));
  await new Promise(resolve=>setTimeout(resolve,3));
  await checkpoint("evidence-table",{revision:2},async()=>({fingerprint:"other-input",revision:2}));
  await checkpoint("evidence-table",{revision:3},async()=>({fingerprint:"current",revision:3}),()=>false);
  await checkpoint("research-plan",{revision:4},async()=>({fingerprint:"current",revision:4}));
  assert.equal((await recoverCheckpoint("evidence-table",matching))?.revision,1);
 });
 await withRunContext(`recovery-empty-${crypto.randomUUID()}`,async()=>{
  assert.equal(await recoverCheckpoint("evidence-table",matching),undefined);
 });
});
