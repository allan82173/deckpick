import { GENERATION_CONFIG } from "./generation-config";
export async function mapConcurrent<T,R>(items:readonly T[],worker:(item:T,index:number)=>Promise<R>,limit=GENERATION_CONFIG.efficiency.concurrency):Promise<PromiseSettledResult<R>[]>{
 const results:PromiseSettledResult<R>[]=new Array(items.length);let cursor=0;
 await Promise.all(Array.from({length:Math.min(Math.max(1,limit),items.length)},async()=>{while(cursor<items.length){const index=cursor++;try{results[index]={status:"fulfilled",value:await worker(items[index],index)};}catch(reason){results[index]={status:"rejected",reason};}}}));return results;
}
let active=0;const waiters:(()=>void)[]=[];
export async function providerSlot<T>(fn:()=>Promise<T>,signal:AbortSignal):Promise<T>{
 if(active>=GENERATION_CONFIG.efficiency.concurrency)await new Promise<void>(resolve=>waiters.push(resolve));else active++;
 let abort:()=>void=()=>{};
 try{if(signal.aborted)throw new Error("Request aborted");const stopped=new Promise<never>((_,reject)=>{abort=()=>reject(new Error("Request aborted"));signal.addEventListener("abort",abort,{once:true});});return await Promise.race([fn(),stopped]);}
 finally{signal.removeEventListener("abort",abort);const next=waiters.shift();if(next)next();else active--;}
}
