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

test("근거 ID·계산 누락은 덱 전체 재생성 대신 해당 장만 고칠 대상으로 찾는다", async () => {
  const { storySlideProblems } = await import("../src/lib/storyline");
  const item = (section: string, role: string, refs: string[], claimType = "추론", calculation: unknown = null) => ({ section, role, claimType, evidenceRefs: refs, calculation }) as never;
  const problems = storySlideProblems(input(6), { evidence: [{ id: "E1" }] as never }, [item("표지", "사실 제시", []), item("요약", "판단", ["E1"]), item("현황", "사실 제시", []), item("규모", "계산", ["E1"]), item("실행", "합의 사항", []), item("결론", "판단", ["E1"])]);
  assert.deepEqual(problems.map(p => p.index), [2, 3]);
  assert.match(problems[1].reasons[0], /calculation/);
});

test("검색어별 출처를 번갈아 합쳐 뒤쪽 회사 검색 결과도 먼저 열리게 한다", async () => {
  const { interleaveSources } = await import("../src/lib/research-questions");
  const u = (url: string) => ({ url });
  assert.deepEqual(interleaveSources([[u("a1"), u("a2"), u("a3")], [u("b1"), u("a1")], [u("c1")]]).map(s => s.url), ["a1", "b1", "c1", "a2", "a3"]);
});

test("Claude 경로는 덱 공통 앞부분을 캐시 블록으로 나누고, 합치면 원래 JSON과 같다", async () => {
  const { markDeckCommon, CACHE_SPLIT } = await import("../src/lib/ai");
  const json = JSON.stringify({ input: { topic: "x" }, deckSequence: [], item: { index: 1 }, count: 3 });
  assert.equal(markDeckCommon({ provider: "openai" }, json), json);
  const marked = markDeckCommon({ provider: "anthropic" }, json);
  assert.ok(marked.includes(CACHE_SPLIT));
  assert.equal(marked.split(CACHE_SPLIT).join(""), json);
});
