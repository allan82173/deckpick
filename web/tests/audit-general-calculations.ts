import { readFile, writeFile } from "node:fs/promises";
import { calculateScenario } from "../src/lib/scenario-calculation";
import type { Deck } from "../src/lib/model";
async function main() {
  const fixtures = JSON.parse(await readFile("tests/fixtures/general-decks.json", "utf8"));
  const rows = [];
  for (const fixture of fixtures) {
    const deck: Deck = JSON.parse(await readFile(`output/general-quality/after/${fixture.id}/deck.json`, "utf8"));
    for (const item of deck.outline) if (item.calculation) {
      try { const computed = calculateScenario(item.calculation); rows.push({ case: fixture.id, page: item.index + 1, passed: true, values: computed.outputs.map(output => output.value) }); }
      catch (error) { rows.push({ case: fixture.id, page: item.index + 1, passed: false, reason: error instanceof Error ? error.message : "계산 오류" }); }
    }
  }
  await writeFile("output/general-quality/calculation-audit.json", JSON.stringify(rows, null, 2));
  console.log(JSON.stringify(rows));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "검사 실패"); process.exitCode = 1; });
