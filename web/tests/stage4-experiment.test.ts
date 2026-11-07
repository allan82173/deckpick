import test from "node:test";
import assert from "node:assert/strict";
import { conditionEfforts, applyEfforts, defaultEfforts } from "../src/lib/experiment-conditions";
import { GENERATION_CONFIG, stageSettings } from "../src/lib/generation-config";

test("stage 4 conditions set the documented efforts and restore defaults", () => {
  const a = conditionEfforts("A"), b = conditionEfforts("B"), c = conditionEfforts("C");
  assert.equal(a.story, "low"); assert.equal(a.candidates, "low"); assert.equal(a.evidence, "low");
  assert.deepEqual([b.judgment, b.story, b.assessDeck], ["medium", "medium", "medium"]); assert.equal(b.candidates, "low"); assert.equal(b.visualReview, "low");
  assert.ok(Object.entries(c).every(([stage, effort]) => stage === "keyCheck" || effort === "medium"));
  applyEfforts(a); assert.equal(stageSettings("story").effort, "low");
  applyEfforts(defaultEfforts()); assert.equal(GENERATION_CONFIG.stages.story.effort, "medium"); assert.equal(GENERATION_CONFIG.stages.formatRepair.effort, "low");
});
