import {applyResearchCoverage} from "@/lib/research-coverage";
import type {ResearchRecord} from "@/lib/evidence-model";
export function ResearchScopeNotice({record}:{record?:ResearchRecord}){
 if(record)record=applyResearchCoverage(record);
 if(!record||record.searchStatus==="not-requested"||record.requiresReview)return null;
 const substitutions=record.coverage?.filter(c=>c.status==="substituted")??[];
 if(!substitutions.length)return null;
 return <section className="notice" role="status"><strong>확인된 공개 자료 범위로 진행합니다.</strong>{substitutions.map(c=><p key={c.questionId}>{c.description}</p>)}</section>;
}
