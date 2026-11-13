import {readFile,realpath,stat,writeFile,rename,unlink} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import path from "node:path";
import {persistedDeckSchema} from "./model";
import {selectionPreviewProgress} from "./local-selection-import";
const maximumBytes=24*1024*1024;
const responseHeaders={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};

export const validSelectionRunId=(id:string)=>/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(id);
export function localSelectionEnabled(){
 return !process.env.VERCEL&&process.env.DECKPICK_CLI_ONLY==="1"&&!["NEXT_PUBLIC_DEMO_ONLY","NEXT_PUBLIC_SHARED_PREVIEW","NEXT_PUBLIC_SHOWCASE_ONLY"].some(key=>process.env[key]==="1");
}
const loopback=(host:string)=>["localhost","127.0.0.1","[::1]"].includes(host);
export function isLocalSelectionRequest(request:Request){
 if(!localSelectionEnabled())return false;
 try{
  const url=new URL(request.url),host=request.headers.get("host")??url.host,browser=new URL(`${url.protocol}//${host}`);
  // Next may normalize request.url to localhost while the browser uses 127.0.0.1.
  // Both must still be loopback and use the same port; origin follows the actual Host.
  if(!loopback(url.hostname)||!loopback(browser.hostname)||browser.host!==host||browser.port!==url.port)return false;
  const forwarded=request.headers.get("x-forwarded-for");
  if(forwarded&&forwarded.split(",").some(value=>!["127.0.0.1","::1"].includes(value.trim())))return false;
  if(request.headers.has("forwarded")||request.headers.get("x-forwarded-host")&&request.headers.get("x-forwarded-host")!==host)return false;
  const site=request.headers.get("sec-fetch-site");
  if(site&&site!=="same-origin")return false;
  const origin=request.headers.get("origin")??request.headers.get("referer");
  return origin?new URL(origin).origin===browser.origin:site==="same-origin";
 }catch{return false;}
}
export function selectionPreviewPath(id:string){
 if(!validSelectionRunId(id))throw Error("Invalid selection run ID");
 return path.resolve(process.cwd(),".generation-runs","selection-previews",`${id}.json`);
}
async function readPreview(file:string){
 const base=await realpath(path.dirname(file)),actual=await realpath(file);
 if(path.dirname(actual)!==base)throw Error("Selection preview path escaped its directory");
 const details=await stat(actual);
 if(!details.isFile()||details.size>maximumBytes)throw Error("Invalid selection preview file");
 return readFile(actual,"utf8");
}
/** Unknown credential fields never cross the local import boundary. */
function withoutSecrets(value:unknown):unknown{
 if(typeof value==="string")return value.replace(/sk-(?:proj-)?[A-Za-z0-9_-]{25,}/g,"[비밀키 제외]");
 if(Array.isArray(value))return value.map(withoutSecrets);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([key])=>! /^(?:api[_-]?key|authorization|credentials?|access[_-]?token|refresh[_-]?token|password|secret)$/i.test(key)).map(([key,item])=>[key,withoutSecrets(item)]));
 return value;
}
export async function selectionPreviewResponse(request:Request,id:string,read:(file:string)=>Promise<string>=readPreview){
 const headers=responseHeaders;
 if(!isLocalSelectionRequest(request))return Response.json({code:"LOCAL_ONLY",error:"로컬 선택 화면에서만 열 수 있습니다."},{status:404,headers});
 if(!validSelectionRunId(id))return Response.json({error:"잘못된 실행 주소입니다."},{status:400,headers});
 try{
  const raw=await read(selectionPreviewPath(id));
  if(Buffer.byteLength(raw,"utf8")>maximumBytes)throw Error("Preview too large");
  const deck=persistedDeckSchema.parse(withoutSecrets(JSON.parse(raw)));
  const progress=selectionPreviewProgress(deck);
  return progress.ready?Response.json({ready:true,deck},{headers}):Response.json(progress,{status:202,headers});
 }catch(error){
  const missing=(error as NodeJS.ErrnoException)?.code==="ENOENT";
  return Response.json({code:missing?"PREVIEW_PENDING":"INVALID_PREVIEW",error:missing?"아직 후보를 준비하고 있습니다. 잠시 후 다시 열어 주세요.":"선택용 장표를 읽지 못했습니다. 실행 기록을 확인해 주세요."},{status:missing?404:422,headers});
 }
}
async function writeSelection(id:string,raw:string){
 const source=selectionPreviewPath(id),base=await realpath(path.dirname(source));
 const selected=path.join(base,`${id}.selected.json`),temporary=path.join(base,`${id}.selected.${randomUUID()}.tmp`);
 try{await writeFile(temporary,raw,{encoding:"utf8",flag:"wx",mode:0o600});await rename(temporary,selected);}
 finally{await unlink(temporary).catch(()=>{});}
}
async function boundedBody(request:Request){
 if(Number(request.headers.get("content-length")??0)>maximumBytes)throw Error("TOO_LARGE");
 const reader=request.body?.getReader();if(!reader)throw Error("EMPTY_BODY");
 const chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>maximumBytes){await reader.cancel();throw Error("TOO_LARGE");}chunks.push(item.value);}}
 finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString("utf8");
}
/** Saving is deliberately separate from the UI until the user finishes candidate selection. */
export async function selectionSaveResponse(request:Request,id:string,read:(file:string)=>Promise<string>=readPreview,write:(id:string,raw:string)=>Promise<void>=writeSelection){
 const headers=responseHeaders;
 if(!isLocalSelectionRequest(request))return Response.json({error:"로컬 선택 화면에서만 저장할 수 있습니다."},{status:404,headers});
 if(!validSelectionRunId(id))return Response.json({error:"잘못된 실행 주소입니다."},{status:400,headers});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"JSON 형식으로 저장해 주세요."},{status:415,headers});
 try{
  const parsed=JSON.parse(await boundedBody(request));
  const incoming=persistedDeckSchema.parse(withoutSecrets(parsed.deck));
  const previous=persistedDeckSchema.parse(withoutSecrets(JSON.parse(await read(selectionPreviewPath(id)))));
  if(incoming.id!==previous.id||JSON.stringify(incoming.input)!==JSON.stringify(previous.input))return Response.json({error:"이 실행과 다른 작업은 저장할 수 없습니다."},{status:409,headers});
  if(!selectionPreviewProgress(incoming).ready||!selectionPreviewProgress(previous).ready)return Response.json({error:"모든 장의 후보가 준비된 뒤 저장할 수 있습니다."},{status:409,headers});
  const raw=JSON.stringify(incoming);if(Buffer.byteLength(raw,"utf8")>maximumBytes)throw Error("TOO_LARGE");
  await write(id,raw);
  return Response.json({saved:true,id:incoming.id},{headers});
 }catch(error){
  const status=error instanceof Error&&error.message==="TOO_LARGE"?413:(error as NodeJS.ErrnoException)?.code==="ENOENT"?404:422;
  return Response.json({error:status===413?"저장할 작업이 24MB를 넘습니다.":"선택한 작업을 저장하지 못했습니다. 실행과 입력 내용을 확인해 주세요."},{status,headers});
 }
}
