import test from "node:test";
import assert from "node:assert/strict";
import { fitStoryOutline } from "../src/lib/slide-quality";
import { storySlidePlan } from "../src/lib/storyline";
import type { DeckInput } from "../src/lib/model";

const deck = (sections: [string, string][]) => sections.map(([section, role]) => ({ section, role }));
const input = (slideCount: number, extra: Partial<DeckInput> = {}) => ({ slideCount, deckType: "consulting", ...extra }) as DeckInput;

test("장별 설계가 1~2장 넘치면 작은 덱의 목차부터, 그다음 결론 앞 본문부터 빼서 맞춘다(배포판 Claude 6장 실패 재현)", () => {
  const outline = deck([["표지", "사실 제시"], ["결론 요약", "판단"], ["목차", "사실 제시"], ["현황", "사실 제시"], ["경쟁", "비교"], ["문제 정의", "판단"], ["실행", "우선순위"], ["결론", "합의 사항"]]);
  const fitted = fitStoryOutline(outline, input(6));
  assert.equal(fitted.error, null);
  assert.deepEqual(outline.map(o => o.section), ["표지", "결론 요약", "현황", "경쟁", "문제 정의", "결론"]);
  const appended = deck([["표지", "x"], ["결론 요약", "판단"], ["현황", "x"], ["경쟁", "x"], ["실행", "x"], ["추가", "x"], ["결론", "x"], ["출처", "x"]]);
  assert.equal(fitStoryOutline(appended, input(7, { appendSources: true })).error, null);
  assert.deepEqual(appended.map(o => o.section).slice(-2), ["결론", "출처"]);
});

test("모자라거나 3장 이상 넘치면 현재 장 수를 알려 다시 요청한다", () => {
  const short = deck([["표지", "x"], ["결론 요약", "판단"], ["현황", "x"], ["결론", "x"]]);
  assert.match(fitStoryOutline(short, input(6)).error ?? "", /정확히 6장.*지금 4장/);
  const long = deck(Array.from({ length: 9 }, (_, i) => [i ? "본문" : "표지", "판단"] as [string, string]));
  assert.match(fitStoryOutline(long, input(6)).error ?? "", /지금 9장/);
});

test("결론 요약 장의 role이 틀리면 판단으로 고치고 헤드라인 재작성 대상으로 표시한다(배포판 8장 실패 재현)", () => {
  const outline = deck([["표지", "사실 제시"], ["목차", "사실 제시"], ["현황", "사실 제시"], ["경쟁", "비교"], ["고객", "사실 제시"], ["문제", "판단"], ["실행", "우선순위"], ["결론", "합의 사항"]]);
  const fitted = fitStoryOutline(outline, input(8));
  assert.equal(fitted.error, null);
  assert.equal(fitted.forcedSummary, 2);
  assert.equal(outline[2].role, "판단");
  assert.equal(fitStoryOutline(deck([["표지", "x"], ["요약", "우선순위"], ["a", "x"], ["b", "x"], ["c", "x"], ["결론", "x"]]), input(6)).forcedSummary, null);
});

test("장 수 계획은 고정 자리와 본문 장 수를 알려 주고, 10장 미만 덱에는 목차를 넣지 않는다", () => {
  const six = storySlidePlan(input(6));
  assert.equal(six.bodySlides, 3);
  assert.match(six.rule, /목차를 넣지 않습니다/);
  const twenty = storySlidePlan(input(20, { appendSources: true }));
  assert.equal(twenty.bodySlides, 15);
});
