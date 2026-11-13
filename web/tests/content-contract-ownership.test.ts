import test from "node:test";
import assert from "node:assert/strict";
import {normalizeContractText,anchorSatisfied,slideContractMaterial,contractSource} from "../src/lib/content-contract";
test("readable Korean magnitudes retain numeric meaning without changing currency or period",()=>{
 assert.equal(normalizeContractText("12.27억 달러/년"),normalizeContractText("1,227,000,000달러/년"));
 assert.equal(normalizeContractText("123,301백만 달러"),normalizeContractText("123301000000달러"));
 assert.equal(anchorSatisfied("1,227,000,000달러/년","기준 매출 12.27억 달러/년"),true);
 assert.notEqual(normalizeContractText("12억 원"),normalizeContractText("12억 달러"));
 assert.notEqual(normalizeContractText("12억달러/년"),normalizeContractText("12억달러/월"));
 assert.notEqual(normalizeContractText("−12억달러"),normalizeContractText("12억달러"));
 assert.notEqual(normalizeContractText("25%"),normalizeContractText("0.25비율"));
 assert.equal(anchorSatisfied("13억달러","매출 12.27억달러"),false);
});
test("a slide contract cannot inherit unrelated evidence or rendering instructions",()=>{
 const item={section:"요약",role:"판단",message:"연결 전략이 먼저입니다.",contentHint:"기존 고객 기반 활용",argument:{judgment:"먼저 연결",support:[{text:"공개 API 보유"}],limitation:"도입 성과와 구분",reversalCondition:"실제 수익성 악화",visualIntent:"숫자 카드보다 요약표를 사용"},irrelevantEvidence:"전체 30년 재무를 모두 표시"};
 const s=contractSource(slideContractMaterial(item,{purpose:"투자 선택",stage:"final"}));
 assert.ok(s.includes("공개 API 보유"));assert.ok(s.includes("실제 수익성 악화"));assert.ok(!s.includes("요약표"));assert.ok(!s.includes("전체 30년"));
});
