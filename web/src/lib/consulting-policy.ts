import type {DeckInput,OutlineItem,SlideSpec} from "./model";
import type {TaskAnalysis} from "./task-model";

export const CONSULTING_POLICY_VERSION="analysis-first-relationships-v1";
export const consultingResearchSteps=[
 {step:1,name:"시장 이해",question:"어떤 시장 변화가 이번 판단을 필요하게 하는가",frameworks:["Value Chain","Business Model","PEST","Five Forces","Industry Life Cycle"]},
 {step:2,name:"3C 분석",question:"자사·고객·경쟁의 차이에서 어떤 쟁점이 확인되는가",frameworks:["Company","Customer","Competitor","VRIO","SWOT","4P"]},
 {step:3,name:"과제 정의",question:"확인한 결과에서 우선 해결할 원인과 과제는 무엇인가",frameworks:["원인 구조","문제 트리","우선순위"]},
 {step:4,name:"전략 수립",question:"어떤 선택이 앞서 확인한 과제를 해결하는가",frameworks:["STP","Positioning","Value Proposition","실행 대안"]},
] as const;
export type AnalysisStep=1|2|3|4;
export type Emphasis="priority"|"share"|"convergence"|"cause"|"comparison"|"trend"|"sequence"|"evidence";

export const consultingAnalysisRules=`컨설팅 분석의 기본 접근은 Step1 시장 이해, Step2 자사·고객·경쟁 3C, Step3 근거에서 과제와 우선순위 정의, Step4 앞선 원인을 해결할 전략입니다. Step0은 발표에 넣지 않습니다. 사용자가 다른 흐름을 명시하면 그 흐름을 따릅니다. 프레임워크를 모두 채우지 말고 이번 질문에 필요한 도구만 선택합니다. 각 단계의 산출물은 조사 할 일 목록이 아니라 확인한 사실, 해석, 그 해석이 바꾸는 판단입니다.
시장 이해는 시장 구조·가치사슬·규모와 변화의 원인을 연결하고, 3C는 자사 이익 구조·고객의 실제 행동·경쟁자의 차이를 비교합니다. 재무 현황은 선택을 바꾸는 이유가 있을 때만 넣고, 갑자기 다른 시장으로 뛰지 않게 그 전환 이유를 헤드라인에 씁니다. 문제 정의는 관측한 원인과 결과를 구분하며 인과가 확인되지 않으면 관측된 관계와 추론 범위를 분리합니다.
분석 장의 헤드라인·본문을 '해야 합니다', '확인하겠습니다', '별도 확인', '조사 예정'으로 채우지 않습니다. 확인한 결과와 현재 판단을 먼저 씁니다. 사용자가 명시한 실행·조사 설계·로드맵 장과 마지막 전략 제안에서는 제안·계획을 구분해 허용합니다. 분석 근거가 없다고 미래 조사 계획 한 장으로 빈자리를 채우지 않습니다. 관측되지 않은 고객 이탈, 인터뷰, 구매 이유, 점유율의 원인을 만들어 내지 않습니다. 근거가 있는 대체 지표로 범위를 좁히거나 해당 주장 자체를 덜어 냅니다. 한계는 짧은 성격 표시·출처·노트로 남기고 '별도 확인'을 청자에게 떠넘기는 결론으로 쓰지 않습니다.
장마다 argument.narrative에 analysisStep(1~4), questionFromPrevious(앞 장 결론이 만든 질문), whyThisSlide(이번 판단에 이 분석이 필요한 이유), emphasis(핵심 관계)를 적습니다. 키메시지는 그 질문에 대한 답이며 다음 장으로 넘기는 질문은 transition에 적습니다. 목차는 분석 결과인 척하지 않고 번호와 네 단계의 전체 흐름을 보여 줍니다. 섹션이 시장·경쟁·고객 분석으로 바뀌면 첫 헤드라인에 그 분석 범위와 발견을 함께 말합니다. 키메시지만 이어 읽어도 시장의 변화, 자사·고객·경쟁의 차이, 우선 과제, 전략 선택의 이유가 이어져야 합니다.
강조할 관계가 우선순위면 먼저·병행·이후 조건을 공간과 색 위계로, 전체의 구성비면 원형과 명확한 색·범례로, 여러 유입점이 자사로 모이면 수렴 화살표와 서비스 허브로 보여 줍니다. 시장 점유율은 해당 자료의 분모·지역·기간을 보존하며 일부 안경형 기기 출하를 모든 AI 탑재 기기 시장으로 확장하지 않습니다. 항목 개수나 가상의 평가점수를 준비도 차트로 그리지 않습니다. 본문은 짧은 구·핵심 숫자·인과 라벨로 압축하고 긴 문장을 넣으려고 박스를 늘리지 않습니다. 근거·산식·조건의 의미를 버리는 축약은 금지합니다. E.O.D.로 본 발표를 닫은 다음 출처를 Appendix로 둡니다.`;

export function inferAnalysisStep(text:string):AnalysisStep{
 if(/전략|해결안|실행 대안|포지셔닝|목표시장|사업 컨셉|진출 선택|strategy|solution|positioning|recommendation/i.test(text))return 4;
 if(/과제|핵심 문제|원인|우선순위|병목|문제 정의|problem|cause|priority|bottleneck/i.test(text))return 3;
 if(/자사|고객|소비자|경쟁|사업 구조|매출|영업이익|수익 구조|company|customer|consumer|competitor|revenue|profit/i.test(text))return 2;
 return 1;
}
export function researchApproach(analysis?:Pick<TaskAnalysis,"questions">){
 return consultingResearchSteps.map(phase=>({...phase,questionIds:analysis?.questions.filter(q=>(q.analysisStep??inferAnalysisStep(q.question))===phase.step).map(q=>q.id)??[]}));
}
export const isClosingSection=(section:string)=>/^(?:E\.?O\.?D\.?|Appendix|부록|출처)$/i.test(section.trim());
export function inferEmphasis(item:Pick<OutlineItem,"section"|"message"|"contentHint"|"role"|"argument">):Emphasis{
 if(item.argument?.narrative?.emphasis)return item.argument.narrative.emphasis;
 const text=`${item.message} ${item.contentHint} ${item.argument?.visualIntent??""}`;
 if((item.argument?.preferredLayouts??[]).some(id=>id.endsWith("share-comparison"))||/점유율|구성비|비중|100%/.test(text))return "share";
 if(/(?:외부|경쟁|다른|여러).{0,35}(?:자사|우리|핵심 서비스|서비스로|플랫폼으로)|수렴|유입점|서비스 허브/.test(text))return "convergence";
 if(item.role==="우선순위"||/우선순위|먼저.{0,30}(?:다음|이후|병행)|선행.{0,20}병행/.test(text))return "priority";
 if(/원인|인과|이탈|병목|유출/.test(text))return "cause";
 if(/추세|추이|연도별|성장률|증가율/.test(text))return "trend";
 if(item.role==="흐름"||/목차|단계|가치사슬/.test(text))return "sequence";
 return item.role==="비교"?"comparison":"evidence";
}
/** Layout preferences derive from the claim's relationship, not arbitrary rotation. */
export function relationshipLayoutKinds(item:OutlineItem,input:Pick<DeckInput,"deckType">):string[]{
 if(input.deckType!=="consulting")return [];
 if(isClosingSection(item.section)&&item.section!=="출처")return ["end-divider"];
 if(item.section==="목차")return ["numbered-agenda","toc","arrow-flow"];
 if(item.index===1&&["판단","우선순위"].includes(item.role??""))return ["priority-path","judgment-reversal","spotlight-comparison"];
 const relation=inferEmphasis(item);
 if(relation==="share")return multipleShareScopes(item)?["share-comparison"]:["share-comparison","composition-donut"];
 if(relation==="convergence")return ["service-ecosystem","value-chain","system-flow"];
 if(relation==="priority"||item.index===1&&["판단","우선순위"].includes(item.role??""))return ["priority-path","judgment-reversal","spotlight-comparison"];
 return [];
}
/** More than one population/period or required monetary trends must not be reduced to one pie. */
export function multipleShareScopes(item:OutlineItem){
 const text=[item.message,item.contentHint,item.argument?.visualIntent??"",...(item.argument?.support.map(s=>s.text)??[]),...(item.contentContract?.requirements.map(r=>r.quote)??[])].join(" ");
 if(/(?:두|여러|복수|서로 다른).{0,16}(?:시장|집단|범주|분모|구성)|별개.{0,12}(?:원|분모)|각.{0,10}(?:시장|집단).{0,12}(?:비교|구성)/.test(text))return true;
 return /각각|시장별|연도별|연도.*비교|3개년|세\s*개년|두\s*시장|복수\s*분모|분모가\s*다른|추세|추이|금액|매출.*영업이익|AI.{0,15}AR|제품.{0,12}서비스|respectively|year.by.year|multiple populations|different denominators|revenue.*operating|product.*service|trend/.test(text);
}
export function relationshipLayoutFits(id:string,item:OutlineItem,input:Pick<DeckInput,"deckType">){
 if(input.deckType!=="consulting"||item.index===0||item.section==="목차"||isClosingSection(item.section)||item.index===1&&["판단","우선순위"].includes(item.role??""))return true;
 if(inferEmphasis(item)==="share")return id.endsWith("share-comparison")||!multipleShareScopes(item)&&id.endsWith("composition-donut");
 return true;
}

export function isAnalysisPage(item:Pick<OutlineItem,"section"|"role">,input:Pick<DeckInput,"deckType">){
 return input.deckType==="consulting"&&!isClosingSection(item.section)&&!/^표지$|^목차$/.test(item.section)&&item.role!=="일정"&&!/요약|핵심 결론|전략|실행|제안|합의|로드맵|컨셉|summary|brief|executive|strategy|execution|roadmap|concept|agreement|recommendation/i.test(item.section);
}
export function analysisCopyWarnings(texts:string[],item:Pick<OutlineItem,"section"|"role">,input:Pick<DeckInput,"deckType">){
 if(!isAnalysisPage(item,input))return [];
 const todo=texts.filter(t=>/(?:해야\s*(?:합니다|한다)|하겠습니다|확인할\s*필요|검토\s*예정|조사\s*예정|별도\s*확인|추가\s*조사\s*필요)/.test(t)&&!/(?:라고|라는)\s*(?:응답|답|말|발언)/.test(t));
 return todo.length?["분석 결과 대신 당위·후속 할 일을 말합니다. 관찰한 사실과 현재 판단으로 고치고 실행 제안은 요청된 전략·일정 장에만 남기세요."]:[];
}
export function consultingChartWarnings(slide:Pick<SlideSpec,"layoutId"|"data">,item:OutlineItem){
 const data=slide.data as Record<string,unknown>,text=JSON.stringify(data),warnings:string[]=[];
 if(slide.layoutId.endsWith("composition-donut")&&!relationshipLayoutFits(slide.layoutId,item,{deckType:"consulting"}))warnings.push("복수 분모·추세를 한 원이나 설명문으로 축소했습니다. 필요한 각 집단의 원과 금액 추세를 본문에 함께 그리세요.");
 const series=Array.isArray(data.series)?data.series as {values?:number[]}[]:[];
 const width=Array.isArray(data.categories)?data.categories.length:0;
 const hundred=width>0&&series.length>1&&Array.from({length:width},(_,i)=>series.reduce((sum,row)=>sum+Number(row.values?.[i]??NaN),0)).every(sum=>Number.isFinite(sum)&&Math.abs(sum-100)<.51);
 if(slide.layoutId.endsWith("multi-bar")&&data.mode==="누적"&&(hundred&&/%|퍼센트/.test(String(data.unit))||inferEmphasis(item)==="share"))warnings.push("전체 구성비는 원형으로 비교하세요. 각 원에 같은 분모·기간·범례를 명시하고 구성 항목의 색을 명확히 나누세요.");
 if(/(?:multi-bar|line-chart|horizontal-formula|composition-donut)$/.test(slide.layoutId)&&/검토\s*항목|체크\s*항목|검토\s*개수/.test(String(data.unit))&&/준비|관문|수준|확대|우선/.test(`${item.message} ${text}`))warnings.push("차트 의미: 체크 항목 개수는 준비도·우선순위를 측정하지 않습니다. 실제 관측 지표가 없으면 준비 조건을 단계·관문 도식으로 바꾸세요.");
 return warnings;
}
export function narrativeChainWarnings(outline:OutlineItem[],input:Pick<DeckInput,"deckType">){
 if(input.deckType!=="consulting")return [];
 const issues:{index:number;reason:string}[]=[];
 for(let i=1;i<outline.length;i++){
  const item=outline[i];if(item.section==="목차"||isClosingSection(item.section))continue;
  if(isAnalysisPage(item,input)&&/해야\s*(?:합니다|한다)|하겠습니다|별도\s*확인/.test(item.message))issues.push({index:i,reason:"분석 키메시지가 관찰 결과 대신 앞으로의 할 일을 말합니다."});
  const n=item.argument?.narrative;
  if(n&&!n.questionFromPrevious.trim())issues.push({index:i,reason:"앞 장 결론과 이번 장을 잇는 질문이 비어 있습니다."});
  if(n&&/^(?:분석|결론|검토|내용|시각화)(?:가?\s*필요)?[.!\s]*$/.test(n.whyThisSlide))issues.push({index:i,reason:"왜 이 장이 필요한지 구체적인 판단 이유가 없습니다."});
  if(i>1&&item.section!==outline[i-1].section&&item.argument?.narrative){
   const section=item.section.toLowerCase(),words=/시장|market/.test(section)?/시장|수요|출하|판매|성장|규모/:/경쟁|competitor|rival/.test(section)?/경쟁|점유율|선두|후발|대안|업체/:/고객|customer/.test(section)?/고객|사용자|소비자|이용|행동|구매/:null;
   if(words&&!words.test(item.message))issues.push({index:i,reason:"섹션 전환 키메시지에 이번 시장·고객·경쟁 분석의 범위와 발견이 드러나지 않습니다."});
  }
 }
 return issues;
}
