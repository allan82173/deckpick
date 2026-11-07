import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { Deck, DeckInput } from "../src/lib/model";
import { design } from "../src/lib/design";

type Fixture = { id: string; category: string; input: DeckInput; attachment: string; requirements: string[] };
async function main() {
const mode = process.argv.includes("--before") ? "before" : "after";
const root = path.resolve("output/general-quality");
await mkdir(root, { recursive: true });
const originalFetch = globalThis.fetch;
const responseDirectory = path.join(root, "provider-responses"); await mkdir(responseDirectory, { recursive: true });
let providerCalls = 0;
globalThis.fetch = async (url, init) => {
  const ordinal = ++providerCalls;
  const stage = JSON.parse(String(init?.body)).text?.format?.name ?? (JSON.parse(String(init?.body)).tools ? "search" : "other");
  console.log(`${mode} · API ${ordinal} ${stage} 시작`);
  const result = await originalFetch(url, init);
  const output = await result.clone().json();
  await writeFile(path.join(responseDirectory, `${mode}-${Date.now()}-${ordinal}.json`), JSON.stringify(output));
  console.log(`${mode} · API ${ordinal} HTTP ${result.status}`);
  return result;
};
const fixtures: Fixture[] = JSON.parse(await readFile("tests/fixtures/general-decks.json", "utf8"));
const sourceRoot = mode === "before" ? path.join(root, "baseline/src/lib") : path.resolve("src/lib");
const pipeline = await import(pathToFileURL(path.join(sourceRoot, "research-pipeline.ts")).href) as typeof import("../src/lib/research-pipeline");
const ai = await import(pathToFileURL(path.join(sourceRoot, "ai.ts")).href) as typeof import("../src/lib/ai");
const key = process.env.OPENAI_API_KEY;
if (!key) throw Error("기존 API 키 설정이 필요합니다.");
const connection = { provider: "openai" as const, key, model: process.env.OPENAI_MODEL ?? "gpt-6-luna" };
const selected = process.argv.find(arg => arg.startsWith("--case="))?.slice(7);

const pending = fixtures.filter(value => !selected || value.id === selected);
async function runFixture(fixture: Fixture) {
  const directory = path.join(root, mode, fixture.id);
  await mkdir(directory, { recursive: true });
  let deck: Deck;
  try { deck = JSON.parse(await readFile(path.join(directory, "deck.json"), "utf8")); }
  catch {
    try {
      console.log(`${mode} ${fixture.id} · 조사 시작`);
      let result;
      if (mode === "before") result = await pipeline.prepareResearch(connection, fixture.input, fixture.attachment, [], []);
      else {
        let researched;
        try { researched = JSON.parse(await readFile(path.join(directory, "research-checkpoint.json"), "utf8")); }
        catch {
          const prepared = await pipeline.prepareTask(connection, fixture.input, fixture.attachment, [], []);
          await writeFile(path.join(directory, "analysis-checkpoint.json"), JSON.stringify(prepared, null, 2));
          researched = await pipeline.runResearch(connection, fixture.input, prepared, fixture.attachment, [], []);
          await writeFile(path.join(directory, "research-checkpoint.json"), JSON.stringify(researched, null, 2));
        }
        // Synthetic evaluation explicitly accepts evidence limits; the app itself requires a user choice.
        const story = await pipeline.createStoryline(connection, fixture.input, [], [], { ...researched.researchRecord, acceptedLimits: true, requiresReview: false });
        result = { ...story, sources: researched.sources };
      }
      deck = { id: fixture.id, input: fixture.input, designSystem: design(fixture.input.designSystemId), research: result.sources,
        researchRecord: result.researchRecord, outline: result.outlineDraft, candidates: {}, picked: {}, edited: {}, chat: { setup: [], outline: [], slides: {} }, demo: false };
      await writeFile(path.join(directory, "deck.json"), JSON.stringify(deck, null, 2));
    } catch (error) {
      await writeFile(path.join(directory, "failure.txt"), error instanceof Error ? error.message : "조사 실패");
      console.log(`${mode} ${fixture.id} · 조사 실패`); return;
    }
  }
  try {
    for (let i = 0; i < deck.outline.length; i++) {
      if (deck.candidates[i]?.length) continue;
      deck.candidates[i] = await ai.generateCandidates(connection, deck.input, deck.outline[i], deck.research,
        "과제의 질문에 현재 근거로 답하고 판단을 바꿀 조건을 드러내세요. 확인하지 않은 실적을 만들지 마세요.",
        [], true, deck.outline, fixture.attachment, 0, [], [], undefined, deck.researchRecord?.evidence,
        deck.outline.slice(0, i).map((_, index) => deck.candidates[index][0].layoutId), ...(mode === "after" ? [{ record: deck.researchRecord }] : []));
      deck.picked[i] = 0;
      await writeFile(path.join(directory, "deck.json"), JSON.stringify(deck, null, 2));
      console.log(`${mode} ${fixture.id} · ${i + 1}/${deck.outline.length}`);
    }
    if (mode === "after" && !deck.review && deck.outline.length && deck.outline.every((_, i) => deck.candidates[i]?.length)) {
      console.log(`${mode} ${fixture.id} · 전체 검토`);
      const { reviewAndRepairDeck } = await import("../src/lib/deck-review");
      const result = await reviewAndRepairDeck(connection, deck);
      for (const replacement of result.replacements) deck.candidates[replacement.index][deck.picked[replacement.index]] = replacement.slide;
      deck.review = result.review;
      await writeFile(path.join(directory, "deck.json"), JSON.stringify(deck, null, 2));
    }
  } catch (error) {
    await writeFile(path.join(directory, "failure.txt"), error instanceof Error ? error.message : "장표 실패");
    console.log(`${mode} ${fixture.id} · 장표 실패`);
  }
}
const settled = await Promise.allSettled(Array.from({ length: Math.min(2, pending.length) }, async () => { while (pending.length) await runFixture(pending.shift()!); }));
for (const result of settled) if (result.status === "rejected") throw result.reason;

}
const keepAlive = setInterval(() => {}, 30000);
main().catch(error => { console.error(error instanceof Error ? error.message : "평가 실패"); process.exitCode = 1; }).finally(() => clearInterval(keepAlive));
