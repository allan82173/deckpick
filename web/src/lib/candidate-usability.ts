import type { Evidence } from "./evidence-model";
import type { OutlineItem, SlideSpec } from "./model";
import { inspectChartSemantics } from "./chart-semantics";

/** Final gate after bounded repair: never fill an empty slot with misleading data. */
export function retainMeaningfulCandidates(candidates:SlideSpec[],item:OutlineItem,evidence:Evidence[]=[]):SlideSpec[]{
 const decisions=candidates.map(slide=>({slide,issues:inspectChartSemantics(slide,item,evidence).filter(issue=>issue.severity==="reject")}));
 const excluded=[...new Set([...candidates.flatMap(slide=>slide.quality?.excludedCandidates??[]),...decisions.flatMap(({slide,issues})=>issues.length?[`${slide.layoutId}: ${issues.map(issue=>issue.reason).join(" / ")}`.slice(0,1000)]:[])])].slice(0,3);
 const valid=decisions.filter(entry=>!entry.issues.length).map(entry=>entry.slide);
 // Preferred layout wins ties. A variant missing required facts cannot outrank
 // an already generated variant that preserves those facts. No extra call.
 const missing=(slide:SlideSpec)=>(slide.quality?.warnings??[]).filter(w=>/^(?:필수 내용|계산 결과 누락|비교 기준 누락|인용 \d)/.test(w)).length;
 const geometry=(s:SlideSpec)=>(s.quality?.rendererWarnings??[]).length;
 const visual=(s:SlideSpec)=>s.quality?.visual?.status==="failed"?100:(s.quality?.visual?.warnings.length??0);
 valid.sort((a,b)=>missing(a)-missing(b)||geometry(a)-geometry(b)||visual(a)-visual(b));
 if(!valid.length)throw new Error("측정 근거 없는 순위·점수 그래프가 남아 후보를 제공하지 않았습니다. 번호 목록·정성 비교 형식으로 다시 생성해 주세요.");
 return valid.map(slide=>({...slide,quality:{warnings:[],fillRatio:0,attempts:0,...slide.quality,suitableCandidateCount:valid.length,excludedCandidates:excluded}}));
}
