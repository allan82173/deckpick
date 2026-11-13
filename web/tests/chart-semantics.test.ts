import test from "node:test";
import assert from "node:assert/strict";
import { inspectChartSemantics, hasBlockingChartSemantics, chartSemanticWarnings } from "../src/lib/chart-semantics";
import { evidenceSchema } from "../src/lib/evidence-model";

type Input = Parameters<typeof inspectChartSemantics>[0];
type Item = NonNullable<Parameters<typeof inspectChartSemantics>[1]>;
const chart=(unit:string,values=[1,2,3,4],extra:Record<string,unknown>={}):Input=>({layoutId:"c-multi-bar",headline:"대안별 비교",evidenceRefs:["1"],data:{unit,categories:values.map((_,i)=>`대안 ${i+1}`),series:[{name:"측정값",values}],...extra}});
const board=(kind:string,values:string[],headline="우선순위 비교"):Input=>({layoutId:"m-argument-board",headline,data:{panels:[{kind,title:"비교",rows:values.map((value,i)=>({label:`대안 ${i+1}`,value,detail:"관측 결과"}))}]}});
const rankHeadline=(s:Input)=>({...s,headline:"우선순위 결정"});
const evidence=(claim:string,id="1")=>evidenceSchema.parse({id,claim,title:"측정 조사",url:"https://example.org/report",checkedAt:"2026-11-13",kind:"공개 사실",originalText:claim,originalVerified:true});

test("explicit ordinal magnitude is rejected even with a source",()=>{
 const result=inspectChartSemantics(rankHeadline(chart("순위")),undefined,[evidence("순위는 1, 2, 3, 4위다")]);
 assert.ok(result.some(i=>i.code==="ordinal-distance"&&i.severity==="reject"));
});
test("argument-board rank strings are rejected only for bar panels",()=>{
 assert.ok(hasBlockingChartSemantics(board("막대",["1위","2위","3위"])));
 assert.ok(hasBlockingChartSemantics(board("막대",["순위 1","순위 2"])));
 for(const kind of ["숫자","목록","비교"])assert.deepEqual(inspectChartSemantics(board(kind,["1위","2위","3위"])),[]);
});
test("ordinal sequence requires a rank context when the unit is missing",()=>{
 assert.ok(hasBlockingChartSemantics(rankHeadline(chart(""))));
 assert.equal(hasBlockingChartSemantics(chart("")),false);
});
test("actual small counts, money and store counts remain valid despite priority headline",()=>{
 for(const unit of ["명","건","억원","점포","개"])assert.equal(hasBlockingChartSemantics(rankHeadline(chart(unit)),undefined,[evidence("관측값 1, 2, 3, 4")]),false,unit);
 assert.equal(hasBlockingChartSemantics(board("막대",["1명","2명","3명","4명"])),false);
});
test("actual equal measurements are not assumed to be fabricated",()=>{
 assert.deepEqual(inspectChartSemantics(chart("건",[4,4,4,4])),[]);
});
test("arbitrary scores need a source or a declared calculation method",()=>{
 assert.ok(inspectChartSemantics(chart("점")).some(i=>i.code==="ungrounded-score"));
 assert.ok(hasBlockingChartSemantics(chart("지수",[35,55,65])));
 assert.ok(hasBlockingChartSemantics(chart("점",[1,2,3],{takeaway:"[가정] 비교 점수"})));
});
test("genuine published scores and indices stay available",()=>{
 assert.equal(hasBlockingChartSemantics(chart("점"),undefined,[evidence("측정값 점수는 각각 1점, 2점, 3점, 4점이다")]),false);
 assert.equal(hasBlockingChartSemantics(chart("지수",[100,105,103]),undefined,[evidence("측정값 지수 100 / 105 / 103")]),false);
});
test("unrelated or unreferenced sources do not ground a score",()=>{
 assert.ok(hasBlockingChartSemantics(chart("점"),undefined,[evidence("2026년 1월 2일 3개 지역 4명")]));
 assert.ok(hasBlockingChartSemantics(chart("점"),undefined,[evidence("점수 1,2,3,4","2")]));
});
test("a structured scoring calculation with scale and weights is allowed",()=>{
 const item:Item={role:"계산",message:"가중 평가 예시",contentHint:"가중치와 5점 척도",evidenceRefs:[],calculation:{title:"가중치 계산",assumptions:[],steps:[{name:"weighted",label:"가중 합계",operation:"multiply",operands:["score","weight"],unit:"점"}],interpretation:"가중치 적용 시나리오"}};
 assert.equal(hasBlockingChartSemantics(chart("점"),item),false);
});
test("demo placeholder data is rejected rather than silently offered as a candidate",()=>{
 const slide:Input={layoutId:"c-trend",headline:"비교",data:{unit:"예시 단위",seriesName:"합성 데이터",points:[20,32,28,45].map((value,i)=>({period:`기간 ${i+1}`,value})),takeaway:"실제 값·단위·기간·출처로 교체하세요."}};
 assert.ok(inspectChartSemantics(slide).some(i=>i.code==="placeholder-chart"&&i.severity==="reject"));
});
test("real monthly quantities and a genuine ranking history stay available",()=>{
 const months=["2026-01","2026-02","2026-03","2026-04"];
 const quantity:Input={layoutId:"c-trend",headline:"월별 건수",data:{unit:"건",seriesName:"가입",points:months.map((period,i)=>({period,value:i+1}))}};
 assert.deepEqual(inspectChartSemantics(quantity),[]);
 assert.deepEqual(inspectChartSemantics({...chart("순위",[4,3,2,1],{categories:months}),layoutId:"c-line-chart",headline:"월별 순위 변화"}),[]);
});
test("non-temporal allocation trend is warning only, including explicit disclaimer",()=>{
 for(const seriesName of ["누적 배분액","시간 추세 아님"]){
 const slide:Input={layoutId:"c-trend",headline:"자산별 금액",data:{unit:"만원",seriesName,points:[3000,5000,6000,6500,10000,10000].map((value,i)=>({period:`자산 ${i+1}`,value}))}};
 const result=inspectChartSemantics(slide);
 assert.equal(hasBlockingChartSemantics(slide),false);
 assert.ok(result.some(i=>i.code==="non-temporal-trend"&&i.severity==="warning"));
 }
});
test("line chart may use a continuous numeric axis rather than time",()=>{
 const slide:Input={...chart("초",[1,2,3],{categories:["10°C","20°C","30°C"]}),layoutId:"c-line-chart"};
 assert.deepEqual(inspectChartSemantics(slide),[]);
});
test("bar values with more than one number cannot be silently concatenated",()=>{
 assert.ok(inspectChartSemantics(board("막대",["2026년 500건","2025년 400건"])).some(i=>i.code==="ambiguous-bar-value"));
 assert.deepEqual(inspectChartSemantics(board("막대",["500건","400건"])),[]);
});
test("warnings expose the reason and concrete repair instruction",()=>{
 const output=chartSemanticWarnings(chart("순위"));
 assert.equal(output.length,1);assert.match(output[0],/ordinal-distance/);assert.match(output[0],/번호 목록/);
});
