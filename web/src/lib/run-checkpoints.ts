import { AsyncLocalStorage } from "node:async_hooks";
import { createHash,randomUUID } from "node:crypto";
import {rename} from "node:fs/promises";
import {cloudStorage,storageMkdir as mkdir,storageRead as readFile,storageWrite as writeFile,storageList as readdir,storageAppend as appendFile} from "./private-storage";
import path from "node:path";
import type { GenerationState } from "./run-state";
import { assertBudget } from "./run-budget";
import { GENERATION_CONFIG } from "./generation-config";
const scope=new AsyncLocalStorage<{id:string;directory:string;fresh:boolean}>();
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function currentRunId(){return scope.getStore()?.id;}
export function freshRun(){return scope.getStore()?.fresh??false;}
/** Recover only a compatible, completed stage from the current run directory. */
export async function recoverCheckpoint<T>(stage:string,accept:(value:unknown)=>value is T):Promise<T|undefined>{
 const run=scope.getStore();if(!run)return;
 const saved:{updatedAt:string;result:T}[]=[];
 for(const file of await readdir(run.directory)){
  if(!file.endsWith(".checkpoint.json"))continue;
  try{const row=JSON.parse(await readFile(path.join(run.directory,file),"utf8"));if(row.stage===stage&&row.status==="complete"&&accept(row.result))saved.push(row);}catch{}
 }
 saved.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));return saved[0]?.result;
}
export async function withRunContext<T>(id:string,fn:()=>Promise<T>,options:{fresh?:boolean}={}){
 if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id))throw Error("실행 ID가 올바르지 않습니다.");
 const directory=path.join(process.cwd(),".generation-runs",hash(id));await mkdir(directory,{recursive:true});return scope.run({id,directory,fresh:!!options.fresh},fn);
}
function stripCredentials(value:unknown):unknown{if(Array.isArray(value))return value.map(stripCredentials);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([key])=>!/^(?:apiKey|authorization|password|secret|credentials)$/i.test(key)).map(([key,v])=>[key,stripCredentials(v)]));return value;}
export async function checkpoint<T>(stage:string,input:unknown,fn:()=>Promise<T>,reusable:(result:T)=>boolean=()=>true):Promise<T>{
 const run=scope.getStore();if(!run)return fn();assertBudget();const file=path.join(run.directory,hash({version:GENERATION_CONFIG.checkpointVersion,stage,input})+".checkpoint.json");
 try{const saved=JSON.parse(await readFile(file,"utf8"));if(saved.status==="complete"&&reusable(saved.result as T))return saved.result as T;}catch{}
 const at=()=>new Date().toISOString();
 try{const result=await fn();assertBudget();const data={stage,status:reusable(result)?"complete":"incomplete",updatedAt:at(),result:stripCredentials(result)};if(cloudStorage())await writeFile(file,JSON.stringify(data));else{const temporary=file+"."+randomUUID()+".tmp";await writeFile(temporary,JSON.stringify(data),{mode:0o600});await rename(temporary,file);}await appendFile(path.join(run.directory,"events.jsonl"),JSON.stringify({stage,status:data.status,at:at()})+"\n",{mode:0o600});return result;}
 catch(error){await appendFile(path.join(run.directory,"events.jsonl"),JSON.stringify({stage,status:"failed",at:at(),reason:error instanceof Error?error.message:"실패"})+"\n",{mode:0o600});throw error;}
}
export async function runState(status:GenerationState["status"],error?:string):Promise<GenerationState|undefined>{
 const run=scope.getStore();if(!run)return;
 const completed:{stage:string;at:string}[]=[];for(const file of await readdir(run.directory)){if(!file.endsWith(".checkpoint.json"))continue;try{const saved=JSON.parse(await readFile(path.join(run.directory,file),"utf8"));if(saved.status==="complete")completed.push({stage:saved.stage,at:saved.updatedAt});}catch{}}
 completed.sort((a,b)=>a.at.localeCompare(b.at));return {runId:run.id,status,completedStages:completed.map(v=>v.stage),lastCompletedStage:completed.at(-1)?.stage,updatedAt:new Date().toISOString(),...(error?{error}:{})};
}
