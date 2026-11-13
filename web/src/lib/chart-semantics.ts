import type { Evidence } from "./evidence-model";
import type { OutlineItem, SlideSpec } from "./model";

export type ChartSemanticCode = "ordinal-distance" | "ungrounded-score" | "placeholder-chart" | "ambiguous-bar-value" | "non-temporal-trend";
export type ChartSemanticIssue = { code: ChartSemanticCode; severity: "reject" | "warning"; reason: string; repair: string };
type ChartSlide = Pick<SlideSpec,"layoutId"|"headline"|"data"> & Partial<Pick<SlideSpec,"claimType"|"evidenceRefs">>;
type Item = Pick<OutlineItem,"role"|"message"|"contentHint"|"calculation"|"evidenceRefs">;
type Plot = { kind:"bar"|"line"|"donut"|"waterfall"; categories:string[]; values:number[]; names:string[]; unit:string; context:string; temporalLayout?:boolean; ordinalValues?:boolean; ambiguousValues?:boolean };
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const strings=(v:unknown):string=>typeof v==="string"?v:Array.isArray(v)?v.map(strings).join(" "):v&&typeof v==="object"?Object.values(v).map(strings).join(" "):"";
const text=(v:unknown)=>typeof v==="string"?v:"";
const numeric=(v:unknown):number[]=>array(v).filter((n):n is number=>typeof n==="number"&&Number.isFinite(n));
const normalize=(v:string)=>v.normalize("NFKC").replace(/[\s,，]/g,"").toLowerCase();
const numberTokens=(v:string)=>[...v.matchAll(/[-+−]?\d+(?:,\d{3})*(?:\.\d+)?/g)].map(m=>Number(m[0].replace(/,/g,"").replace("−","-"))).filter(Number.isFinite);
const rankWord=/(?:우선\s*순위|순위|서열|차례|\brank(?:ing)?\b|\bpriority\b)/i;
const rankValue=/(?:^|\s)\d+\s*(?:위|등|순위|순위권|등급)(?:$|\s|[(),·])|(?:순위|서열)\s*\d+|\b(?:rank|priority)\s*\d+/i;
const scoreUnit=/(?:^|[\s·(/])(?:점수|점|지수|score|points?|index)(?=$|[\s·)/]|\d)/i;
const measuredUnit=/(?:건|명|개|원|달러|USD|KRW|%|퍼센트|분|초|시간|일|주|월|년|톤|kg|kwh|km|회|배)/i;
const genericUnit=/^(?:예시|가상|합성)?\s*(?:단위|수치|값|unit|value)(?:\s*[·,(/].*)?$/i;
const temporal=/(?:\b(?:19|20)\d{2}\b|\d+\s*(?:년|월|일|주|분기|반기|기|시|분|초)|\bq[1-4]\b|\b(?:fy|cy)\d|\b(?:week|month|year|quarter|day)\s*\d|전년|전월|전분기|현재|향후|이전|이후|과거|미래|기초|기말|시작|종료)/i;

/** Inspect only real quantitative renderers, never ordinary numbered cards/lists. */
function plots(slide:ChartSlide):Plot[]{
 const d=slide.data,kind=slide.layoutId.replace(/^[cm]-/,"");
 if(kind==="argument-board")return array(d.panels).flatMap(value=>{
  const p=object(value);if(p.kind!=="막대")return [];
  const rows=array(p.rows).map(object),raw=rows.map(r=>text(r.value)),values=raw.map(v=>numberTokens(v)[0]).filter((v):v is number=>v!==undefined);
  return [{kind:"bar" as const,categories:rows.map(r=>text(r.label)),values,names:[text(p.title)],unit:raw.every(v=>rankValue.test(v))?"순위":raw.map(v=>v.replace(/[-+−]?\d+(?:,\d{3})*(?:\.\d+)?/g,"").trim()).filter(Boolean).join(" "),context:strings(p),ordinalValues:raw.some(v=>rankValue.test(v)),ambiguousValues:raw.some(v=>numberTokens(v).length>1)}];
 });
 const names=array(d.series).map(v=>text(object(v).name));
 if(kind==="trend")return [{kind:"bar",categories:array(d.points).map(p=>text(object(p).period)),values:array(d.points).flatMap(p=>numeric([object(p).value])),names:[text(d.seriesName)],unit:text(d.unit),context:strings(d),temporalLayout:true}];
 if(kind==="multi-bar"||kind==="line-chart")return [{kind:kind==="line-chart"?"line":"bar",categories:array(d.categories).map(text),values:array(d.series).flatMap(s=>numeric(object(s).values)),names,unit:text(d.unit),context:strings(d),temporalLayout:kind==="line-chart"}];
 if(kind==="horizontal-formula")return [{kind:"bar",categories:array(d.items).map(i=>text(object(i).label)),values:array(d.items).flatMap(i=>numeric([object(i).value])),names:[text(d.formula)],unit:text(d.unit),context:strings(d)}];
 if(kind==="composition-donut")return [{kind:"donut",categories:array(d.items).map(i=>text(object(i).label)),values:array(d.items).flatMap(i=>numeric([object(i).value])),names:[],unit:text(d.unit),context:strings(d)}];
 if(kind==="waterfall")return [{kind:"waterfall",categories:[text(object(d.start).label),...array(d.changes).map(i=>text(object(i).label)),text(d.endLabel)],values:[...numeric([object(d.start).value]),...array(d.changes).flatMap(i=>numeric([object(i).value]))],names:[],unit:text(d.unit),context:strings(d)}];
 return [];
}
function ordinalSequence(values:number[]){const unique=[...new Set(values)].sort((a,b)=>a-b);return unique.length>=3&&unique.every((v,i)=>v===i+1);}
function orderedNumericAxis(categories:string[]){
 const match=categories.map(v=>v.trim().match(/^([-+]?\d+(?:\.\d+)?)\s*([^\d]*)$/));
 return categories.length>=2&&match.every(Boolean)&&new Set(match.map(m=>m![2].trim())).size===1;
}
function hasTimeAxis(categories:string[]){return categories.length>=2&&categories.every(c=>temporal.test(c));}
function scoreGrounded(plot:Plot,slide:ChartSlide,item:Item|undefined,evidence:readonly Evidence[]){
 const refs=slide.evidenceRefs?.length?slide.evidenceRefs:item?.evidenceRefs??[],rows=refs.length?evidence.filter(e=>refs.includes(e.id)||e.aliasIds?.some(id=>refs.includes(id))):evidence;
 const source=rows.filter(e=>e.kind==="공개 사실"||e.kind==="내부 전제").map(e=>[e.claim,e.originalText,...(e.relatedFacts??[]).flatMap(f=>[f.claim,f.originalText])].filter(Boolean).join(" ")).join(" ");
 const values=new Set(numberTokens(source)),metricNamed=plot.names.some(name=>normalize(name).length>=2&&normalize(source).includes(normalize(name)));
 const scoreNamed=/(?:\d\s*점|점수|지수|\bscore\b|\bindex\b)/i.test(source);
 if(plot.values.length&&plot.values.every(v=>values.has(v))&&(scoreNamed||metricNamed))return true;
 // A declared calculation with an actual scale/weight rule is allowed as a
 // scenario. Merely adding '가정' to arbitrary scores does not establish a method.
 return !!item?.calculation?.steps.length&&/(?:척도|배점|가중치|정규화|scale|weight|scoring)/i.test([plot.context,item.contentHint,item.calculation.interpretation].join(" "));
}

/**
 * Reject only strong semantic mismatches. Small/consecutive values alone are
 * never a reason to remove a chart; 1..4 can be real counts, prices or dates.
 */
export function inspectChartSemantics(slide:ChartSlide,item?:Item,evidence:readonly Evidence[]=[]):ChartSemanticIssue[]{
 const issues:ChartSemanticIssue[]=[];
 for(const p of plots(slide)){
  if(p.values.length<2)continue;
  const hasTime=hasTimeAxis(p.categories),rankContext=rankWord.test([slide.headline,item?.message,item?.role,...p.names].filter(Boolean).join(" "));
  const rankUnit=rankWord.test(p.unit)&&!measuredUnit.test(p.unit),rankHistory=p.kind==="line"&&rankUnit&&hasTime;
  const weakOrdinal=ordinalSequence(p.values)&&rankContext&&(!p.unit.trim()||genericUnit.test(p.unit));
  if(!rankHistory&&(rankUnit||p.ordinalValues||weakOrdinal))issues.push({code:"ordinal-distance",severity:"reject",reason:"순위·차례를 막대 길이·면적의 정량적 차이로 표현했습니다. 1위와 2위의 간격은 측정된 수량 차이가 아닙니다.",repair:"숫자는 순서 표식으로만 남기고 번호 목록·우선순위 카드·판단 및 반전 조건으로 바꾸세요. 실제 규모 비교가 필요하면 측정값과 단위를 사용하세요."});
  else if(scoreUnit.test(p.unit)&&!scoreGrounded(p,slide,item,evidence))issues.push({code:"ungrounded-score",severity:"reject",reason:"점수·지수 그래프의 척도·출처·계산 근거가 없습니다. 임의 점수는 판단의 근거처럼 보일 수 있습니다.",repair:"근거 있는 점수와 척도·산식을 제시하거나, 임의 숫자를 없애고 기준별 문장·정성 평가 기호로 비교하세요."});
  const placeholder=(!p.unit.trim()||genericUnit.test(p.unit))&&/(?:합성\s*데이터|예시\s*데이터|실제.*교체|값.*교체|placeholder|sample\s*data)/i.test(p.context)&&!scoreGrounded(p,slide,item,evidence);
  if(placeholder)issues.push({code:"placeholder-chart",severity:"reject",reason:"실제 입력을 설명하지 않는 예시 수치·단위가 결과 후보에 남아 있습니다.",repair:"입력 자료의 실제 값·단위로 구성하거나, 수치가 없으면 근거를 설명하는 표·흐름·정성 비교 형식으로 바꾸세요. 샘플 숫자로 빈칸을 채우지 마세요."});
  if(p.ambiguousValues&&!p.ordinalValues)issues.push({code:"ambiguous-bar-value",severity:"reject",reason:"막대 값 한 칸에 연도·분모 등 숫자가 여러 개 있어 수량으로 안전하게 읽을 수 없습니다.",repair:"막대 값에는 한 개의 실제 측정값과 단위만 두고 연도·분모·비교 조건은 별도 설명 칸으로 옮기세요."});
  if(p.temporalLayout&&!hasTime&&!orderedNumericAxis(p.categories)&&!issues.some(issue=>issue.severity==="reject"))issues.push({code:"non-temporal-trend",severity:"warning",reason:"추세 형식의 비교축이 시간이나 연속된 수치 축인지 확인할 근거가 분명하지 않습니다. 독립 대상이나 누적 배분액을 시간 변화처럼 읽을 수 있습니다.",repair:"한 시점의 대안 비교라면 비교 막대·표를, 부분값의 합산이라면 계산식·합계 관계를 사용하세요. 실제 시간·연속 축이 있는 경우 그 의미와 순서를 명시하세요."});
 }
 return issues.filter((issue,index,list)=>list.findIndex(other=>other.code===issue.code&&other.severity===issue.severity)===index);
}
export function chartSemanticWarnings(slide:ChartSlide,item?:Item,evidence:readonly Evidence[]=[]){return inspectChartSemantics(slide,item,evidence).map(issue=>`차트 의미 (${issue.code}): ${issue.reason} ${issue.repair}`);}
export function hasBlockingChartSemantics(slide:ChartSlide,item?:Item,evidence:readonly Evidence[]=[]){return inspectChartSemantics(slide,item,evidence).some(issue=>issue.severity==="reject");}
