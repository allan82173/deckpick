import {inputUsage} from "./usage-estimate";
import {evidenceContextCounts} from "./context-match";
import type { Deck } from "./model";
import { canvasHeadline } from "./canvas-edits";
import { draftSlide } from "./draft-workflow";
export function reportFileDate(value?:string|null){const date=value?new Date(value):new Date();return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(Number.isNaN(date.getTime())?new Date():date);}
/** Whitelist only reviewable outputs. Never serialize the deck, chat, files, or credentials. */
export function generationReport(deck:Deck){
 const record=deck.researchRecord,execution=deck.execution;
 const privateValues=(record?.analysis?.privateConditions??[]).flatMap(p=>[p.value,...(p.value.match(/\d[\d,.]*|[A-Za-z_][A-Za-z0-9_-]{3,}/g)??[])]).filter(Boolean).sort((a,b)=>b.length-a.length);
 const redact=(text:string,maskPrivate=true)=>{let safe=text.replace(/sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g,"[인증 값 제거]").replace(/(?:Bearer|api[_ -]?key|authorization|password)\s*[:=]?\s*[A-Za-z0-9_.-]{8,}/gi,"[인증 값 제거]");if(!maskPrivate)return safe;for(const value of privateValues)safe=safe.split(value).join("[비공개 값]");return safe;};
 const scrub=(value:unknown,privateMask=true,key=""):unknown=>typeof value==="string"?redact(value,privateMask&&!/[iI]d$|[aA]t$|^url$|^layout$|^schemaVersion$/.test(key)):Array.isArray(value)?value.map(v=>scrub(v,privateMask,key)):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).filter(([k])=>!/(?:api[_-]?key|authorization|password|credential|secret|^token$)/i.test(k)).map(([k,v])=>[k,scrub(v,privateMask&&k!=="execution",k)])):value;
 const stages=Object.fromEntries([...new Set(execution?.calls.map(c=>c.stage)??[])].map(stage=>{
  const calls=execution!.calls.filter(c=>c.stage===stage);
  const sum=(key:"inputTokens"|"outputTokens"|"totalTokens")=>calls.some(c=>c[key]!==undefined)?calls.reduce((n,c)=>n+(c[key]??0),0):null;
  return [stage,{calls:calls.length,durationMs:calls.reduce((n,c)=>n+c.durationMs,0),inputTokens:sum("inputTokens"),outputTokens:sum("outputTokens"),totalTokens:sum("totalTokens"),missingUsageCalls:calls.filter(c=>c.inputTokens===undefined||c.outputTokens===undefined).length}];
 }));
 const a=record?.analysis;
 const report={schemaVersion:"2",deckId:deck.id,topic:deck.input.topic,generatedAt:execution?.updatedAt??null,generation:deck.generation??null,rejectedRows:record?.rejectedRows??[],
  execution:{models:[...new Set(execution?.calls.map(c=>c.model)??[])],config:execution?.config??null,startedAt:execution?.startedAt??null,finishedAt:execution?.updatedAt??null,inputUsage:inputUsage(execution?.calls??[]),totalDurationMs:execution?Math.max(0,Date.parse(execution.updatedAt)-Date.parse(execution.startedAt)):null,activeApiDurationMs:execution?.calls.reduce((n,c)=>n+c.durationMs,0)??null,stages,evidenceScopes:execution?.evidenceScopes??[],calls:execution?.calls??[],usageNotice:"반환 토큰과 요청 길이 추정치를 구분합니다. 입력 판정은 미반환 호출의 추정치를 포함하며 도구 내부 문맥은 추정하지 못합니다. null·누락 값은 0 사용량을 뜻하지 않습니다. 경과 시간에는 사용자 확인 대기가 포함될 수 있습니다."},
  research:{coverage:record?.coverage??[],contextCounts:evidenceContextCounts(record?.evidence??[]),status:record?.searchStatus??"not-requested",notice:record?.notice??"실행 기록 없음",evidenceCounts:record?.evidenceCounts??null,rounds:record?.searchRounds??[],queries:record?.queries??[],evidenceWarnings:record?.evidenceWarnings??[],originalPages:record?.originalPages??[],pdfOriginals:record?.originalPages?.filter(p=>p.opened&&p.format==="pdf").length??0},
  task:a?{questions:a.questions,publicContext:a.publicContext,privateConditionCount:a.privateConditions.length,privateConditions:"값 비공개 · 개수만 표시",checklist:a.checklist,stage:a.stage,language:a.language,slideCount:a.slideCount}:null,
  evidence:(record?.evidence??[]).map(e=>({id:e.id,kind:e.kind,claim:e.claim,title:e.title,url:e.url,checkedAt:e.checkedAt,originalVerified:e.originalVerified??false,verificationStatus:e.verificationStatus??(e.originalVerified?"원문 확인":"원문 미확인"),contextMatch:e.contextMatch??"불명확",contextReason:e.contextReason,contextChecks:e.contextChecks,locator:e.locator,attachmentType:e.attachmentType,aliasIds:e.aliasIds,primaryQuestionIds:e.primaryQuestionIds,relatedFacts:e.relatedFacts?.map(({originalText:_quote,...fact})=>fact)})),
  judgments:record?.decisions??[],slides:deck.outline.map((item,index)=>{const s=draftSlide(deck,index);return {number:index+1,role:s?.role??item.role??null,keyMessage:s?canvasHeadline(s):item.message,layout:s?.layoutId??null,evidenceIds:s?.evidenceRefs??item.evidenceRefs??[],warnings:s?.quality?.warnings??[],regenerationCount:s?.quality?.attempts??0,visualReview:s?.quality?.visual??null,userEdited:!!deck.edited[index]};}),review:deck.review??null,
 };
 return JSON.parse(JSON.stringify(scrub(report))) as typeof report;
}
export type GenerationReport=ReturnType<typeof generationReport>;
function reportMarkdownBody(report:GenerationReport){
 const json=(value:unknown)=>"```json\n"+JSON.stringify(value,null,2)+"\n```";
 return `# DeckPick 생성 리포트\n\n주제: ${report.topic}\n\n덱 ID: ${report.deckId}\n\n생성 시각: ${report.generatedAt??"기록 없음"}\n\n## 1. 실행 조건\n\n${json(report.execution)}\n\n### 공개 조사·원문 열람\n\n${json(report.research)}\n\n## 2. 과제 해석\n\n${json(report.task)}\n\n## 3. 근거표 전체\n\n${json(report.evidence)}\n\n## 4. 현재 판단\n\n${json(report.judgments)}\n\n## 5. 장별 정보\n\n${json(report.slides)}\n\n## 6. 덱 전체 검토\n\n${json(report.review)}\n\nAPI 키·인증 값·첨부 원문·대화 전문은 포함하지 않습니다. 비공개 조건의 값은 가렸습니다.\n`;
}
export function reportMarkdown(report:GenerationReport){return reportMarkdownBody(report)+"\n## 실행·이어 하기 상태\n\n```json\n"+JSON.stringify(report.generation,null,2)+"\n```\n\n## 제외한 행 (rejectedRows)\n\n```json\n"+JSON.stringify(report.rejectedRows,null,2)+"\n```\n";}
