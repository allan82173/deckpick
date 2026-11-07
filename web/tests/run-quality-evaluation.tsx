import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import { extractAttachment } from "../src/lib/attachments";
import { chunkSections, selectResearchContext } from "../src/lib/attachment-context";
import { prepareResearch, createStoryline } from "../src/lib/research-pipeline";
import { generateCandidates } from "../src/lib/ai";
import { exportDeck } from "../src/lib/export";
import { forest } from "../src/lib/design";
import { SlidePreview } from "../src/components/slide-preview";
import { analyticalIds } from "../src/lib/analytical-layouts";
import { sampleData } from "../src/lib/demo";
import { makeScene } from "../src/lib/scene";
import type { Deck, DeckInput } from "../src/lib/model";
import { isPlanHeadline, inspectSlide } from "../src/lib/slide-quality";

const directory = path.resolve("output/quality-pipeline");
const input: DeckInput = {
  topic: "MGRV × BIT 중간발표 마케팅 전략",
  purpose: "소비자 조사 기반 타깃 세그먼트 우선순위와 선택을 뒤집을 조건을 제시하고, 탐색 경로→채널·메시지→공실 계획으로 연결하는 중간발표 초안",
  audience: "산학 실무진", slideCount: 16, deckType: "marketing", designSystemId: "ict-forest",
  publicSearchTopic: "한국 외국인 단기 주거 코리빙 상품 조건 연세대학교 교환학생 한국어학당 기숙사 입주 신청 일정",
  appendSources: true, internalReview: true,
};
const usage: { model: unknown; input: unknown; output: unknown; searches: number }[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const response = await originalFetch(url, init);
  if (String(url).includes("api.openai.com")) {
    const data = await response.clone().json();
    await writeFile(path.join(directory, "latest-provider-output.json"), JSON.stringify(data, null, 2));
    usage.push({ model: data.model, input: data.usage?.input_tokens, output: data.usage?.output_tokens, searches: data.output?.filter((v: { type: string }) => v.type === "web_search_call").length ?? 0 });
    await writeFile(path.join(directory, "usage.json"), JSON.stringify(usage, null, 2));
  }
  return response;
};

async function render(deck: Deck) {
  const slides = deck.outline.map((_, i) => deck.edited[i] ?? deck.candidates[i]?.[deck.picked[i]]);
  const gallery: string[] = [];
  const thumbnails: Buffer[] = [];
  const inspection = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (!slide) continue;
    const markup = renderToStaticMarkup(<SlidePreview slide={slide} design={deck.designSystem} page={i + 1} name={input.topic} sections={deck.outline.map(o => o.section)} />);
    const svg = markup.slice(markup.indexOf("<svg"), markup.lastIndexOf("</svg>") + 6).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"');
    const png = await sharp(Buffer.from(svg)).flatten({ background: "#FFFFFF" }).png().toBuffer();
    await writeFile(path.join(directory, `slide-${String(i + 1).padStart(2, "0")}.png`), png);
    thumbnails.push(await sharp(png).resize(384, 216).toBuffer());
    gallery.push(`<article><h2>${i + 1}. ${slide.headline}</h2>${markup}</article>`);
    inspection.push({ page: i + 1, role: deck.outline[i].role, layout: slide.layoutId, refs: slide.evidenceRefs, quality: slide.quality, rendering: makeScene(slide, deck.designSystem, i + 1).warnings });
  }
  const montage = sharp({ create: { width: 384 * 4, height: 240 * Math.ceil(thumbnails.length / 4), channels: 3, background: "#E8ECE9" } });
  await montage.composite(thumbnails.map((buffer, i) => ({ input: buffer, left: (i % 4) * 384, top: Math.floor(i / 4) * 240 }))).jpeg({ quality: 90 }).toFile(path.join(directory, "montage.jpg"));
  await writeFile(path.join(directory, "inspection.json"), JSON.stringify(inspection, null, 2));
  await writeFile(path.join(directory, "preview.html"), `<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{font-family:Pretendard;background:#eee}article{max-width:1280px;margin:24px auto;background:white}.slide-preview svg{width:100%}h2{font-size:16px}</style>${gallery.join("")}</html>`);
  const pptx = await exportDeck(deck, false);
  await writeFile(path.join(directory, "MGRV-16장-앱생성-검증.pptx"), await pptx.write({ outputType: "nodebuffer" }) as Buffer);
}

async function main() {
  await mkdir(directory, { recursive: true });
  if (process.argv.includes("--layouts")) {
    const outline = analyticalIds.map((_, index) => ({ index, section: "본문", message: "근거와 판단의 관계를 구조로 보여 줍니다.", contentHint: "" }));
    const deck: Deck = { id: "layouts", input: { ...input, slideCount: 12 }, designSystem: forest, outline, candidates: Object.fromEntries(analyticalIds.map((id, i) => [i, [{ layoutId: id, section: "본문", headline: outline[i].message, data: sampleData(id, outline[i]), sources: [] }]])), picked: Object.fromEntries(outline.map((_, i) => [i, 0])), edited: {}, research: [], chat: { setup: [], outline: [], slides: {} }, demo: true };
    await render(deck); return;
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw Error("기존 API 키 설정이 필요합니다.");
  const connection = { provider: "openai" as const, key, model: process.env.OPENAI_MODEL ?? "gpt-6-luna" };
  let deck: Deck;
  try { deck = JSON.parse(await readFile(path.join(directory, "deck.json"), "utf8")); }
  catch {
    const downloads = "C:/Users/ninja/Downloads";
    const name = (await readdir(downloads)).find(name => name.includes("MGRV x BIT") && name.endsWith(".pdf"));
    if (!name) throw Error("MGRV 원본 PDF를 찾지 못했습니다.");
    const extracted = await extractAttachment(name, await readFile(path.join(downloads, name)));
    const attachmentContext = selectResearchContext([{ id: "local-evaluation", name, chunks: chunkSections(extracted.sections) }], input.topic + " " + input.purpose);
    await writeFile(path.join(directory, "attachment-scope.json"), JSON.stringify(attachmentContext, null, 2));
    console.log("조사·근거표·16장 스토리라인 생성 시작");
    const result = await prepareResearch(connection, input, attachmentContext.text, [], []);
    deck = { id: "mgrv-quality-evaluation", input, designSystem: forest, outline: result.outlineDraft, research: result.sources, researchRecord: result.researchRecord, candidates: {}, picked: {}, edited: {}, chat: { setup: [], outline: [], slides: {} }, demo: false };
    await writeFile(path.join(directory, "deck.json"), JSON.stringify(deck, null, 2));
    console.log(`조사 완료 · 근거 ${result.researchRecord.evidence.length}개 · ${result.researchRecord.searchStatus}`);
  }
  if (process.argv.includes("--restory")) {
    await writeFile(path.join(directory, "first-complete-deck.json"), JSON.stringify(deck, null, 2));
    const result = await createStoryline(connection, deck.input, [], [], deck.researchRecord!);
    deck = { ...deck, outline: result.outlineDraft, candidates: {}, picked: {}, edited: {} };
    await writeFile(path.join(directory, "deck.json"), JSON.stringify(deck, null, 2));
    console.log("목적에 필요한 계산·일정 장을 포함해 스토리라인 재검증 완료");
  }
  for (let i = 0; i < deck.outline.length; i++) {
    const existing = deck.candidates[i]?.[0];
    const currentCheck = existing ? inspectSlide(existing, deck.outline[i], deck.input, deck.researchRecord?.evidence ?? [], deck.outline.slice(0, i).map((_, j) => deck.candidates[j]?.[0]?.layoutId)) : undefined;
    const newIssue = currentCheck?.warnings.some(warning => !existing?.quality?.warnings.includes(warning));
    if (existing && !newIssue) { existing.quality = { ...currentCheck!, attempts: existing.quality?.attempts ?? 0 }; continue; }
    const slides = await generateCandidates(connection, deck.input, deck.outline[i], deck.research, "MGRV 중간발표입니다. 첨부 근거와 공개 사실을 구분하며 구체적인 비교·우선순위·반증 조건·공실 계산을 채우세요. 조사하지 않은 인터뷰나 견적을 만들지 마세요.", [], true, deck.outline, "", 0, [], [], undefined, deck.researchRecord?.evidence, deck.outline.slice(0, i).map((_, j) => deck.candidates[j][0].layoutId));
    deck.candidates[i] = slides; deck.picked[i] = 0;
    await writeFile(path.join(directory, "deck.json"), JSON.stringify(deck, null, 2));
    console.log(`${i + 1}/16 · ${slides[0].layoutId} · 경고 ${slides[0].quality?.warnings.length ?? 0}개`);
  }
  await writeFile(path.join(directory, "deck.json"), JSON.stringify(deck, null, 2));
  await render(deck);
  console.log("16장 렌더·편집 가능한 PPTX 검증 파일 저장 완료");
}
main().catch(async error => {
  await writeFile(path.join(directory, "failure.txt"), error instanceof Error ? error.message : "검증 실패");
  console.error(error instanceof Error ? error.message : "검증 실패"); process.exitCode = 1;
});
