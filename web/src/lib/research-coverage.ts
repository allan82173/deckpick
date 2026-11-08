import type {ResearchRecord} from "./evidence-model";
import {GENERATION_CONFIG} from "./generation-config";
/** Count independently sourced, original-verified facts per question, including deduplicated facts. */
export function applyResearchCoverage(record:ResearchRecord,options:{autoProceed?:boolean}={}):ResearchRecord{
 const autoProceed=options.autoProceed??GENERATION_CONFIG.autoProceedLimitedEvidence;
 if(!record.analysis||record.searchStatus==="not-requested")return record;
 const coverage=record.analysis.questions.filter(q=>q.needsPublicEvidence).map(q=>{
  const facts=record.evidence.filter(e=>e.kind==="공개 사실"&&!!e.url).flatMap(e=>[{...e,questionIds:e.primaryQuestionIds??e.questionIds},...(e.relatedFacts??[]).map(f=>({...f,id:e.id,url:e.url}))]).filter(f=>f.questionIds?.includes(q.id)&&f.originalVerified);
  const exact=new Set(facts.filter(f=>f.contextMatch==="일치").map(f=>f.url));
  const partialFacts=facts.filter(f=>f.contextMatch==="부분 일치"&&!exact.has(f.url));
  const partial=new Set(partialFacts.map(f=>f.url));
  const status=exact.size>=GENERATION_CONFIG.research.matchingEvidencePerQuestion?"exact":exact.size+partial.size>=GENERATION_CONFIG.research.partialStopEvidence?"substituted":"insufficient";
  const scope=record.analysis!.publicContext.filter(c=>["지역","시장","대상","기간"].includes(c.dimension)).map(c=>`${c.dimension}: ${c.value}`).join(" · ");
  const reasons=[...new Set(partialFacts.map(f=>f.contextReason).filter((v):v is string=>!!v))].slice(0,2).join(" / ");
  const description=status==="exact"?`요청 범위와 일치하는 원문 확인 출처 ${exact.size}개를 사용합니다.`:status==="substituted"?`요청 범위에 정확히 맞는 출처는 ${exact.size}개이며, 원문으로 확인된 부분 일치 출처 ${partial.size}개를 함께 사용합니다. 요청 범위: ${scope||q.publicQuestion}. 대체 자료의 범위: ${reasons||"일부 맥락만 일치하는 공개 자료이며 요청 대상 전체로 일반화하지 않습니다."}`:`원문 확인 출처: 정확히 일치 ${exact.size}개, 부분 일치 ${partial.size}개. ${scope?`요청 범위: ${scope}. `:""}현재 자료 범위로 초안을 만들거나 추가 자료로 보완할 수 있습니다.`;
  return {questionId:q.id,question:q.question,status:status as "exact"|"substituted"|"insufficient",exactSources:exact.size,partialSources:partial.size,evidenceRefs:[...new Set(facts.filter(f=>f.contextMatch==="일치"||f.contextMatch==="부분 일치").map(f=>f.id))],description};
 });
 const gaps=coverage.filter(c=>c.status==="insufficient").map(c=>({questionId:c.questionId,question:c.question,missing:c.description}));
 const substitutions=coverage.filter(c=>c.status==="substituted");
 const notice=record.notice.split("\n근거 범위 안내:")[0]+(substitutions.length?"\n근거 범위 안내: "+substitutions.map(c=>c.description).join("\n"):"");
 // 근거가 전혀 없을 때만 확인을 요청한다. 사용할 근거가 있으면 부족한 범위를 안내에 남기고 그대로 진행한다.
 // 검색 장애로 공개 근거가 하나도 없을 때는 범위 문제가 아니라 장애이므로 확인을 유지한다.
 const usable=record.evidence.some(e=>e.kind==="공개 사실"&&!!e.url);
 const auto=autoProceed&&!!gaps.length&&usable&&!record.acceptedLimits;
 const autoNotice=auto?"\n근거 범위 안내: 일부 질문은 요청 범위에 맞는 공개 근거가 부족해 현재 자료 범위로 자동 진행했습니다. 해당 판단은 가설로 표시하고 확인 방법을 함께 제시합니다.":"";
 return {...record,coverage,gaps,requiresReview:!!gaps.length&&!record.acceptedLimits&&!auto,acceptedLimits:!!record.acceptedLimits||auto||(!gaps.length&&!!substitutions.length),notice:notice+autoNotice};
}
