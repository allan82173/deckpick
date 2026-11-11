import test from "node:test";
import assert from "node:assert/strict";
import { isDeckMetaHeadline } from "../src/lib/slide-quality";
import { cleanInlineMarks } from "../src/lib/ai";

test("덱 구성·근거 강도를 말하는 메타 키메시지를 찾는다(배포판 Haiku 실행 사례)", () => {
  for (const meta of [
    "결론을 먼저 제시하고 근거는 현황·활용·요인 순으로 뒤에 붙이는 구성이 적합합니다",
    "목차는 결론을 먼저 두고 근거를 뒤에 붙여 검토합니다",
    "보험사와 증권사는 근거 수준이 달라 단계 비교에 주의가 필요합니다",
    "보험사는 설문 근거가 있지만 증권사는 계획 발언 근거뿐입니다",
    "원문 확인 근거만 단정하고 나머지는 가설·추정으로 나눠 봅니다",
  ]) assert.equal(isDeckMetaHeadline(meta), true, meta);
  for (const claim of [
    "주요 금융사는 사내 업무지원 단계이며 영업·상담이 우선, 통제 체계 정비가 과제입니다",
    "미래에셋증권 영업이익은 1조 9,150억 원(+61%)이나 AI 투자와의 연결은 입증되지 않았습니다",
    "통제 체계가 도입 속도보다 뒤처진 점이 가장 큰 제약입니다",
    "부서별 활용은 영업·상담이 가장 앞서며, 이는 근거가 많은 순서로 본 잠정 순위입니다.",
  ]) assert.equal(isDeckMetaHeadline(claim), false, claim);
});

test("본문 칸의 주장 유형 표시와 근거 번호를 걷어내고 tag 필드는 그대로 둔다", () => {
  const data = { tag: "추론", items: [{ value: "부분 확산 [추론]", basis: "설문 10곳 [9]" }, { label: "[1][6][9][12][13]", note: "KB증권 계획 [가설] [3]" }] };
  assert.deepEqual(cleanInlineMarks(data), { tag: "추론", items: [{ value: "부분 확산", basis: "설문 10곳" }, { label: "근거 5건", note: "KB증권 계획" }] });
});
