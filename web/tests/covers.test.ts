import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import JSZip from "jszip";
import { demoCandidates } from "../src/lib/demo";
import { coverAlternatives, coverPhotoSrc } from "../src/lib/covers";
import { makeScene, SLIDE } from "../src/lib/scene";
import { design } from "../src/lib/design";
import { slideSchema, type DeckInput, type Deck, type SlideSpec } from "../src/lib/model";
import { exportDeck } from "../src/lib/export";
import { generateCandidates } from "../src/lib/ai";
const input: DeckInput = { topic: "MGRV 마케팅 전략 수립", purpose: "마케팅 전략 제안", slideCount: 6, deckType: "consulting", designSystemId: "coral" };
const item = { index: 0, section: "표지", message: input.topic, contentHint: "프로젝트 공간 사진을 절반 사용" };
const ds = design("coral");
test("cover triplet varies titles and composition; photo occupies half and keeps source separate", () => {
  const slides: SlideSpec[] = demoCandidates(input, item).map(s => ({ ...s, data: { ...s.data, referencePhoto: "mgrv-space" } }));
  assert.deepEqual(slides.map((s) => s.data.coverStyle), ["photo", "white", "type"]);
  assert.equal(new Set(slides.map((s) => s.data.title)).size, 3);
  for (const slide of slides) {
    assert.ok(slideSchema.safeParse(slide).success);
    const scene = makeScene(slide, ds);
    assert.deepEqual(scene.warnings, []);
    for (const node of scene.nodes) assert.ok(node.x >= 0 && node.x + node.w <= SLIDE.w + 0.01 && node.y >= 0 && node.y + node.h <= SLIDE.h + 0.01);
  }
  const photo = makeScene(slides[0], ds).nodes.find((n) => n.kind === "image");
  assert.equal(photo?.w, 6.7); assert.equal(photo?.h, SLIDE.h);
  assert.equal(coverPhotoSrc({ photoId: "../../.env.local" }), undefined);
});
test("legacy cover remains classic; explicit conversion keeps author and leaves its input unchanged", () => {
  const old = { ...demoCandidates(input, item)[0], data: { title: input.topic, subtitle: "사용자 부제", author: "박동한" } };
  const before = JSON.stringify(old);
  assert.ok(!makeScene(old, ds).nodes.some((n) => n.kind === "image"));
  const converted = coverAlternatives(old, input.topic);
  assert.equal(JSON.stringify(old), before);
  assert.ok(converted.every((s) => s.data.author === "박동한" && s.data.subtitle === "사용자 부제"));
});
test("export embeds photo as a cropped native picture, with editable titles and attribution", async () => {
  const slides: SlideSpec[] = demoCandidates(input, item).map(s => ({ ...s, data: { ...s.data, referencePhoto: "mgrv-space" } }));
  const deck: Deck = { id: "cover-test", input, designSystem: ds, outline: slides.map((s, index) => ({ ...item, index, message: s.headline })), research: [], chat: { setup: [], outline: [], slides: {} }, candidates: Object.fromEntries(slides.map((s, i) => [i, [s]])), picked: { 0: 0, 1: 0, 2: 0 }, edited: {}, demo: true };
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => { assert.equal(String(url), "/cover-assets/mgrv-space.jpg"); return new Response(await readFile("public/cover-assets/mgrv-space.jpg"), { headers: { "Content-Type": "image/jpeg" } }); };
  try {
    const pptx = await exportDeck(deck, false);
    const bytes = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    assert.ok(xml.includes("<p:pic>")); assert.ok(xml.includes("<a:srcRect")); assert.ok(xml.includes("<a:t>" + input.topic));
    assert.ok(Object.keys(zip.files).some((f) => /^ppt\/media\/.+\.jpeg$/.test(f)));
    assert.ok((await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string")).includes("https://mangrove.city/"));
    await mkdir("output", { recursive: true }); await writeFile("output/MGRV-cover-validation.pptx", bytes);
  } finally { globalThis.fetch = original; }
});
test("AI repairs duplicate cover titles and receives three different style directions", async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    if (!calls) { const prompt = JSON.parse(body.input); assert.deepEqual(prompt.slotPlan.map((v: { coverStyle: string }) => v.coverStyle), ["photo", "white", "type"]); }
    calls++;
    const slides = demoCandidates(input, item).map((s) => ({ layoutId: s.layoutId, section: s.section, headline: s.headline, dataJson: JSON.stringify({ ...s.data, title: calls === 1 ? input.topic : s.data.title, photoId: "a".repeat(64) }), sourceUrls: [], notes: "대체 응답 검증" }));
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ slides }) }] }] });
  };
  try {
    const result = await generateCandidates({ provider: "openai", key: "test-only", model: "test" }, input, item, [], "");
    assert.equal(calls, 2); assert.equal(new Set(result.map((s) => s.data.title)).size, 3);
    assert.ok(result.every((s) => !s.data.photoId));
  } finally { globalThis.fetch = original; }
});
