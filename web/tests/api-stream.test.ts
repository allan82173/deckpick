import test from "node:test";
import assert from "node:assert/strict";
import {streamApiResponse,readApiResponse} from "../src/lib/api-stream";

test("long request sends heartbeat before work finishes and executes once",async()=>{
 let complete!:(r:Response)=>void,calls=0;
 const pending=new Promise<Response>(resolve=>complete=resolve);
 const response=streamApiResponse(()=>{calls++;return pending;},10);
 const reader=response.body!.getReader();
 assert.match(new TextDecoder().decode((await reader.read()).value),/heartbeat/);
 assert.match(new TextDecoder().decode((await reader.read()).value),/heartbeat/);
 reader.releaseLock();complete(Response.json({reply:"완료"}));
 const final=await readApiResponse(response);
 assert.equal(final.status,200);assert.equal((await final.json()).reply,"완료");assert.equal(calls,1);
});
test("streamed API failure retains original status and safe error",async()=>{
 const final=await readApiResponse(streamApiResponse(async()=>Response.json({error:"근거 부족"},{status:409}),10));
 assert.equal(final.status,409);assert.equal((await final.json()).error,"근거 부족");
});
test("transport wrapper catches finalization failure without exposing exception details",async()=>{
 const final=await readApiResponse(streamApiResponse(async()=>{throw Error("private diagnostic");},10));
 assert.equal(final.status,500);assert.doesNotMatch(JSON.stringify(await final.json()),/private diagnostic/);
});
test("split UTF-8 chunks and heartbeat lines preserve final JSON",async()=>{
 const bytes=new TextEncoder().encode(JSON.stringify({type:"heartbeat"})+"\n"+JSON.stringify({type:"result",status:200,body:{reply:"안녕하세요"}})+"\n");
 const stream=new ReadableStream<Uint8Array>({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}});
 const final=await readApiResponse(new Response(stream,{headers:{"Content-Type":"application/x-ndjson"}}));
 assert.equal((await final.json()).reply,"안녕하세요");
});
test("premature disconnect is a failure, never an empty success",async()=>{
 await assert.rejects(()=>readApiResponse(new Response('{"type":"heartbeat"}\n',{headers:{"Content-Type":"application/x-ndjson"}})),/연결이 끊겼습니다/);
 const json=Response.json({ok:true});assert.equal(await readApiResponse(json),json);
});
