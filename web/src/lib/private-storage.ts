import path from "node:path";
import * as fs from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {get,put,list} from "@vercel/blob";
export function cloudStorage(){return process.env.VERCEL==="1";}
export function privateKey(file:string){const relative=path.relative(process.cwd(),file);if(relative.startsWith("..")||path.isAbsolute(relative))throw Error("허용되지 않은 저장 위치입니다.");return "deckpick/"+relative.split(path.sep).join("/");}
export async function storageMkdir(directory:string,options?:{recursive?:boolean}){if(!cloudStorage())await fs.mkdir(directory,options);}
export async function storageRead(file:string,encoding:"utf8"):Promise<string>;
export async function storageRead(file:string):Promise<Buffer>;
export async function storageRead(file:string,encoding?:"utf8"):Promise<string|Buffer>{
 if(!cloudStorage())return encoding?fs.readFile(file,encoding):fs.readFile(file);
 const blob=await get(privateKey(file),{access:"private",useCache:false});if(!blob||blob.statusCode!==200)throw Error("저장 자료를 찾지 못했습니다.");const bytes=Buffer.from(await new Response(blob.stream).arrayBuffer());return encoding?bytes.toString(encoding):bytes;
}
export async function storageWrite(file:string,data:string|Uint8Array,options?:unknown){
 if(!cloudStorage()){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data,options as Parameters<typeof fs.writeFile>[2]);return;}
 await put(privateKey(file),typeof data==="string"?data:Buffer.from(data),{access:"private",addRandomSuffix:false,allowOverwrite:true,contentType:typeof data==="string"?"application/json":"application/octet-stream"});
}
export async function storageList(directory:string):Promise<string[]>{
 if(!cloudStorage())return fs.readdir(directory);
 const prefix=privateKey(directory)+"/";let cursor:string|undefined;const names:string[]=[];
 do{const page=await list({prefix,cursor,limit:1000});for(const b of page.blobs){const name=b.pathname.slice(prefix.length);if(!name.includes("/"))names.push(name);}cursor=page.hasMore?page.cursor:undefined;}while(cursor);return names;
}
export async function storageAppend(file:string,data:string,options?:unknown){if(!cloudStorage()){await fs.appendFile(file,data,options as Parameters<typeof fs.appendFile>[2]);return;}await storageWrite(file+".events/"+Date.now()+"-"+randomUUID()+".json",data);}
