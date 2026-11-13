import test from "node:test";
import assert from "node:assert/strict";
import {visibleProductionMetaIssue} from "../src/lib/editorial-quality";
import {inspectSlide} from "../src/lib/slide-quality";
import type {SlideSpec} from "../src/lib/model";

test("visible takeaways cannot explain why their own presentation format won",()=>{
 for(const text of [
  "번호형 목차에 각 범위와 판단 근거를 함께 배치합니다. 순서형 흐름보다 각 결론의 근거와 반전 조건을 함께 읽기 유리합니다.",
  "요약표보다 서로 다른 근거가 한 결론으로 모이는 구성이 적절합니다.",
  "이 후보는 다른 레이아웃보다 비교하기 쉽고, 이 레이아웃을 선택했습니다.",
  "이 레이아웃이 가장 적합합니다.",
 ])assert.ok(visibleProductionMetaIssue(text),text);
});
test("business judgments and real design-comparison subjects remain valid",()=>{
 for(const text of [
  "Apple은 기존 AI 연결과 개발자 확대를 우선하고 자체 기기는 사용성과 수익성 조건으로 확대합니다.",
  "고객 여정은 탐색, 비교, 결제 순서로 이어집니다.",
  "채널 구조를 비교하면 검색 유입에서 구매까지의 이탈이 드러납니다.",
  "일정표보다 현금흐름이 투자 판단에 중요합니다.",
  "레이아웃은 공간 제약과 사용 목적에 따라 달라집니다.",
 ])assert.equal(visibleProductionMetaIssue(text),null,text);
 assert.equal(visibleProductionMetaIssue("번호형 목차는 순서형 흐름보다 읽기 유리합니다.","목차 유형 비교 연구"),null);
});
test("the inspector checks rendered body and takeaway but does not inspect notes or rationale",()=>{
 const input={topic:"Apple AI 글래스 전략",purpose:"전략 선택",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:6};
 const item={index:2,section:"목차",role:"흐름" as const,message:"고객 접점의 이동을 살펴봅니다.",contentHint:"분석 범위"};
 const meta="요약표보다 서로 다른 근거가 한 결론으로 모이는 구성이 적절합니다.";
 const slide:SlideSpec={layoutId:"c-split-insight",section:"목차",headline:item.message,data:{takeaway:meta,evidence:[{title:"시장",body:"시장 조건"},{title:"고객",body:"고객 조건"}],implication:"우선 연결 기능을 검증합니다."},sources:[],notes:""};
 assert.ok(inspectSlide(slide,item,input,[]).warnings.some(w=>w.startsWith("제작 메타 문구:")),"목차 exemption cannot suppress a rendered production verdict");
 const valid={...slide,data:{...slide.data,takeaway:"기존 연결을 우선 확대하고 자체 기기는 단계적으로 검증합니다.",rationale:meta},notes:meta};
 assert.ok(!inspectSlide(valid,item,input,[]).warnings.some(w=>w.startsWith("제작 메타 문구:")),"internal rationale must remain available without a visible-copy false positive");
 const body={...valid,data:{...valid.data,evidence:[{title:"선택",body:meta},{title:"조건",body:"사용자 실험으로 검증"}]}};
 assert.ok(inspectSlide(body,item,input,[]).warnings.some(w=>w.startsWith("제작 메타 문구:")));
});
