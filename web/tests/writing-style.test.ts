import { test } from "node:test";
import assert from "node:assert/strict";
import { aiStyleHeadlineIssue, smoothDashes } from "../src/lib/slide-quality";
import { cleanInlineMarks } from "../src/lib/ai";
import { consultingStylePrompt, slideCompositionPrompt } from "../src/lib/consulting-style";

test("AI 문체 키메시지를 찾는다(동한 문체 가이드)", () => {
  for (const text of [
    "생성형 AI는 단순히 비용 절감 도구가 아니라 영업 방식을 바꾸는 수단입니다",
    "결국 중요한 것은 현업 부서의 데이터 접근 권한입니다",
    "생성형 AI는 보험사의 업무 효율을 혁신적으로 높이고 있습니다",
    "다양한 부서에서 효과적인 활용 사례가 나오고 있습니다",
    "콜센터 자동화는 비용을 줄일 것으로 보일 수 있습니다",
    "보험사는 심사 — 증권사는 리서치에 먼저 적용했습니다",
    "심사 자동화 → 상담 요약 순서로 확산됐습니다",
  ]) assert.ok(aiStyleHeadlineIssue(text), text);
});

test("주제 주장 키메시지는 그대로 둔다", () => {
  for (const text of [
    "미래에셋증권은 사내 AIOps 플랫폼을 구축했습니다.",
    "그렇지만 증권사의 활용은 리서치 요약 단계에 머물러 있습니다",
    "보안 심사 기간이 길어 현업 확산은 내년 이후가 될 가능성이 높습니다",
    "KB손해보험은 2025년 보상 심사에 생성형 AI를 붙여 처리 시간을 줄였습니다",
    "전체 시장 규모는 2024년 1조 원을 넘어섰습니다",
  ]) assert.equal(aiStyleHeadlineIssue(text), null, text);
});

test("문장 연결용 대시는 쉼표로, 숫자 범위는 물결로 바꾼다", () => {
  assert.equal(smoothDashes("보험사 — 심사 자동화"), "보험사, 심사 자동화");
  assert.equal(smoothDashes("2024–2025 도입"), "2024~2025 도입");
  assert.deepEqual(cleanInlineMarks({ items: [{ label: "증권사–리서치 요약 [추론]" }, { label: "—" }] }), { items: [{ label: "증권사, 리서치 요약" }, { label: "—" }] });
});

test("후보 생성 지시문에 문체 규칙이 들어 있다", () => {
  assert.match(consultingStylePrompt, /단순히 X가 아니라 Y/);
  assert.match(consultingStylePrompt, /대시\(—\)와 화살표\(→\)/);
  assert.match(slideCompositionPrompt, /이름 없는 권위/);
});
