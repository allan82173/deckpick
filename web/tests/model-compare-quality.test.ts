import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeScene, type TextNode } from "../src/lib/scene";
import { design } from "../src/lib/design";
import { slideSchema } from "../src/lib/model";
import { inspectSlide, isDeckMetaHeadline } from "../src/lib/slide-quality";

const fixture = slideSchema.parse(JSON.parse(readFileSync("tests/fixtures/model-compare-evidence.json", "utf8")));

test("실제 비교 B3의 근거 6행은 주장과 판단 범위를 가리지 않는다", () => {
  const scene = makeScene(fixture, design("ict-forest"), 3, "모델 비교 회귀 검증");
  for (const row of fixture.data.rows as { claim: string; scope: string }[]) {
    const claim = scene.nodes.find((n): n is TextNode => n.kind === "text" && n.text === row.claim);
    const scope = scene.nodes.find((n): n is TextNode => n.kind === "text" && n.text === row.scope);
    assert.ok(claim && scope);
    assert.ok(claim.y + claim.h < scope.y, row.claim);
    assert.ok(scope.y + scope.h <= 6.12 + .001);
    assert.ok(claim.size >= 12 && scope.size >= 12);
    const at = scene.nodes.indexOf(claim);
    for (const shape of scene.nodes.slice(at + 1)) {
      if (shape.kind !== "rect") continue;
      const overlapX = Math.min(claim.x + claim.w, shape.x + shape.w) - Math.max(claim.x, shape.x);
      const overlapY = Math.min(claim.y + claim.h, shape.y + shape.h) - Math.max(claim.y, shape.y);
      assert.ok(overlapX <= 0 || overlapY <= 0, "later rectangle hides claim");
    }
  }
});

test("both models' actual methodology headlines trigger the same repair signal", () => {
  assert.equal(isDeckMetaHeadline(fixture.headline), true);
  assert.equal(isDeckMetaHeadline("현황 판단은 원문 확인 보도에 두고, 미확인 자료는 추론으로 구분합니다"), true);
  assert.equal(isDeckMetaHeadline("미래에셋증권은 사내 AIOps 플랫폼을 구축했습니다."), false);
  assert.equal(isDeckMetaHeadline("금융권 전체 서비스 수는 보험·증권사의 도입률과 다른 지표입니다."), false);
});

test("existing edited evidence cards keep their original coordinate space", () => {
  const scene = makeScene({ ...fixture, canvasEdits: { legacySentinel: { color: "#244C3C" } } }, design("ict-forest"));
  const row = (fixture.data.rows as { claim: string }[])[0];
  const claim = scene.nodes.find(n => n.kind === "text" && n.text === row.claim);
  assert.ok(claim && Math.abs(claim.x - 1.42) < .001);
});

test("unknown evidence IDs and methodology headlines are reported rather than silently discarded", () => {
  const quality = inspectSlide({ ...fixture, evidenceRefs: ["999", "999"] },
    { index: 2, section: "Scope", message: fixture.headline, contentHint: "공개자료 범위", role: "근거" },
    { topic: "공개자료 검토", purpose: "사례 비교", audience: "직장인", slideCount: 10, deckType: "consulting", designSystemId: "ict-forest" }, []);
  assert.ok(quality.warnings.some(w => w.includes("없는 ID") && w.includes("999")));
  assert.ok(quality.warnings.some(w => w.includes("조사 방법")));
});
