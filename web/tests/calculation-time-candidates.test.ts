import test from "node:test";
import assert from "node:assert/strict";
import {calculationTimeLayoutFits, candidatePlan, widerPool} from "../src/lib/candidate-plan";
import type {DeckInput, LayoutId, OutlineItem} from "../src/lib/model";

const input: DeckInput = {deckType:"consulting",designSystemId:"ict-forest",topic:"신규 서비스 수익 검토",purpose:"의사결정",slideCount:8};
const item: OutlineItem = {index:4,section:"계산",role:"계산",message:"연간 매출은 판매량과 순증 전환율로 계산합니다",contentHint:"월 순증 매출 5달러 × 12개월, 낮음·기준·높음 3단계 시나리오. 확인일 2026-11-13, 공시일 2026-11-03."};

test("revenue periods, stage counts and source dates do not authorize schedule candidates",()=>{
  for(const id of ["c-scenario-gantt","c-calendar","c-date-timeline","c-contract-bars","c-vertical-events","c-timeline"] as LayoutId[])
    assert.equal(calculationTimeLayoutFits(id,item),false,id);
  assert.ok(!widerPool(input,item).includes("c-scenario-gantt"));
  for(let rotation=0;rotation<30;rotation++) assert.ok(!candidatePlan(input,item,[],rotation).includes("c-scenario-gantt"));
});

test("actual dated occupancy intervals remain eligible for calculation gantts",()=>{
  const dated={...item,contentHint:"객실 A 계약 2026-09-01~2026-10-31, 객실 B 2026-11-01부터2026-12-20까지. 공실 일수와 수익을 계산합니다."};
  assert.equal(calculationTimeLayoutFits("c-scenario-gantt",dated),true);
  assert.ok(widerPool(input,dated).includes("c-scenario-gantt"));
});

test("labeled calendar bounds and Korean dates are accepted, not invalid or reversed dates",()=>{
  assert.equal(calculationTimeLayoutFits("c-scenario-gantt",{...item,contentHint:"입주: 2026년 9월 1일, 퇴거: 2026년 10월 31일"}),true);
  for(const contentHint of ["2026-02-30~2026-03-31","2026-11-01~2026-09-01","2026-09-01~2026-09-01","0~6개월, 6~18개월의 단계수만 주어짐"])
    assert.equal(calculationTimeLayoutFits("c-scenario-gantt",{...item,contentHint}),false,contentHint);
});

test("explicit storyline preference permits a calculation time layout without inventing a default",()=>{
  const explicit={...item,argument:{preferredLayouts:["c-scenario-gantt"]}} as OutlineItem;
  assert.equal(calculationTimeLayoutFits("c-scenario-gantt",explicit),true);
  assert.ok(widerPool(input,explicit).includes("c-scenario-gantt"));
  assert.equal(calculationTimeLayoutFits("c-calendar",explicit),false);
});

test("noncalculation roles and nontemporal calculation layouts retain their eligibility",()=>{
  for(const role of ["일정","흐름","비교"] as const)
    assert.equal(calculationTimeLayoutFits("c-scenario-gantt",{...item,role}),true);
  assert.equal(calculationTimeLayoutFits("c-comparison-table",item),true);
  assert.equal(calculationTimeLayoutFits("c-formula-cards",item),true);
  // A user's direct layout request is not an automatic recommendation.
  assert.deepEqual(candidatePlan(input,item,[],0,1,"c-scenario-gantt"),["c-scenario-gantt"]);
});

test("the same temporal guard applies to marketing and structured contract intervals",()=>{
  const marketing={...input,deckType:"marketing" as const};
  assert.ok(!widerPool(marketing,item).includes("m-scenario-gantt"));
  const contracted={...item,contentContract:{version:1 as const,requirements:[{id:"period",kind:"condition" as const,quote:"계약 구간 2026/09/01~2026/10/31",anchors:["계약 구간"],display:"body" as const}],comparisonDimensions:[]}};
  assert.equal(calculationTimeLayoutFits("m-scenario-gantt",contracted),true);
  assert.ok(widerPool(marketing,contracted).includes("m-scenario-gantt"));
});
