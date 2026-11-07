import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  layoutIds,
  slideSchema,
  persistedDeckSchema,
  validateCandidates,
  type Deck,
  type DeckInput,
  type SlideSpec,
} from "../src/lib/model";
import { sampleData, demoOutline, demoCandidates } from "../src/lib/demo";
import { design, contrast, forest } from "../src/lib/design";
import { makeScene, SLIDE } from "../src/lib/scene";
import { exportDeck } from "../src/lib/export";
import {
  searchSources,
  structured,
  connection,
  keyCheck,
  AIError,
} from "../src/lib/ai";
import { z } from "zod";
const input: DeckInput = {
  topic: "검증용 발표",
  purpose: "테스트",
  slideCount: 6,
  deckType: "consulting",
  designSystemId: "ict-forest",
};
const item = {
  index: 2,
  section: "문제",
  message: "핵심 문제를 먼저 확인합니다",
  contentHint: "검증용",
};
test("fixed ICT palette and derived contrast", () => {
  assert.equal(forest.colors.primary, "#244C3C");
  for (const color of [
    "#FFFFFF",
    "#000000",
    "#FFFF00",
    "#00FF00",
    "#244C3C",
    "#D9534F",
  ])
    assert.ok(contrast(design("custom", color).colors.darkest) >= 4.5);
});
test("all supported layouts validate, produce editable scene nodes within the canvas", () => {
  for (const id of layoutIds) {
    const slide = slideSchema.parse({
      layoutId: id,
      section: "문제",
      headline: item.message,
      data: sampleData(id, item),
      sources: [],
    });
    const scene = makeScene(slide, forest);
    assert.ok(scene.nodes.length > 3);
    for (const n of scene.nodes) {
      assert.ok(n.x >= 0 && n.y >= 0, `${id}:negative`);
      assert.ok(n.x + n.w <= SLIDE.w + 0.01, `${id}:width`);
      assert.ok(n.y + n.h <= SLIDE.h + 0.01, `${id}:height`);
    }
  }
});
test("reject invalid data shape, fabricated sources and duplicate candidates", () => {
  assert.equal(
    slideSchema.safeParse({
      layoutId: "c-compare",
      section: "문제",
      headline: "검증",
      data: {
        options: ["A", "B"],
        criteria: ["1", "2", "3"],
        cells: [["1"]],
        recommended: 0,
      },
      sources: [],
    }).success,
    false,
  );
  const c = demoCandidates(input, item);
  assert.throws(() => validateCandidates([c[0], c[0], c[1]], input, []));
  assert.throws(() =>
    validateCandidates(
      [
        {
          ...c[0],
          sources: [{ title: "가짜", url: "https://invented.example" }],
        },
      ],
      input,
      [],
    ),
  );
});
test("only provider search results produce clickable sources", () => {
  assert.deepEqual(
    searchSources({
      type: "text",
      text: "https://fake.example",
      url: "https://fake.example",
      title: "가짜",
    }),
    [],
  );
  assert.equal(
    searchSources({
      output: [
        {
          type: "web_search_call",
          action: {
            sources: [{ title: "실제 검색", url: "https://example.org" }],
          },
        },
      ],
    }).length,
    1,
  );
  assert.equal(
    searchSources({
      type: "web_search_result",
      title: "잘못된 주소",
      url: "javascript:alert(1)",
    }).length,
    0,
  );
});
test("keys stay in server headers and structured output repairs validation", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      "Bearer test-key",
    );
    assert.ok(!String(options?.body).includes("test-key"));
    return Response.json({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(
                calls === 1 ? { count: "bad" } : { count: 2 },
              ),
            },
          ],
        },
      ],
    });
  };
  try {
    assert.deepEqual(
      await structured(
        { provider: "openai", key: "test-key", model: "test" },
        z.object({ count: z.number() }),
        "system",
        "input",
      ),
      { count: 2 },
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
test("Claude adapter forced tool use and real key-check failure", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(
      (options?.headers as Record<string, string>)["x-api-key"],
      "test-key",
    );
    const body = JSON.parse(String(options?.body));
    assert.equal(body.tool_choice.name, "return_result");
    return Response.json({
      content: [
        { type: "tool_use", name: "return_result", input: { ok: true } },
      ],
    });
  };
  try {
    assert.deepEqual(
      await structured(
        { provider: "anthropic", key: "test-key", model: "test" },
        z.object({ ok: z.boolean() }),
        "system",
        "input",
      ),
      { ok: true },
    );
    globalThis.fetch = async () => new Response("", { status: 401 });
    await assert.rejects(
      () => keyCheck({ provider: "openai", key: "test-key", model: "test" }),
      AIError,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("current Claude native JSON and semantic repairs stop after two retries", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    const body = JSON.parse(String(options?.body));
    assert.ok(body.output_config.format.schema);
    assert.equal(body.tool_choice, undefined);
    return Response.json({
      content: [
        { type: "thinking", thinking: "omitted" },
        { type: "text", text: '{"ok":true}' },
      ],
    });
  };
  try {
    await assert.rejects(
      () =>
        structured(
          {
            provider: "anthropic",
            key: "test-key",
            model: "claude-sonnet-5-5",
          },
          z.object({ ok: z.boolean() }),
          "system",
          "input",
          () => {
            throw Error("Semantic mismatch");
          },
        ),
      AIError,
    );
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
  }
});
test("incomplete manual edits and older chat proposals survive browser save", () => {
  const slide = demoCandidates(input, item)[0];
  const deck = {
    id: "persist",
    input: { ...input, topic: "" },
    designSystem: forest,
    outline: demoOutline(input),
    research: [],
    chat: {
      setup: [
        {
          role: "assistant",
          text: "past proposal",
          createdAt: "test",
          outlineDraft: [{ ...item, message: "" }],
        },
      ],
      outline: [],
      slides: {},
    },
    candidates: { 0: [slide] },
    picked: { 0: 0 },
    edited: { 0: { ...slide, headline: "", data: { columns: [] } } },
    demo: true,
  };
  assert.equal(
    persistedDeckSchema.safeParse(JSON.parse(JSON.stringify(deck))).success,
    true,
  );
});
test("PPTX contains editable text/shapes and source notes for every layout", async () => {
  const slides: SlideSpec[] = layoutIds.map((layoutId) =>
    slideSchema.parse({
      layoutId,
      section: "문제",
      headline: item.message,
      data: sampleData(layoutId, item),
      sources: [{ title: "검증용 출처", url: "https://example.org/verified" }],
    }),
  );
  const deck: Deck = {
    id: "test",
    input,
    designSystem: forest,
    outline: slides.map((s, i) => ({ ...item, index: i, message: s.headline })),
    research: [],
    chat: { setup: [], outline: [], slides: {} },
    candidates: Object.fromEntries(slides.map((s, i) => [i, [s]])),
    picked: Object.fromEntries(slides.map((_, i) => [i, 0])),
    edited: {},
    demo: true,
  };
  const pptx = await exportDeck(deck, false);
  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files).filter((p) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(p),
  );
  assert.equal(slideFiles.length, layoutIds.length);
  for (const file of slideFiles) {
    const xml = await zip.file(file)!.async("string");
    assert.ok(xml.includes("<p:sp>"));
    assert.ok(xml.includes("<a:t>"));
    const position = Number(file.match(/slide(\d+)\.xml/)![1]) - 1;
    if (!layoutIds[position].endsWith("screenshot-notes")) assert.ok(!xml.includes("<p:pic>"));
  }
  const notes = await zip
    .file("ppt/notesSlides/notesSlide1.xml")!
    .async("string");
  assert.ok(notes.includes("https://example.org/verified"));
  await mkdir("output", { recursive: true });
  await writeFile("output/layout-validation.pptx", buffer);
});
