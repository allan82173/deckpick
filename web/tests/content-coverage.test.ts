import test from "node:test";
import assert from "node:assert/strict";
import { calculateScenario, calculationCards, applyCalculation } from "../src/lib/scenario-calculation";
import { candidatePlan,widerPool,avoidDeckRepeats } from "../src/lib/candidate-plan";
import { replayDeck } from "../src/lib/deck-session";
import { reviewVisibleContent } from "../src/lib/deck-review";
import { makeScene } from "../src/lib/scene";
import { inspectSceneGeometry } from "../src/lib/visual-quality";
import { chartPreviewDataUrl } from "../src/lib/native-charts";
import { copyBudgetWarnings } from "../src/lib/copy-budgets";
import { missingCalculationOutputs } from "../src/lib/calculation-coverage";
import { sameReviewedSlide,invalidateStaleReview } from "../src/lib/review-state";
import { exportDeck } from "../src/lib/export";
import JSZip from "jszip";
import { design } from "../src/lib/design";
import type { Calculation } from "../src/lib/task-model";
import type { Deck,OutlineItem,SlideSpec } from "../src/lib/model";

const calc:Calculation={title:"가상 예산 배분",assumptions:[{name:"budget",label:"예산",value:100000000,unit:"원",basis:"합성",origin:"가정",evidenceRefs:[]},...[.30,.20,.10,.05,.35].map((value,i)=>({name:`w${i}`,label:`비중${i}`,value,unit:"비율",basis:"합성",origin:"가정" as const,evidenceRefs:[]}))],steps:[0,1,2,3,4].map(i=>({name:`r${i}`,label:`자산 ${i+1}`,operation:"multiply" as const,operands:["budget",`w${i}`],unit:"원"})),interpretation:"모델 가정이며 실제 수익·위험등급이 아닙니다."};
const input={topic:"합성 분석",purpose:"보존 검사",deckType:"consulting" as const,designSystemId:"lemonade" as const,slideCount:8};
const item={index:5,section:"배분",message:"다섯 자산에 나눕니다",contentHint:"배분",role:"계산",calculation:calc} as OutlineItem;
const slide={layoutId:"c-horizontal-formula",section:"배분",headline:"다섯 자산에 나눕니다.",data:{},sources:[]} as SlideSpec;
const deck={id:"original",input,designSystem:design("lemonade"),outline:[item],candidates:{5:[slide]},picked:{5:0},edited:{},research:[],chat:{setup:[],outline:[],slides:{}},demo:false} as Deck;

test("서로 다른 단위를 같은 수치 축에 강제하지 않고 전체 결과를 표시할 구성을 남긴다",()=>{
 const mixed={...calc,steps:calc.steps.map((s,i)=>({...s,unit:i===0?"비율":"원"}))};
 const mixedItem={...item,calculation:mixed};
 const plan=candidatePlan(input,mixedItem);
 assert.ok(plan.length>0);assert.ok(!plan.includes("c-horizontal-formula"));assert.ok(!plan.includes("c-formula-cards"));
 assert.ok(!widerPool(input,mixedItem).includes("c-horizontal-formula"));
 assert.throws(()=>candidatePlan(input,mixedItem,[],0,1,"c-horizontal-formula"),/모두 담을/);
});

test("5개 계산 결과를 카드 3개로 자르지 않고 계획과 실제 차트 모두 보존한다",()=>{
 assert.throws(()=>calculationCards(calc),/최대 3개/);
 const plan=candidatePlan(input,item);
 assert.equal(plan[0],"c-horizontal-formula");assert.ok(!plan.includes("c-formula-cards"));
 assert.throws(()=>candidatePlan(input,item,[],0,1,"c-formula-cards"),/모두 담을/);
 assert.ok(!avoidDeckRepeats(plan,["c-horizontal-formula"],widerPool(input,item),true,8).includes("c-formula-cards"),"다양성 규칙이 작은 카드 용량 검사를 우회하지 않는다");
 const result=applyCalculation(slide,calc),scene=makeScene(result,deck.designSystem,6,input.topic),chart=scene.nodes.find(n=>n.kind==="image"&&n.chart);
 assert.ok(chart?.kind==="image"&&chart.chart);
 assert.deepEqual(chart.chart.categories,calc.steps.map(s=>s.label));
 assert.deepEqual(chart.chart.series[0].values,[3000,2000,1000,500,3500]);
 assert.equal(chart.chart.series[0].values.reduce((s,v)=>s+v,0),10000);
 assert.deepEqual(missingCalculationOutputs(scene,calc),[]);
 const incomplete=structuredClone(scene);const n=incomplete.nodes.find(n=>n.kind==="image"&&n.chart);if(n?.kind==="image"&&n.chart){n.chart.series[0].values=n.chart.series[0].values.slice(2);n.chart.categories=n.chart.categories.slice(2);}
 // Remove explanatory text so this checks an actual omitted display value.
 incomplete.nodes=incomplete.nodes.filter(n=>n.kind!=="text");
 assert.deepEqual(missingCalculationOutputs(incomplete,calc).map(o=>o.name),["r0","r1"]);
 assert.deepEqual(inspectSceneGeometry(scene).filter(s=>/넘칩니다|겹칩니다/.test(s)),[]);
 const review=reviewVisibleContent(result,deck,0);
 assert.deepEqual(review.charts[0].series[0].values,chart.chart.series[0].values,"텍스트 밖 차트 값도 검토 입력에 포함");
});
test("음수 결과를 누락하지 않고 단위가 섞인 결과는 강제로 합치지 않는다",()=>{
 const negative=structuredClone(calc);negative.assumptions[1].value=-.3;
 assert.equal((applyCalculation(slide,negative).data.items as {value:number}[])[0].value,-3000);
 const svg=decodeURIComponent(chartPreviewDataUrl({kind:"horizontal",categories:["하락","상승"],series:[{name:"손익",values:[-30,20]}],unit:"원"},deck.designSystem.colors).split(",").slice(1).join(","));
 const bars=[...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="25"/g)];
 assert.equal(bars.length,2);assert.ok(+bars[0][2]>0,"음수 막대도 0 너비로 버리지 않는다");assert.ok(+bars[0][1]<+bars[1][1],"손실은 0축 왼쪽에 표시");
 const mixed=structuredClone(calc);mixed.steps[1].unit="개";
 assert.throws(()=>applyCalculation(slide,mixed),/같은 단위/);
 assert.equal(calculateScenario(calc).outputs.length,5);
 const long=structuredClone(calc);long.interpretation="가정의 상세 설명입니다. ".repeat(25);
 const concise=applyCalculation({...slide,data:{interpretation:"3년 누적 가정이며 세금·비용을 제외합니다.",takeaway:"가정 변경 시 손익도 달라집니다."}},long);
 assert.equal((concise.data.items as unknown[]).length,5);assert.ok(concise.notes?.includes(long.interpretation),"긴 설계 해석은 노트에서 보존");
});
test("동일 자료 재생성은 원본과 내용 설계를 보존하고 생성 결과만 초기화한다",()=>{
 const before=JSON.stringify(deck),copy=replayDeck(deck);
 assert.notEqual(copy.id,deck.id);assert.deepEqual(copy.input,deck.input);assert.deepEqual(copy.outline,deck.outline);
 assert.deepEqual(copy.candidates,{});assert.deepEqual(copy.edited,{});
 copy.outline[0].message="새 편집";assert.equal(JSON.stringify(deck),before);
});
test("긴 근거 분류명과 성격 태그가 같은 작은 높이에 겹치지 않는다",()=>{
 const evidenceSlide={...slide,layoutId:"c-evidence-convergence",data:{evidences:["집중, 편입기업별 노출","구성, 상품명보다 실제 종목","가격, 이익 증가에도 손실 가능","환율, 원화 거래에도 외화 노출"].map(label=>({label,fact:"같은 기준과 기간을 대조하는 합성 근거입니다.",tag:"공개 사실"})),conclusion:{title:"비교 조건을 맞춥니다",detail:"자료의 범위 안에서 판단합니다."},takeaway:"비교 조건과 판단 범위를 함께 표시합니다.",tag:"추론"}} as SlideSpec;
 const scene=makeScene(evidenceSlide,deck.designSystem);
 assert.deepEqual([...scene.warnings,...inspectSceneGeometry(scene)].filter(w=>/넘칩니다|겹칩니다|축약 필요/.test(w)),[]);
});
test("긴 문구는 자르지 않고 해당 필드의 재작성 사유로 반환한다",()=>{
 const text="검증 대상 기업의 수와 기간, 지표를 보존하면서 중복되는 설명을 줄여야 하는 긴 확인 방법입니다. ".repeat(3);
 const spec={...slide,layoutId:"c-judgment-reversal",data:{priorities:[{name:"우선순위",why:"근거",reversal:"조건",method:text}]}} as SlideSpec;
 const before=JSON.stringify(spec),warnings=copyBudgetWarnings(spec);
 assert.equal(warnings.length,1);assert.match(warnings[0],/priorities.\*.method/);assert.equal(JSON.stringify(spec),before);
});
test("검토 결과 적용은 속성 순서·검사 메타데이터 차이를 실제 편집으로 오인하지 않는다",()=>{
 const changedOrder=Object.fromEntries(Object.entries(slide).reverse()) as SlideSpec;
 assert.equal(sameReviewedSlide(slide,{...changedOrder,quality:{warnings:["검토"],fillRatio:.5,attempts:1}}),true);
 assert.equal(sameReviewedSlide(slide,{...changedOrder,headline:"사용자가 바꾼 제목"}),false);
 assert.equal(sameReviewedSlide(slide,{...changedOrder,data:{value:123}}),false);
});
test("직접 수정한 장에는 예전 문구의 잘림 경고와 이미지 통과 상태를 재사용하지 않는다",()=>{
 const working=applyCalculation(slide,calc),base={...deck,outline:[{...item,index:0}],candidates:{0:[working]},picked:{0:0},edited:{}};
 const modified={...working,headline:"표시 항목을 보존한 새 제목입니다.",quality:{warnings:["이전 문구가 잘립니다"],fillRatio:.5,attempts:2}};
 const next=invalidateStaleReview(base,{...base,edited:{0:modified}})!;
 assert.ok(!next.edited[0].quality?.warnings.includes("이전 문구가 잘립니다"));assert.equal(next.edited[0].quality?.attempts,2);assert.deepEqual(next.edited[0].data,modified.data);
});
test("음수 누적 차트의 항목명은 막대 아래, 내부 값은 대비되는 배경에 출력한다",async()=>{
 const chart={...slide,layoutId:"c-multi-bar",data:{categories:["하락","기준"],series:[{name:"구성 A",values:[-8,5]},{name:"구성 B",values:[0,2]}],unit:"원",mode:"누적",takeaway:"서로 다른 가정의 결과입니다."}} as SlideSpec;
 const d={...deck,outline:[{...item,index:0}],candidates:{0:[chart]},picked:{0:0},edited:{}};
 const zip=await JSZip.loadAsync(await(await exportDeck(d,false)).write({outputType:"nodebuffer"}) as Buffer);
 const xml=await zip.file("ppt/charts/chart1.xml")!.async("string");
 assert.ok(xml.includes('<c:tickLblPos val="low"/>'));
 assert.match(xml,/<c:dLbls>[\s\S]*?<c:spPr><a:solidFill>/,"0 값도 사라지지 않게 레이블 배경을 유지");
 assert.match(xml,/<a:defRPr[^>]*>[\s\S]*?<a:srgbClr val="FFFFFF"/);
});



test("native horizontal chart preserves all values and preview category order",async()=>{
 const calculated=applyCalculation(slide,calc),d={...deck,outline:[{...item,index:0}],candidates:{0:[calculated]},picked:{0:0},edited:{}};
 const zip=await JSZip.loadAsync(await(await exportDeck(d,false)).write({outputType:"nodebuffer"}) as Buffer);
 const chartPath=Object.keys(zip.files).find(path=>/^ppt\/charts\/chart\d+\.xml$/.test(path));assert.ok(chartPath);const xml=await zip.file(chartPath)!.async("string");
 assert.match(xml,/<c:catAx>[\s\S]*?<c:orientation val="maxMin"/);
 assert.ok(Object.keys(zip.files).some(path=>path.startsWith("ppt/embeddings/")&&path.endsWith(".xlsx")),"editable chart workbook is retained");
 for(const value of [3000,2000,1000,500,3500])assert.ok(xml.includes(`<c:v>${value}</c:v>`));
});

test("repair safety gives content loss priority over cosmetic cleanup",async()=>{
 const {inspectSlide,repairSafetyScore}=await import("../src/lib/slide-quality");
 const good=applyCalculation(slide,calc),bad=structuredClone(good);(bad.data.items as unknown[]).splice(0,2);bad.data.assumption="가정";
 const before=inspectSlide(good,item,input,[]),after=inspectSlide(bad,item,input,[]);
 assert.ok(after.warnings.some(w=>w.startsWith("계산 결과 누락")));assert.ok(repairSafetyScore(after.warnings)>repairSafetyScore(before.warnings));
 assert.equal(repairSafetyScore(["글꼴 점검","출처 기준 확인"]),0);
});

test("small explicit calculations prefer formula cards rather than an unrelated time layout",()=>{
 const small={...calc,steps:calc.steps.slice(0,2)};
 assert.equal(candidatePlan(input,{...item,calculation:small})[0],"c-formula-cards");
 assert.ok(!candidatePlan(input,{...item,calculation:small}).some(id=>id.endsWith("contract-bars")));
});
