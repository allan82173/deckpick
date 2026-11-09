import test from "node:test";
import assert from "node:assert/strict";
import { fitTextNodes, type TextNode, type SceneNode } from "../src/lib/scene";
import { avoidPreviousLayout, plannedFirstLayouts, candidatePlan } from "../src/lib/candidate-plan";
import { slideRoles } from "../src/lib/evidence-model";
import { demoOutline } from "../src/lib/demo";
import type { DeckInput, LayoutId } from "../src/lib/model";

const text = (x: number, value: string, size = 14): TextNode => ({ kind: "text", x, y: 2, w: 3, h: .6, text: value, size, color: "#000000", lineHeight: 1.2 });

test("overflowing text shrinks to fit and its sibling boxes share the same, most readable fitting size", () => {
  const long = "가".repeat(60), warnings: string[] = [];
  const nodes: SceneNode[] = [text(.5, long), text(4, "짧은 문구"), text(7.5, "짧은 문구"), { ...text(1, "다른 크기", 20), y: 5 }];
  const fitted = fitTextNodes(nodes, warnings) as TextNode[];
  assert.ok(fitted[0].size < 14 && fitted[0].size >= 10.5);
  assert.equal(fitted[1].size, fitted[0].size); assert.equal(fitted[2].size, fitted[0].size);
  assert.equal(fitted[3].size, 20, "boxes of another size are untouched");
  assert.deepEqual(warnings, []);
  assert.equal(fitTextNodes([text(.5, "가".repeat(59))], []).length, 1);
});

test("text that cannot fit above the readability floor keeps the floor size and asks for shorter wording", () => {
  const warnings: string[] = [];
  const [node] = fitTextNodes([text(.5, "가".repeat(400))], warnings) as TextNode[];
  assert.equal(node.size, 10.5); assert.match(warnings[0], /문구 축약 필요/);
  const unchanged: SceneNode[] = [text(.5, "짧음")];
  assert.equal(fitTextNodes(unchanged, []), unchanged, "fitting nodes are returned as-is");
});

test("the first candidate does not repeat the previous slide's layout when another fits the role", () => {
  assert.deepEqual(avoidPreviousLayout(["c-compare", "c-matrix", "c-timeline"] as LayoutId[], "c-compare", [], false), ["c-matrix", "c-timeline", "c-compare"]);
  assert.deepEqual(avoidPreviousLayout(["c-compare"] as LayoutId[], "c-compare", ["c-compare", "c-matrix"] as LayoutId[], true), ["c-matrix"]);
  assert.deepEqual(avoidPreviousLayout(["c-compare"] as LayoutId[], "c-compare", ["c-compare"] as LayoutId[], true), ["c-compare"], "no alternative keeps the plan");
  for (const deckType of ["consulting", "marketing"] as const) {
    const input: DeckInput = { topic: "합성 과제", purpose: "레이아웃 다양성", slideCount: 10, deckType, designSystemId: "ict-forest" };
    const plan = plannedFirstLayouts(input, demoOutline(input));
    for (let i = 1; i < plan.length; i++) assert.notEqual(plan[i], plan[i - 1], `${deckType} ${i}`);
  }
});

test("text-grid tables and low-scored layouts never appear as automatic candidates", () => {
  // comparison-table은 2026-11-09 대안 카드 비교로 바뀌어 글자 표가 아니므로 자동 후보에 다시 포함한다(사용자 승인).
  const banned = ["validation-plan", "cross-matrix", "evidence-scope", "compare", "calculation-flow", "system-flow"];
  for (const deckType of ["consulting", "marketing"] as const) for (const role of slideRoles) for (let rotation = 0; rotation < 4; rotation++) {
    const input: DeckInput = { topic: "합성", purpose: "표 제외", slideCount: 8, deckType, designSystemId: "ict-forest" };
    const plan = candidatePlan(input, { index: 3, section: "분석", message: "비교와 판단", contentHint: "", role }, [], rotation);
    assert.ok(plan.length > 0); assert.ok(!plan.some(id => banned.some(k => id.endsWith("-" + k))), `${deckType} ${role} ${plan}`);
  }
});
