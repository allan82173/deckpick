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

test("R5 적합한 1순위 구성을 유지하고 충돌할 때만 다른 구성을 고른다", () => {
  const plan = ["c-funnel", "c-matrix", "c-timeline"] as LayoutId[];
  assert.deepEqual(avoidDeckRepeats(plan, ["c-cover", "c-funnel"], ["c-trend"] as LayoutId[], true, 20), ["c-matrix"]);
  assert.deepEqual(avoidDeckRepeats(plan, ["c-cover", "c-funnel", "c-a", "c-b", "c-c", "c-matrix"], [] as LayoutId[], true, 20), ["c-funnel"]);
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

test("EY 기반 레이아웃 7종과 컨설팅 보강 3종은 샘플·스키마·장면이 맞물린다", async () => {
  const { expandedSchemas } = await import("../src/lib/expanded-layouts");
  const { expandedSample } = await import("../src/lib/expanded-samples");
  const { makeScene } = await import("../src/lib/scene");
  const { design } = await import("../src/lib/design");
  for (const kind of ["value-chain", "hub-spoke", "maturity-steps", "org-chart", "flywheel", "evidence-convergence", "kpi-tree", "tam-sam-som", "risk-matrix", "key-number"] as const) for (const variant of [0, 1]) {
    const data = expandedSample(`c-${kind}`, variant)!;
    assert.equal(expandedSchemas[kind].safeParse(data).success, true, kind);
    const nodes = makeScene({ layoutId: `c-${kind}`, headline: "예시", section: "본문", sources: [], data } as never, design("ict-forest" as never), 3, "주제").nodes;
    assert.ok(nodes.every(n => n.x >= 0 && n.x + n.w <= 13.34 && n.y + n.h <= 7.5), kind);
  }
  assert.equal(expandedSchemas["value-chain"].safeParse({ ...expandedSample("c-value-chain")!, primary: (expandedSample("c-value-chain")!.primary as { focus: boolean }[]).map(p => ({ ...p, focus: false })) }).success, false);
  assert.equal(expandedSchemas["maturity-steps"].safeParse({ ...expandedSample("c-maturity-steps")!, current: 2, target: 1 }).success, false);
  const risks = expandedSample("c-risk-matrix")!.risks as { id: string }[];
  assert.equal(expandedSchemas["risk-matrix"].safeParse({ ...expandedSample("c-risk-matrix")!, risks: risks.map(r => ({ ...r, id: "R1" })) }).success, false, "리스크 ID 중복");
  assert.equal(expandedSchemas["tam-sam-som"].safeParse({ ...expandedSample("c-tam-sam-som")!, levels: (expandedSample("c-tam-sam-som")!.levels as unknown[]).slice(0, 2) }).success, false, "TAM·SAM·SOM 3단계");
  assert.equal(expandedSchemas["key-number"].safeParse({ ...expandedSample("c-key-number")!, number: "1,234,567,890원" }).success, false, "핵심 수치 12자 이내");
});

test("포지셔닝 맵은 경쟁 구도 장에서만 자동 후보가 되고 판단·우선순위 역할에서 빠진다", async () => {
  const { candidatePlan, positioningFits } = await import("../src/lib/candidate-plan");
  const { roleLayouts } = await import("../src/lib/slide-quality");
  const input = { deckType: "consulting", topic: "x", slideCount: 10 } as never;
  assert.equal(roleLayouts("consulting", "판단").includes("c-positioning"), false);
  assert.equal(roleLayouts("consulting", "우선순위").includes("c-positioning"), false);
  const concept = { index: 3, section: "컨셉", role: "비교", message: "컨셉 A와 B를 비교합니다", contentHint: "" };
  const market = { index: 3, section: "경쟁", role: "비교", message: "경쟁사 포지셔닝에서 빈 자리를 찾습니다", contentHint: "" };
  assert.equal(positioningFits(concept as never), false);
  assert.equal(positioningFits(market as never), true);
  for (let r = 0; r < 6; r++) assert.equal(candidatePlan(input, concept as never, [], r).includes("c-positioning" as never), false);
  const kpi = { goal: { name: "목표", target: "8%" }, drivers: [{ name: "a", kpis: [1, 2, 3].map(i => ({ name: `k${i}`, target: "1" })) }, { name: "b", kpis: [1, 2, 3].map(i => ({ name: `k${i}`, target: "1" })) }, { name: "c", kpis: [1, 2, 3].map(i => ({ name: `k${i}`, target: "1" })) }], takeaway: "t" };
  const { expandedSchemas } = await import("../src/lib/expanded-layouts");
  assert.equal(expandedSchemas["kpi-tree"].safeParse(kpi).success, false);
});
