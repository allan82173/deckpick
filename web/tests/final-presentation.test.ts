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

test("최종 발표 흐름이 스토리라인·과제 해석 지시에 들어 있다", async () => {
  const story = await readFile("src/lib/storyline.ts", "utf8");
  for (const part of ["input.stage", "최종 발표(final)", "사업 컨셉", "벤치마킹", "실행 로드맵", "KPI", "기대효과", "문제 정의와 컨셉은 빼지 않습니다"]) assert.ok(story.includes(part), part);
  const task = await readFile("src/lib/task-analysis.ts", "utf8");
  assert.ok(task.includes("input.stage가 final"));
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
  const story = await readFile("src/lib/storyline.ts", "utf8");
  assert.match(story, /executive-summary/); assert.match(story, /benchmark-cards/);
});
