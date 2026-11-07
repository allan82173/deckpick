import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import { SlidePreview } from "../src/components/slide-preview";
import { EvidenceReview } from "../src/components/evidence-review";
import { makeScene } from "../src/lib/scene";
import { exportDeck } from "../src/lib/export";
import { draftSlide } from "../src/lib/draft-workflow";
import type { Deck } from "../src/lib/model";
import { sampleData } from "../src/lib/demo";
import { analyticalIds } from "../src/lib/analytical-layouts";
import { design } from "../src/lib/design";
async function render(deck: Deck, directory: string) {
  await mkdir(directory, { recursive: true });
  const images: Buffer[] = [], articles: string[] = [], inspection: unknown[] = [];
  for (let index = 0; index < deck.outline.length; index++) {
    const slide = draftSlide(deck, index); if (!slide) continue;
    const markup = renderToStaticMarkup(<SlidePreview slide={slide} design={deck.designSystem} page={index + 1} name={deck.input.topic} sections={deck.outline.map(row => row.section)}/>);
    const svg = markup.slice(markup.indexOf("<svg"), markup.lastIndexOf("</svg>") + 6).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"');
    const png = await sharp(Buffer.from(svg)).flatten({ background: "#fff" }).png().toBuffer();
    await writeFile(path.join(directory, `slide-${index + 1}.png`), png);
    images.push(await sharp(png).resize(480, 270).png().toBuffer());
    articles.push(`<article><h2>${index + 1} · ${slide.layoutId}</h2>${markup}</article>`);
    inspection.push({ page: index + 1, layout: slide.layoutId, quality: slide.quality, rendering: makeScene(slide, deck.designSystem, index + 1, deck.input.topic, deck.outline.map(row => row.section)).warnings });
  }
  if (!images.length) return;
  await sharp({ create: { width: 1440, height: 290 * Math.ceil(images.length / 3), channels: 3, background: "#e4e9e5" } }).composite(images.map((input, index) => ({ input, left: index % 3 * 480, top: Math.floor(index / 3) * 290 }))).jpeg({ quality: 93 }).toFile(path.join(directory, "montage.jpg"));
  const review = renderToStaticMarkup(<EvidenceReview deck={deck}/>);
  const css = await readFile("src/app/globals.css", "utf8");
  await writeFile(path.join(directory, "preview.html"), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${deck.id} · 생성 품질 검사</title><style>${css}body{display:block;background:#eef1ef;padding:24px;font-family:Pretendard}article,.evidence-review{max-width:1280px;margin:20px auto;background:white;padding:16px}article h2{font-size:16px}.slide-preview{width:100%}.slide-preview svg{width:100%;height:auto}details{padding:16px}table{border-collapse:collapse}td,th{padding:10px;vertical-align:top;border:1px solid #ddd}blockquote{font-size:13px} @media(max-width:700px){body{padding:4px}article{padding:4px}}</style><h1>${deck.id} · 합성 회귀 과제</h1>${review}${articles.join("")}</html>`);
  await writeFile(path.join(directory, "inspection.json"), JSON.stringify(inspection, null, 2));
  if (images.length === deck.outline.length) await writeFile(path.join(directory, "generated.pptx"), await (await exportDeck(deck, false)).write({ outputType: "nodebuffer" }) as Buffer);
  console.log(`${deck.id} · ${images.length}장 렌더링`);
}
async function main() {
  const fixtures = JSON.parse(await readFile("tests/fixtures/general-decks.json", "utf8"));
  for (const mode of ["before", "after"]) for (const fixture of fixtures) {
    const directory = path.resolve("output/general-quality", mode, fixture.id);
    let deck: Deck; try { deck = JSON.parse(await readFile(path.join(directory, "deck.json"), "utf8")); } catch { continue; }
    await render(deck, directory);
  }
  if (process.argv.includes("--layouts")) {
    const input = { topic: "장 역할과 근거 구조", purpose: "레이아웃 검증", slideCount: 14, deckType: "consulting" as const, designSystemId: "ict-forest" as const };
    const outline = analyticalIds.map((_, index) => ({ index, section: "분석", message: "근거와 판단의 관계를 구조로 보여 줍니다.", contentHint: "" }));
    const deck: Deck = { id: "all-analytical-layouts", input, designSystem: design(input.designSystemId), outline, candidates: Object.fromEntries(analyticalIds.map((layoutId, index) => [index, [{ layoutId, headline: outline[index].message, section: "분석", data: sampleData(layoutId, outline[index]), sources: [] }]])), picked: Object.fromEntries(outline.map((_, index) => [index, 0])), edited: {}, chat: { setup: [], outline: [], slides: {} }, research: [], demo: true };
    await render(deck, path.resolve("output/general-quality/layouts"));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "렌더 실패"); process.exitCode = 1; });
