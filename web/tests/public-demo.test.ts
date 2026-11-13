import test from 'node:test';
import assert from 'node:assert/strict';
import {POST as ai} from '../src/app/api/[...action]/route';
import {POST as upload} from '../src/app/api/attachments/route';
import {GET as image} from '../src/app/api/attachments/[id]/route';
import {GET as config} from '../src/app/api/config/route';
test('public demo rejects provider and file routes before parsing or using credentials',async()=>{
 const prior=process.env.NEXT_PUBLIC_DEMO_ONLY;
 process.env.NEXT_PUBLIC_DEMO_ONLY='1';
 try{
  const response=await ai(new Request('https://demo.example/api/key-check',{method:'POST',body:'{}'}),{params:Promise.resolve({action:['key-check']})});
  assert.equal(response.status,403);
  assert.equal((await upload(new Request('https://demo.example/api/attachments',{method:'POST'}))).status,403);
  assert.equal((await image(new Request('https://demo.example/api/attachments/example'),{params:Promise.resolve({id:'example'})})).status,404);
  assert.deepEqual((await (await config()).json()).serverKeys,{openai:false,anthropic:false});
 }finally{if(prior===undefined)delete process.env.NEXT_PUBLIC_DEMO_ONLY;else process.env.NEXT_PUBLIC_DEMO_ONLY=prior;}
});

test('shared preview flag independently blocks AI and upload routes without a provider call',async()=>{
 const prior=process.env.NEXT_PUBLIC_SHARED_PREVIEW,oldFetch=fetch;let called=false;
 process.env.NEXT_PUBLIC_SHARED_PREVIEW='1';globalThis.fetch=async()=>{called=true;throw Error('provider must not be called');};
 try{
  assert.equal((await ai(new Request('https://shared.example/api/candidates',{method:'POST',body:'{}'}),{params:Promise.resolve({action:['candidates']})})).status,403);
  assert.equal((await upload(new Request('https://shared.example/api/attachments',{method:'POST'}))).status,403);
  assert.deepEqual((await(await config()).json()).serverKeys,{openai:false,anthropic:false});assert.equal(called,false);
 }finally{globalThis.fetch=oldFetch;if(prior===undefined)delete process.env.NEXT_PUBLIC_SHARED_PREVIEW;else process.env.NEXT_PUBLIC_SHARED_PREVIEW=prior;}
});
