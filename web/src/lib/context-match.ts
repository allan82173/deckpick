import {z} from "zod";
import type {TaskAnalysis} from "./task-model";
export const contextMatchValues=["일치","부분 일치","비교 참고","불명확"] as const;
export const contextCheckSchema=z.object({dimension:z.enum(["지역","시장","기관","기간","대상","기타"]),value:z.string(),match:z.enum(["일치","부분 일치","불일치","불명확"]),reason:z.string().max(500)});
export type ContextCheck=z.infer<typeof contextCheckSchema>;
const norm=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/\s+/g,"");
/** Company/product names are intentionally absent. Only task public-context items count. */
export function classifyContext(context:TaskAnalysis["publicContext"],checks:ContextCheck[]=[]){
 const approved=checks.filter(c=>context.some(p=>p.dimension===c.dimension&&norm(p.value)===norm(c.value)));
 const relevant=context.filter(c=>["지역","시장","대상"].includes(c.dimension));
 const groups=(dimension:string)=>relevant.filter(c=>c.dimension===dimension).map(p=>approved.find(c=>c.dimension===p.dimension&&norm(c.value)===norm(p.value))?.match??"불명확");
 const region=groups("지역"),market=groups("시장"),target=groups("대상");
 const full=(a:string[])=>a.length>0&&a.every(s=>s==="일치");
 const regionMatch=!region.length||full(region),focusMatch=full(market)||full(target)||!market.length&&!target.length;
 const result=!relevant.length?"불명확":regionMatch&&focusMatch?"일치":approved.some(c=>["지역","시장","대상"].includes(c.dimension)&&["일치","부분 일치"].includes(c.match))?"부분 일치":approved.some(c=>["지역","시장","대상"].includes(c.dimension)&&c.match==="불일치")?"비교 참고":"불명확";
 const reason=context.map(p=>{const c=approved.find(c=>c.dimension===p.dimension&&norm(c.value)===norm(p.value));return `${p.dimension} ${p.value}: ${c?.match??"불명확"}${c?" ("+c.reason+")":" (항목별 판정 없음)"}`;}).join(" / ");
 return {contextMatch:result,contextReason:reason.slice(0,500),contextChecks:approved} as const;
}
export function evidenceContextCounts(rows:{kind:string;contextMatch?:string;originalVerified?:boolean}[]){const publicRows=rows.filter(r=>r.kind==="공개 사실");return {publicRows:publicRows.length,matched:publicRows.filter(r=>r.contextMatch==="일치").length,partial:publicRows.filter(r=>r.contextMatch==="부분 일치").length,comparison:publicRows.filter(r=>r.contextMatch==="비교 참고").length,unknown:publicRows.filter(r=>!r.contextMatch||r.contextMatch==="불명확").length,originalVerified:publicRows.filter(r=>r.originalVerified).length};}
export function comparableEvidenceCounts(rows:{kind:string;claim:string;url:string;contextMatch?:string;originalVerified?:boolean;relatedFacts?:{claim:string;contextMatch?:string;originalVerified?:boolean}[]}[]){
 const facts=rows.filter(r=>r.kind==="공개 사실").flatMap(r=>[{kind:r.kind,claim:r.claim,url:r.url,contextMatch:r.contextMatch,originalVerified:r.originalVerified},...(r.relatedFacts??[]).map(f=>({...f,kind:r.kind,url:r.url}))]);
 const unique=[...new Map(facts.map(f=>[f.url+"|"+norm(f.claim),f])).values()],sources=new Map<string,typeof unique[number]>();
 const rank=(s?:string)=>s==="일치"?3:s==="부분 일치"?2:s==="비교 참고"?1:0;
 for(const f of unique){const old=sources.get(f.url);if(!old)sources.set(f.url,f);else sources.set(f.url,{...old,contextMatch:rank(f.contextMatch)>rank(old.contextMatch)?f.contextMatch:old.contextMatch,originalVerified:old.originalVerified||f.originalVerified});}
 return {recordRows:evidenceContextCounts(rows),distinctClaims:evidenceContextCounts(unique),distinctUrls:evidenceContextCounts([...sources.values()])};
}
