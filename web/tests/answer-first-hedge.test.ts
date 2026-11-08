import test from "node:test";
import assert from "node:assert/strict";
import { isHedgeHeadline, excessHedgeIndices, answerFirstError, answerFirstIndex, HEDGE_HEADLINE_LIMIT } from "../src/lib/slide-quality";
import { expandedSchemas, expandedRegistry } from "../src/lib/expanded-layouts";
import { expandedSample } from "../src/lib/expanded-samples";
import { slideCompositionPrompt, consultingStylePrompt } from "../src/lib/consulting-style";

test("판단 보류형 키메시지를 찾고 확정 판단은 통과시킨다", () => {
  for (const text of ["현재 자료로는 20대 수요를 판단할 수 없습니다", "경쟁사 매출은 아직 확인되지 않았습니다", "**전자책 전환율**은 추가 조사가 필요합니다", "효과는 단정하기 어렵습니다"]) assert.equal(isHedgeHeadline(text), true, text);
  for (const text of ["20대 공략 1순위는 서점 공간 × 굿즈입니다", "전자책 구독은 학생 요금으로 진입해야 합니다", "표본이 작아 가설로 두되, 방문 빈도가 오르면 순위를 유지합니다"]) assert.equal(isHedgeHeadline(text), false, text);
});

test("상한을 넘는 유보형 장은 앞쪽부터 고치고 뒤쪽 한계 장을 남긴다", () => {
  const pages = [1, 2, 3, 4, 6].map(index => ({ index, text: index === 4 ? "1순위는 텍스트힙 공간입니다" : "수요는 판단할 수 없습니다" }));
  assert.equal(HEDGE_HEADLINE_LIMIT, 2);
  assert.deepEqual(excessHedgeIndices(pages), [1, 2]);
  assert.deepEqual(excessHedgeIndices(pages.slice(0, 2)), []);
  assert.deepEqual(excessHedgeIndices([]), []);
});

test("컨설팅 6장 이상은 표지·목차 다음 장이 결론 요약이어야 한다", () => {
  const outline = (second: string, role: string) => [{ section: "표지", role: "마무리" }, { section: second, role: second === "목차" ? "흐름" : role }, { section: "요약", role }, { section: "근거", role: "근거" }, { section: "근거", role: "사실 제시" }, { section: "결론", role: "마무리" }];
  assert.equal(answerFirstIndex(outline("요약", "판단")), 1);
  assert.equal(answerFirstIndex(outline("목차", "판단")), 2);
  assert.equal(answerFirstError("consulting", outline("요약", "우선순위")), null);
  assert.equal(answerFirstError("consulting", outline("목차", "판단")), null);
  assert.match(answerFirstError("consulting", outline("근거", "사실 제시")) ?? "", /결론 요약/);
  assert.equal(answerFirstError("marketing", outline("근거", "사실 제시")), null);
  assert.equal(answerFirstError("consulting", outline("근거", "사실 제시").slice(0, 5)), null);
});

test("설문 장은 표본 10 미만을 거부하고 30 미만은 소표본으로 표시한다", async () => {
  const survey = expandedSample("c-survey-findings")!;
  assert.equal(expandedSchemas["survey-findings"].safeParse({ ...survey, sampleSize: 1 }).success, false);
  assert.equal(expandedSchemas["survey-findings"].safeParse({ ...survey, sampleSize: 9 }).success, false);
  assert.equal(expandedSchemas["survey-findings"].safeParse({ ...survey, sampleSize: 17 }).success, true);
  assert.match(expandedRegistry["survey-findings"].minimum, /n≥10/);
  const { makeScene } = await import("../src/lib/scene");
  const { design } = await import("../src/lib/design");
  const texts = (n: number) => makeScene({ layoutId: "c-survey-findings", headline: "설문 결과", section: "근거", sources: [], data: { ...survey, sampleSize: n } } as never, design("ict-forest" as never), 3, "주제").nodes.map(node => node.kind === "text" ? node.text : "").join("|");
  assert.match(texts(17), /n=17 \(소표본\)/);
  assert.doesNotMatch(texts(120), /소표본/);
});

test("평가 매트릭스 등급 의미와 결론 먼저 흐름이 생성 지시에 들어 있다", () => {
  assert.match(expandedRegistry["evaluation-matrix"].use, /매력도·적합도/);
  assert.match(slideCompositionPrompt, /근거를 확인한 정도를 등급으로 쓰지 않/);
  assert.match(consultingStylePrompt, /결론 요약을 먼저/);
});

test("실제 교보문고 실행의 판단 보류형 표현과 형식만 결론인 요약을 잡는다", async () => {
  const { isWeakSummaryHeadline } = await import("../src/lib/slide-quality");
  for (const text of [
    "디지털 독서 경쟁사는 구독·콘텐츠 사례를 보여주지만 우열은 아직 판정할 수 없다",
    "차별화 후보는 서비스 경험에서 찾되, 선점 위험은 추가 비교가 필요하다",
    "대학생의 교보문고 인식과 이용 경험은 현재 공개 근거로 확인되지 않는다",
    "디지털 편의성·가격 가치·오프라인 경험은 확인된 니즈가 아니라 검증 가설이다",
    "자료는 시장·서비스 현황을 말해주지만 대학생의 선택과 사업성은 추가 검증이 필요하다",
  ]) assert.equal(isHedgeHeadline(text), true, text);
  assert.equal(excessHedgeIndices([4, 5, 6, 7, 9].map(index => ({ index, text: "우열은 아직 판정할 수 없다" }))).length, 3);
  assert.equal(isWeakSummaryHeadline("중간 발표의 결론은 전략 확정이 아니라 근거 수준을 구분한 현황 진단이다"), true);
  assert.equal(isWeakSummaryHeadline("20대 공략 1순위는 서점 공간 × 굿즈, 2순위는 전자책 학생 요금입니다"), false);
  assert.equal(isHedgeHeadline("1순위는 오프라인 서점 × 굿즈이며, 방문 빈도가 낮으면 2순위와 교체합니다"), false);
});

test("2차 실행의 보류형 표현과 메타 요약을 잡는다", async () => {
  const { isWeakSummaryHeadline } = await import("../src/lib/slide-quality");
  for (const text of [
    "출판유통망의 채널 비중은 도서 판매 구조를 보여줄 뿐, 교보문고 성과나 대학생 수요를 설명하지 않습니다.",
    "현재 공개 근거로는 20대 대학생의 교보문고 인식을 진단할 수 없습니다.",
    "디지털 편의성·가격 가치·오프라인 경험은 대학생에게 아직 검증할 가설입니다.",
    "전자책·디지털 독서를 먼저 검토하되, 대학생 지불 의사와 수익성 확인 전에는 확정하지 않습니다.",
    "공개 자료는 시장 배경을 보여주지만, 대학생 수요와 사업성은 확정하지 못합니다.",
  ]) assert.equal(isHedgeHeadline(text), true, text);
  assert.equal(isHedgeHeadline("20대의 교보 이용은 도서 구매 목적 방문에 집중되고, 비도서 사업 인지는 낮습니다."), false);
  assert.equal(isWeakSummaryHeadline("이번 중간 발표는 현황 진단을 우선하고, 성장 기회는 가설로 다룹니다."), true);
  assert.equal(isWeakSummaryHeadline("20대 공략은 전자책 학생 요금이 1순위, 오프라인 프로그램이 2순위라는 가설에서 출발합니다."), false);
});

test("3차 실행: '자료가 증명·입증하지 않는다'형 부정 헤드라인을 잡는다", () => {
  for (const text of [
    "전국 독서·여가 통계는 배경 신호이며, 20대 대학생의 선택 기준을 증명하지 않습니다",
    "전국 여가 신호는 경험 가설의 출발점일 뿐, 20대의 선호를 입증하지 않습니다.",
    "공개 자료는 사업 실적과 시장 배경까지만 말하며, 20대 인식과 사업별 원인은 입증하지 않습니다.",
  ]) assert.equal(isHedgeHeadline(text), true, text);
  assert.equal(isHedgeHeadline("2024년 교보문고는 매출이 가장 컸지만 영업이익률은 음수였습니다."), false);
  assert.equal(isHedgeHeadline("교보문고는 핵심 서점 수익성을 먼저 진단하고, 디지털·클래스는 검증 후보로 봐야 합니다."), false);
});
