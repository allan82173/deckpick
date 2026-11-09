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
  assert.deepEqual((await (await config()).json()).serverKeys,{openai:false,anthropic:false,"claude-code":false,codex:false});
 }finally{if(prior===undefined)delete process.env.NEXT_PUBLIC_DEMO_ONLY;else process.env.NEXT_PUBLIC_DEMO_ONLY=prior;}
});
