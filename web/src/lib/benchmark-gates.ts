import {GENERATION_CONFIG} from "./generation-config";
import type {inputUsage} from "./usage-estimate";
export function benchmarkGates(durationMs:number,baseline:{durationMs:number;inputTokens:number},usage:ReturnType<typeof inputUsage>,complete:boolean,evidence?:{claims:number;verified:number}){return {completion:complete,verification:!evidence||(evidence.claims>0&&evidence.verified/evidence.claims>=GENERATION_CONFIG.benchmark.minimumVerifiedClaimRatio),time:durationMs<=GENERATION_CONFIG.benchmark.maxDurationMs,timeReduction:1-durationMs/baseline.durationMs>=GENERATION_CONFIG.benchmark.minimumTimeReduction,input:usage.unestimatedCalls===0&&usage.total<=baseline.inputTokens*GENERATION_CONFIG.benchmark.maxInputRatioToBaseline};}

/** Public claims including grouped relatedFacts, and how many were matched against the opened original. */
export function claimVerification(evidence:readonly {kind:string;originalVerified?:boolean;relatedFacts?:readonly {originalVerified?:boolean}[]}[]){const claims=evidence.filter(e=>e.kind!=="내부 전제").flatMap(e=>[e,...(e.relatedFacts??[])]);return {claims:claims.length,verified:claims.filter(f=>f.originalVerified).length};}
