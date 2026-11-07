import { readFile, writeFile } from "node:fs/promises";
import { generateCandidates } from "../src/lib/ai";
import { candidateSignature } from "../src/lib/candidate-plan";
import { draftSlide } from "../src/lib/draft-workflow";
import type { Deck } from "../src/lib/model";
async function main() {
  const output = "output/general-quality/candidate-triplet.json";
  try { JSON.parse(await readFile(output, "utf8")); console.log("저장된 후보 검사 유지"); return; } catch {}
  const deck: Deck = JSON.parse(await readFile("output/general-quality/after/workflow/deck.json", "utf8"));
  const key = process.env.OPENAI_API_KEY; if (!key) throw Error("기존 키 설정 필요");
  const connection = { provider: "openai" as const, key, model: process.env.OPENAI_MODEL ?? "gpt-6-luna" };
  const index = 3, candidates = [draftSlide(deck, index)!];
  for (let slot = 1; slot < 3; slot++) {
    const [slide] = await generateCandidates(connection, deck.input, deck.outline[index], deck.research,
      "같은 근거와 현재 판단을 유지하며 구조가 다른 대안을 제공합니다. 실적은 만들지 않습니다.", candidates.map(slide => slide.layoutId), true, deck.outline, "", slot, candidates.map(candidateSignature), [], undefined, deck.researchRecord?.evidence,
      deck.outline.slice(0, index).map((_, page) => draftSlide(deck, page)!.layoutId), { record: deck.researchRecord });
    candidates.push(slide); console.log(`후보 ${slot + 1} · ${slide.layoutId}`);
  }
  if (new Set(candidates.map(slide => slide.layoutId)).size !== 3) throw Error("후보 레이아웃 중복");
  await writeFile(output, JSON.stringify({ case: deck.id, index, model: connection.model, candidates }, null, 2));
}
const alive = setInterval(() => {}, 30000);
main().catch(error => { console.error(error instanceof Error ? error.message : "후보 검사 실패"); process.exitCode = 1; }).finally(() => clearInterval(alive));
