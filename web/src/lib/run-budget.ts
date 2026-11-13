import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { GENERATION_CONFIG } from "./generation-config";
type BudgetName=keyof typeof GENERATION_CONFIG.reliability.deadlines;
const scope=new AsyncLocalStorage<{signal:AbortSignal;deadline:number}>();
export class BudgetTimeout extends Error {status=504;constructor(public stage:string){super(`${stage} 단계 시간 제한을 초과했습니다. 중간 저장 지점에서 이어서 생성할 수 있습니다.`);}}
export function remainingBudgetMs(){const store=scope.getStore();return store?store.deadline-Date.now():Infinity;}
export function assertBudget(){if(scope.getStore()?.signal.aborted)throw new BudgetTimeout("현재");}
export const localCliBudget = () => process.env.DECKPICK_CLI_ONLY === "1" && process.env.VERCEL !== "1";
export function providerTimeout(stage?:string){if(localCliBudget())return stage==="story"?GENERATION_CONFIG.localCli.storyTimeoutMs:GENERATION_CONFIG.localCli.providerTimeoutMs;const byStage=GENERATION_CONFIG.providerTimeoutMsByStage as Record<string,number|undefined>;return Math.min((stage&&byStage[stage])||GENERATION_CONFIG.providerTimeoutMs,process.env.VERCEL==="1"?GENERATION_CONFIG.hosting.stageBudgetMs-GENERATION_CONFIG.hosting.providerReserveMs:Infinity);}
export function providerSignal(stage?:string){assertBudget();const signal=AbortSignal.timeout(providerTimeout(stage));return scope.getStore()?AbortSignal.any([signal,scope.getStore()!.signal]):signal;}
export async function retryDelay(attempt:number){assertBudget();await delay(GENERATION_CONFIG.reliability.backoffMs*2**attempt,undefined,{signal:scope.getStore()?.signal});assertBudget();}
export async function withBudget<T>(name:BudgetName,fn:()=>Promise<T>,overrideMs?:number):Promise<T>{
 const parent=scope.getStore(),deadline=Math.min(parent?.deadline??Infinity,Date.now()+Math.min(overrideMs??(localCliBudget()?GENERATION_CONFIG.localCli.deadlines[name]:GENERATION_CONFIG.reliability.deadlines[name]),process.env.VERCEL==="1"?GENERATION_CONFIG.hosting.stageBudgetMs:Infinity));
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
 const signal=parent?AbortSignal.any([parent.signal,controller.signal]):controller.signal;
 const expiration=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new BudgetTimeout(name));},Math.max(0,deadline-Date.now()));});
 try{return await scope.run({signal,deadline},()=>Promise.race([fn(),expiration]));}catch(error){if(signal.aborted)throw new BudgetTimeout(name);throw error;}finally{clearTimeout(timer!);}
}
