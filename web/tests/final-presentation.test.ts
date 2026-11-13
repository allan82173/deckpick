import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deckInputSchema, MAX_DECK_SLIDES, FINAL_DEFAULT_SLIDES } from "../src/lib/model";

const base = { deckType: "consulting", designSystemId: "ict-forest", topic: "교보문고 20대 공략", purpose: "최종 발표", slideCount: 24 } as const;

test("최종 발표 모드: 단계 값과 20~30장 덱을 받는다", () => {
  assert.equal(MAX_DECK_SLIDES, 30);
  assert.ok(FINAL_DEFAULT_SLIDES >= 20 && FINAL_DEFAULT_SLIDES <= MAX_DECK_SLIDES);
  assert.equal(deckInputSchema.safeParse({ ...base, stage: "final" }).success, true);
  assert.equal(deckInputSchema.safeParse({ ...base, stage: "interim", slideCount: 10 }).success, true);
  assert.equal(deckInputSchema.safeParse({ ...base }).success, true, "기존 덱(단계 없음)은 중간 발표로 읽는다");
  assert.equal(deckInputSchema.safeParse({ ...base, stage: "draft" }).success, false);
});

test("최종 발표 계획은 분석 네 단계와 EOD 뒤 Appendix를 보존한다", async () => {
  const {storySlidePlan}=await import("../src/lib/storyline");
  const {consultingResearchSteps}=await import("../src/lib/consulting-policy");
  const plan=storySlidePlan({...base,stage:"final",appendSources:true});
  assert.equal(plan.totalSlides,24);
  assert.deepEqual(consultingResearchSteps.map(step=>step.name),["시장 이해","3C 분석","과제 정의","전략 수립"]);
  assert.ok(plan.fixed.some(row=>row.startsWith("23장 E.O.D.")));
  assert.ok(plan.fixed.some(row=>/24장 출처.*Appendix/.test(row)));
});

test("새 구성 요청 상한이 덱 상한과 같다(20장 하드코딩 제거)", async () => {
  const route = await readFile("src/app/api/[...action]/route.ts", "utf8");
  assert.doesNotMatch(route, /slideCount > 20/);
  assert.match(route, /slideCount > MAX_DECK_SLIDES/);
});

test("최종 발표용 레이아웃 4종: 스키마·장면·정직성 규칙", async () => {
  const { expandedSchemas, expandedRegistry } = await import("../src/lib/expanded-layouts");
  const { expandedSample } = await import("../src/lib/expanded-samples");
  const { makeScene } = await import("../src/lib/scene");
  const { forest } = await import("../src/lib/design");
  for (const kind of ["executive-summary", "interview-quotes", "benchmark-cards", "photo-evidence"] as const) {
    assert.ok(expandedRegistry[kind].roles.length > 0, kind);
    for (const variant of [0, 1]) {
      const data = expandedSample(`c-${kind}`, variant)!;
      assert.equal(expandedSchemas[kind].safeParse(data).success, true, kind);
      const scene = makeScene({ layoutId: `c-${kind}`, section: "확인", headline: "레이아웃 확인", data, sources: [] } as never, forest, 2, "주제");
      for (const node of scene.nodes) assert.ok(node.x >= 0 && node.y >= 0 && node.x + node.w <= 13.34 + 1e-6 && node.y + node.h <= 7.5 + 1e-6, `${kind} 노드가 장 밖으로 나감`);
    }
  }
  const quotes = expandedSample("c-interview-quotes")!;
  assert.equal(expandedSchemas["interview-quotes"].safeParse({ ...quotes, basis: "실제 조사", evidenceIds: [] }).success, false, "실제 인터뷰는 근거 ID 필요");
  const photos = expandedSample("c-photo-evidence")! as { photos: object[] };
  assert.equal(expandedSchemas["photo-evidence"].safeParse({ ...photos, photos: [{ ...photos.photos[0], imageSrc: "https://example.com/a.jpg" }] }).success, false, "외부 이미지 URL 금지");
  const {storyLayoutGuidance}=await import("../src/lib/storyline");
  const guidance=storyLayoutGuidance("consulting");assert.ok(guidance.roleLayouts["판단"].includes("c-executive-summary"));assert.ok(guidance.roleLayouts["비교"].includes("c-benchmark-cards"));
});
