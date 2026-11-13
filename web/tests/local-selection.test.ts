import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {forest} from "../src/lib/design";
import type {Deck} from "../src/lib/model";
import {selectionPreviewResponse,selectionPreviewPath,selectionSaveResponse} from "../src/lib/local-selection-access";
import {importLocalSelection,previouslyImportedSelection} from "../src/lib/local-selection-import";
import {loadDeckArchive} from "../src/lib/deck-session";
import {GET} from "../src/app/api/local-selection/[runId]/route";

function fixture(id="selection-fixture"):Deck{return {id,input:{topic:"공개 자료 기반 새 주제",purpose:"후보 비교",audience:"의사결정자",slideCount:5,deckType:"consulting",designSystemId:"ict-forest"},designSystem:forest,demo:false,research:[],outline:Array.from({length:5},(_,index)=>({index,section:index?"본문":"표지",message:"제목",contentHint:""})),candidates:Object.fromEntries(Array.from({length:5},(_,index)=>[index,[{layoutId:"c-cover",section:"표지",headline:"기존 제목",data:{title:"원본 제목"},sources:[]}]])),picked:{0:0},edited:{},chat:{setup:[],outline:[],slides:{}}};}
function shelf(){const map=new Map<string,string>();return {getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);},key:(index:number)=>[...map.keys()][index]??null,get length(){return map.size;}};}
const request=(url="http://127.0.0.1:3100/api/local-selection/run-1",headers:HeadersInit={origin:"http://127.0.0.1:3100"})=>new Request(url,{headers});
async function local(action:()=>Promise<void>){
 const names=["VERCEL","DECKPICK_CLI_ONLY","NEXT_PUBLIC_DEMO_ONLY","NEXT_PUBLIC_SHARED_PREVIEW","NEXT_PUBLIC_SHOWCASE_ONLY"],old=names.map(name=>process.env[name]);
 names.forEach(name=>delete process.env[name]);process.env.DECKPICK_CLI_ONLY="1";
 try{await action();}finally{names.forEach((name,index)=>{if(old[index]===undefined)delete process.env[name];else process.env[name]=old[index];});}
}
test("local selection accepts only the validated run filename and a schema-checked deck",()=>local(async()=>{
 let file="";const response=await selectionPreviewResponse(request(),"run-1",async value=>{file=value;return JSON.stringify({...fixture(),credentials:{key:"not a credential"}});});
 assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");
 assert.equal(file,path.resolve(".generation-runs/selection-previews/run-1.json"));
 const result=await response.json();assert.equal(result.deck.id,"selection-fixture");assert.equal(result.deck.credentials,undefined);
 assert.equal((await selectionPreviewResponse(request(),"run-1",async()=>JSON.stringify({id:"invalid"}))).status,422);
}));
test("path traversal and invalid run IDs never reach the filesystem",()=>local(async()=>{
 let reads=0;for(const id of ["..","../config","a/b","a\\b","%2e%2e","run.json","a".repeat(97)]){
  assert.throws(()=>selectionPreviewPath(id));assert.equal((await selectionPreviewResponse(request(),id,async()=>{reads++;return "{}";})).status,400);
 }assert.equal(reads,0);
}));
test("public, Vercel, cross-origin and non-loopback requests never read local preview files",()=>local(async()=>{
 let reads=0;const reader=async()=>{reads++;return JSON.stringify(fixture());};
 for(const name of ["VERCEL","NEXT_PUBLIC_DEMO_ONLY","NEXT_PUBLIC_SHARED_PREVIEW","NEXT_PUBLIC_SHOWCASE_ONLY"]){process.env[name]="1";assert.equal((await selectionPreviewResponse(request(),"run-1",reader)).status,404);delete process.env[name];}
 for(const req of [request("https://deckpick.vercel.app/api/local-selection/run-1",{origin:"https://deckpick.vercel.app"}),request(undefined,{origin:"https://outside.example"}),request(undefined,{origin:"http://127.0.0.1:3100","sec-fetch-site":"cross-site"}),request(undefined,{}),request(undefined,{origin:"http://127.0.0.1:3100",host:"localhost:3100"}),request(undefined,{origin:"http://127.0.0.1:3100","x-forwarded-for":"198.51.100.1"})])assert.equal((await selectionPreviewResponse(req,"run-1",reader)).status,404);
 assert.equal(reads,0);
}));
test("same-origin browser fetch without Origin works, missing route returns a safe message",()=>local(async()=>{
 assert.equal((await selectionPreviewResponse(request(undefined,{"sec-fetch-site":"same-origin",referer:"http://127.0.0.1:3100/local-selection/run-1"}),"run-1",async()=>JSON.stringify(fixture()))).status,200);
 const missing=await GET(request(),{params:Promise.resolve({runId:`missing-${crypto.randomUUID()}`})});assert.equal(missing.status,404);assert.match((await missing.json()).error,/준비/);
}));
test("Next loopback hostname normalization preserves the real same-port browser origin",()=>local(async()=>{
 const req=request("http://localhost:3100/api/local-selection/run-1",{host:"127.0.0.1:3100",origin:"http://127.0.0.1:3100","sec-fetch-site":"same-origin","x-forwarded-host":"127.0.0.1:3100","x-forwarded-for":"127.0.0.1"});
 assert.equal((await selectionPreviewResponse(req,"run-1",async()=>JSON.stringify(fixture()))).status,200);
 let reads=0;const differentPort=request("http://localhost:3100/api/local-selection/run-1",{host:"127.0.0.1:3200",origin:"http://127.0.0.1:3200"});
 assert.equal((await selectionPreviewResponse(differentPort,"run-1",async()=>{reads++;return "{}";})).status,404);assert.equal(reads,0);
}));
test("unknown secret fields are stripped even within permissive slide data",()=>local(async()=>{
 const deck=fixture();deck.candidates[0][0].data.apiKey="not a credential";deck.candidates[0][0].data.title="sk-"+"z".repeat(30);
 const result=await(await selectionPreviewResponse(request(),"run-1",async()=>JSON.stringify(deck))).json();
 assert.equal(result.deck.candidates[0][0].data.apiKey,undefined);assert.equal(result.deck.candidates[0][0].data.title,"[비밀키 제외]");
}));
test("import archives the current work and repeated visits preserve user edits and selection",()=>{
 const storage=shelf(),old=fixture("previous"),incoming=fixture();
 const first=importLocalSelection(storage,"run-1",incoming,old);assert.equal(loadDeckArchive(storage,old.id)?.id,old.id);assert.equal(first.id,incoming.id);assert.equal(first.generation?.status,"awaiting-review");assert.equal(first.generation?.runId,"run-1");
 const edited={...first,edited:{0:{...first.candidates[0][0],headline:"사용자가 수정한 제목"}}};
 const again=importLocalSelection(storage,"run-1",incoming,edited);assert.equal(again.edited[0].headline,"사용자가 수정한 제목");
 assert.equal(previouslyImportedSelection(storage,"run-1",old)?.edited[0].headline,"사용자가 수정한 제목");
 assert.equal(JSON.parse(storage.getItem("deckpick-deck")!).edited[0].headline,"사용자가 수정한 제목");
});
test("an import marker with missing local work never overwrites it from an old runner snapshot",()=>{
 const storage=shelf();storage.setItem("deckpick-selection-import:run-1","missing-work");
 assert.throws(()=>importLocalSelection(storage,"run-1",fixture(),null),/이미 불러온/);
 assert.equal(storage.getItem("deckpick-deck"),null);
});
test("partial snapshots return progress without a deck and cannot overwrite or mark browser work",()=>local(async()=>{
 const partial=fixture();delete partial.candidates[2];delete partial.candidates[4];
 const response=await selectionPreviewResponse(request(),"run-1",async()=>JSON.stringify(partial));
 assert.equal(response.status,202);assert.deepEqual(await response.json(),{ready:false,completed:3,total:5});
 const storage=shelf(),current=fixture("old-work");storage.setItem("deckpick-deck",JSON.stringify(current));
 assert.throws(()=>importLocalSelection(storage,"run-1",partial,current),/준비/);
 assert.equal(JSON.parse(storage.getItem("deckpick-deck")!).id,current.id);assert.equal(storage.getItem("deckpick-selection-import:run-1"),null);
 partial.outline=partial.outline.slice(0,3);partial.candidates=fixture().candidates;
 assert.equal((await selectionPreviewResponse(request(),"run-1",async()=>JSON.stringify(partial))).status,202);
}));
const post=(deck:unknown,origin="http://127.0.0.1:3100")=>new Request("http://127.0.0.1:3100/api/local-selection/run-1",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({deck})});
test("selected-deck save keeps edits only for the matching completed run and input",()=>local(async()=>{
 const original=fixture(),edited=structuredClone(original);edited.edited[0]={...edited.candidates[0][0],headline:"선택 후 수정"};
 let savedId="",saved="",writes=0;
 const read=async()=>JSON.stringify(original),write=async(id:string,raw:string)=>{savedId=id;saved=raw;writes++;};
 const response=await selectionSaveResponse(post(edited),"run-1",read,write);
 assert.equal(response.status,200);assert.equal(savedId,"run-1");assert.equal(JSON.parse(saved).edited[0].headline,"선택 후 수정");
 for(const other of [{...edited,id:"other"},{...edited,input:{...edited.input,topic:"다른 주제"}}])assert.equal((await selectionSaveResponse(post(other),"run-1",read,write)).status,409);
 const partial=structuredClone(edited);delete partial.candidates[3];assert.equal((await selectionSaveResponse(post(partial),"run-1",read,write)).status,409);assert.equal(writes,1);
}));
test("remote or oversized selected-deck save cannot read or write the filesystem",()=>local(async()=>{
 let reads=0,writes=0;const read=async()=>{reads++;return JSON.stringify(fixture());},write=async()=>{writes++;};
 assert.equal((await selectionSaveResponse(post(fixture(),"https://outside.example"),"run-1",read,write)).status,404);
 process.env.VERCEL="1";assert.equal((await selectionSaveResponse(post(fixture()),"run-1",read,write)).status,404);delete process.env.VERCEL;
 const huge=post(fixture());huge.headers.set("content-length",String(25*1024*1024));assert.equal((await selectionSaveResponse(huge,"run-1",read,write)).status,413);
 assert.equal(reads,0);assert.equal(writes,0);
}));
