import {GENERATION_CONFIG} from "./generation-config";
import type {inputUsage} from "./usage-estimate";
export function benchmarkGates(durationMs:number,baseline:{durationMs:number;inputTokens:number},usage:ReturnType<typeof inputUsage>,complete:boolean){return {completion:complete,time:durationMs<=GENERATION_CONFIG.benchmark.maxDurationMs,timeReduction:1-durationMs/baseline.durationMs>=GENERATION_CONFIG.benchmark.minimumTimeReduction,input:usage.unestimatedCalls===0&&usage.total<=baseline.inputTokens*GENERATION_CONFIG.benchmark.maxInputRatioToBaseline};}
