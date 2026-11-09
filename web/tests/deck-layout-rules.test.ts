import test from "node:test";
import assert from "node:assert/strict";
import { deckLayoutIssue, avoidDeckRepeats, cardFamilyLimit, plannedFirstLayouts } from "../src/lib/candidate-plan";
import { expandedRegistry } from "../src/lib/expanded-layouts";
import type { LayoutId } from "../src/lib/model";

test("R1 같은 레이아웃은 덱당 2회, 4장 이상 간격", () => {
  const before = ["c-cover", "c-toc", "c-funnel", "c-timeline", "c-matrix"];
  assert.match(deckLayoutIssue("c-funnel", before, 20) ?? "", /간격/);
  assert.equal(deckLayoutIssue("c-funnel", [...before, "c-trend"], 20), null);
  assert.match(deckLayoutIssue("c-funnel", ["c-cover", "c-funnel", "c-a", "c-b", "c-c", "c-funnel", "c-d", "c-e", "c-f", "c-g"], 20) ?? "", /2회/);
  assert.equal(deckLayoutIssue("c-evidence-table", ["c-cover", "c-evidence-table"], 20), null);
});

test("R2 카드형 계열은 연속 금지, 5장당 1회", () => {
  assert.equal(cardFamilyLimit(20), 4);
  assert.equal(cardFamilyLimit(6), 2);
  assert.match(deckLayoutIssue("c-argument-board", ["c-cover", "c-header-boxes"], 20) ?? "", /연속/);
  const four = ["c-cover", "c-header-boxes", "c-trend", "c-compare", "c-trend2", "c-argument-board", "c-x", "c-system-compare", "c-y"];
  assert.match(deckLayoutIssue("c-judgment-reversal", four, 20) ?? "", /너무 많/);
  assert.equal(deckLayoutIssue("c-judgment-reversal", four.slice(0, 7), 20), null);
});

test("R3 결론 요약은 앞쪽, 벤치마킹 카드·포지셔닝은 한 번", () => {
  assert.equal(deckLayoutIssue("c-executive-summary", ["c-cover"], 20), null);
  assert.match(deckLayoutIssue("c-executive-summary", ["c-cover", "c-toc", "c-a", "c-b"], 20) ?? "", /앞쪽/);
  for (const id of ["c-benchmark-cards", "c-positioning"]) assert.match(deckLayoutIssue(id, ["c-cover", id, "c-a", "c-b", "c-c", "c-d"], 20) ?? "", /한 번/);
});

test("R5 규칙을 지키는 후보 중 아직 쓰지 않은 구성을 먼저 고른다", () => {
  const plan = ["c-funnel", "c-matrix", "c-timeline"] as LayoutId[];
  assert.deepEqual(avoidDeckRepeats(plan, ["c-cover", "c-funnel"], ["c-trend"] as LayoutId[], true, 20), ["c-matrix"]);
  assert.deepEqual(avoidDeckRepeats(plan, ["c-cover", "c-funnel", "c-a", "c-b", "c-c", "c-matrix"], [] as LayoutId[], true, 20), ["c-timeline"]);
  // 규칙을 지킬 후보가 없으면 바로 앞 장 중복만 피한다.
  assert.deepEqual(avoidDeckRepeats(["c-funnel"] as LayoutId[], ["c-cover", "c-funnel"], [] as LayoutId[], true, 20), ["c-funnel"]);
  assert.equal(avoidDeckRepeats(plan, ["c-cover"], [], false, 20).length, 3);
});

test("20장 역할 덱의 장별 첫 계획은 규칙을 지키고 14종 이상을 쓴다", () => {
  const roles = ["판단", "흐름", "사실 제시", "근거", "비교", "흐름", "사실 제시", "우선순위", "계산", "일정", "근거", "비교", "사실 제시", "판단", "흐름", "근거", "일정", "우선순위", "마무리"];
  const outline = [{ index: 0, section: "표지", message: "표지", contentHint: "" }, ...roles.map((role, i) => ({ index: i + 1, section: role === "흐름" ? "목차" : "본문", role, message: `${role} 메시지`, contentHint: "" }))];
  const input = { deckType: "consulting", topic: "협력업체 교섭력", slideCount: 20 } as never;
  const plan = plannedFirstLayouts(input, outline as never);
  assert.equal(plan.length, 20);
  const violations = plan.map((id, i) => i ? deckLayoutIssue(id, plan.slice(0, i), 20) : null).filter(Boolean);
  assert.ok(violations.length <= 2, JSON.stringify({ plan, violations }));
  assert.ok(new Set(plan).size >= 14, JSON.stringify(plan));
});

test("R6 레이아웃 설명이 내용 맞춤 조건을 담는다", () => {
  assert.match(expandedRegistry["interview-quotes"].avoid, /발언이 아닌/);
  assert.match(expandedRegistry["metrics-panel"].avoid, /수치 지표 없이/);
});
