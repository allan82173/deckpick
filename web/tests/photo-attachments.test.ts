import { pipelineFixture } from "./pipeline-fixture";
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { storeAttachment, readAttachmentImage, readAttachmentImages, readAttachments } from "../src/lib/attachments";
import { attachmentOptions } from "../src/lib/attachment-model";
import { withImageInputs } from "../src/lib/vision";
import { GET } from "../src/app/api/attachments/[id]/route";
import { POST } from "../src/app/api/[...action]/route";
import { demoOutline } from "../src/lib/demo";
import { mkdir, writeFile } from "node:fs/promises";
async function sample() {
  const bytes = await sharp({ create: { width: 2000, height: 1200, channels: 3, background: "#244c3c" } }).png().toBuffer();
  return storeAttachment(new File([new Uint8Array(bytes)], "capture-test.png", { type: "image/png" }));
}
test("pictures normalize to bounded WebP, strip metadata and stay out of text retrieval", async () => {
  const attachment = await sample();
  assert.equal(attachment.kind, "image"); assert.equal(attachment.width, 1600); assert.equal(attachment.height, 960);
  const picture = await readAttachmentImage(attachment.id);
  const metadata = await sharp(picture.bytes).metadata();
  assert.equal(metadata.format, "webp"); assert.equal(metadata.exif, undefined);
  assert.deepEqual(await readAttachments([attachment.id]), []);
  assert.equal(attachment.estimatedTokens, 0); // Do not report image-token billing as a text estimate.
});
test("forged SVG image and malformed image fail before being stored", async () => {
  await assert.rejects(() => storeAttachment(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'], "forged.png")), /정지/);
  await assert.rejects(() => storeAttachment(new File(["not an image"], "broken.jpg")));
});
test("private thumbnail returns only normalized bytes and rejects path traversal/cross-site reads", async () => {
  const attachment = await sample();
  const response = await GET(new Request("http://localhost:3100/api/attachments/" + attachment.id), { params: Promise.resolve({ id: attachment.id }) });
  assert.equal(response.status, 200); assert.equal(response.headers.get("Content-Type"), "image/webp");
  const bad = await GET(new Request("http://localhost:3100/api/attachments/x"), { params: Promise.resolve({ id: "../.env.local" }) });
  assert.equal(bad.status, 404);
  const denied = await GET(new Request("http://localhost:3100/api/attachments/x", { headers: { "sec-fetch-site": "cross-site" } }), { params: Promise.resolve({ id: attachment.id }) });
  assert.equal(denied.status, 403);
});
test("image inclusion settings omit unchecked photos; low mode bounds both provider payloads", async () => {
  const image = await sample();
  assert.deepEqual(attachmentOptions([{ ...image, includeForAI: false }]), { attachmentIds: [], lowDetailImageIds: [] });
  const options = attachmentOptions([{ ...image, imageDetail: "low" }]);
  const images = await readAttachmentImages(options.attachmentIds, options.lowDetailImageIds);
  const metadata = await sharp(Buffer.from(images[0].base64, "base64")).metadata();
  assert.ok((metadata.width ?? 0) <= 512); assert.ok((metadata.height ?? 0) <= 512);
  const openai = withImageInputs("openai", { input: "사진 읽기" }, images);
  const wire = JSON.stringify(openai);
  assert.ok(wire.includes('"type":"input_image"')); assert.ok(wire.includes('"detail":"low"'));
  const claude = withImageInputs("anthropic", { messages: [{ role: "user", content: "사진 읽기" }] }, images);
  assert.match(JSON.stringify(claude), /"type":"image"/);
  assert.match(JSON.stringify(claude), /"media_type":"image\/webp"/);
});
test("real chat route passes images through native vision input instead of names or base64 in plain text", async () => {
  const image = await sample();
  const input = { deckType: "consulting" as const, designSystemId: "ict-forest" as const, topic: "캡처 분석", purpose: "수업", slideCount: 6 };
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    if (!Array.isArray(body.input)) return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(pipelineFixture(body, input)) }] }] });
    const content = body.input[0].content;
    assert.equal(content.filter((c: { type: string }) => c.type === "input_image").length, 1);
    assert.ok(content.some((c: { image_url?: string }) => c.image_url?.startsWith("data:image/webp;base64,")));
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(pipelineFixture(body, input)) }] }] });
  };
  try {
    const response = await POST(new Request("http://localhost:3100/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "x-user-api-key": "test-only" }, body: JSON.stringify({ provider: "openai", model: "test", input, attachmentIds: [image.id], messages: [{ role: "user", text: "사진에서 무엇을 볼 수 있나요?", imageIds: [image.id], createdAt: "test" }] }) }), { params: Promise.resolve({ action: ["chat"] }) });
    assert.equal(response.status, 200); assert.equal((await response.json()).attachmentUsage.images, 1);
    // Extraction is cached by image/model: a warm cache skips that one provider call.
    assert.ok(calls === 4 || calls === 5);
  } finally { globalThis.fetch = original; }
});
test("writes a non-sensitive screenshot fixture for browser attachment QA", async () => {
  await mkdir("output/photo-qa", { recursive: true });
  const svg = '<svg width="1200" height="720" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="720" fill="#f1f4f2"/><rect x="60" y="60" width="1080" height="100" fill="#244c3c"/><text x="90" y="125" font-size="38" fill="white">Screenshot attachment test</text><text x="90" y="260" font-size="32" fill="#15291f">Synthetic example - not real research</text><text x="90" y="360" font-size="44" fill="#244c3c">Sample conversion: 62%</text><text x="90" y="430" font-size="26" fill="#526158">Denominator: 100 fictional respondents</text></svg>';
  await writeFile("output/photo-qa/capture-example.png", await sharp(Buffer.from(svg)).png().toBuffer());
});
