import { AsyncLocalStorage } from "node:async_hooks";
import { GENERATION_CONFIG } from "./generation-config";
import type { CallMetric, Execution,EvidenceScope } from "./execution-model";
const scope=new AsyncLocalStorage<Execution>();
export function recordCall(metric: CallMetric) { scope.getStore()?.calls.push(metric); }
export function recordEvidenceScope(metric:Omit<EvidenceScope,"id">){const execution=scope.getStore();if(execution)(execution.evidenceScopes??=[]).push({id:crypto.randomUUID(),...metric});}
export async function withExecution<T>(fn:()=>Promise<T>):Promise<{result:T;execution:Execution}> {
  const startedAt=new Date().toISOString();
  const execution:Execution={startedAt,updatedAt:startedAt,calls:[],config:structuredClone(GENERATION_CONFIG)};
  const result=await scope.run(execution,fn);execution.updatedAt=new Date().toISOString();return {result,execution};
}
