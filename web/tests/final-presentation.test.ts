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
