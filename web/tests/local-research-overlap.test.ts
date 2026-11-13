import test from "node:test";
import assert from "node:assert/strict";
import {mapConcurrent} from "../src/lib/concurrency";
import {withLocalAgentSlot} from "../src/lib/local-agent";
import {researchQuestionWorkers} from "../src/lib/research-questions";
import {GENERATION_CONFIG} from "../src/lib/generation-config";

test("local question workers overlap HTTP reads while CLI calls stay serialized",async()=>{
 assert.equal(researchQuestionWorkers(true),2);
 assert.equal(researchQuestionWorkers(false),GENERATION_CONFIG.research.questionConcurrency);
 let cliActive=0,cliPeak=0,httpActive=0,httpOverlappedWithCli=false;
 const visits:string[]=[];
 const cli=async(id:string,step:string)=>withLocalAgentSlot(()=>new AbortController().signal,async()=>{
  cliActive++;cliPeak=Math.max(cliPeak,cliActive);visits.push(`${id}:${step}`);
  await new Promise(resolve=>setTimeout(resolve,10));
  if(httpActive)httpOverlappedWithCli=true;
  cliActive--;
 });
 const results=await mapConcurrent(["Q1","Q2"],async id=>{
  await cli(id,"search");
  httpActive++;
  await new Promise(resolve=>setTimeout(resolve,35));
  httpActive--;
  await cli(id,"extract");
  return id;
 },researchQuestionWorkers(true));
 assert.equal(cliPeak,1,"independent question workers must not bypass the CLI transport slot");
 assert.equal(httpOverlappedWithCli,true,"HTTP wait should overlap another question's CLI request");
 assert.equal(results.every(row=>row.status==="fulfilled"),true);
 assert.deepEqual(visits.sort(),["Q1:extract","Q1:search","Q2:extract","Q2:search"]);
});
