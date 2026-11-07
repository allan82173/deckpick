import { pipelineFixture } from "./pipeline-fixture";
import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { z } from "zod";
import { extractAttachment, storeAttachment, readAttachments } from "../src/lib/attachments";
import { chunkSections, selectAttachmentContext, tokenEstimate } from "../src/lib/attachment-context";
import { POST as upload } from "../src/app/api/attachments/route";
import { POST as action } from "../src/app/api/[...action]/route";
import { design, contrast } from "../src/lib/design";
import { deckInputSchema } from "../src/lib/model";
import { demoOutline } from "../src/lib/demo";

test("bounded retrieval finds tail evidence and keeps locators without duplicated text", () => {
  const chunks = chunkSections([{ location: "1쪽", text: "배경 설명 ".repeat(1800) }, { location: "99쪽", text: "유료 구독 전환율은 2025년 17.8%입니다. 분모는 전체 가입자입니다." }]);
  const result = selectAttachmentContext([{ id: "a", name: "조사.pdf", chunks }], "유료 구독 전환율 가입자", 900);
  assert.ok(result.text.includes("17.8%")); assert.ok(result.text.includes("99쪽"));
  assert.ok(result.estimatedTokens <= 900); assert.ok(result.selected < chunks.length);
  const duplicates = selectAttachmentContext([{ id: "a", name: "a", chunks: [chunks.at(-1)!, chunks.at(-1)!] }], "전환율");
  assert.equal(duplicates.selected, 1);
});

test("extracts Korean UTF-8, DOCX tables/text and PPTX slide text without image processing", async () => {
  const text = await extractAttachment("리서치.md", new TextEncoder().encode("# 조사\n전환율 17.8% · 기준 2025년"));
  assert.match(text.sections[0].text, /17.8%/);
  const docx = new JSZip(); docx.file("word/document.xml", '<w:document><w:body><w:p><w:r><w:t>설문 기준 100명</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>응답률 30%</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');
  const doc = await extractAttachment("자료.docx", await docx.generateAsync({ type: "uint8array" }));
  assert.match(doc.sections.map((s) => s.text).join(" "), /응답률 30%/);
  const pptx = new JSZip(); pptx.file("ppt/slides/slide2.xml", '<p:sld><a:t>두 번째 21%</a:t></p:sld>'); pptx.file("ppt/slides/slide1.xml", '<p:sld><a:t>첫 번째</a:t></p:sld>');
  const ppt = await extractAttachment("자료.pptx", await pptx.generateAsync({ type: "uint8array" }));
  assert.equal(ppt.sections[0].location, "1번 슬라이드"); assert.match(ppt.sections[1].text, /21%/);
  await assert.rejects(() => extractAttachment("사진.png", new Uint8Array([1, 2, 3])));
});

function minimalPdf() {
  const content = "BT /F1 12 Tf 40 750 Td (Research conversion 17.8 percent) Tj ET";
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
test("PDF extraction preserves page numbers and warns about visual omissions", async () => {
  const result = await extractAttachment("research.pdf", minimalPdf());
  assert.match(result.sections[0].text, /17.8/); assert.equal(result.sections[0].location, "1쪽");
  assert.ok(result.warnings.some((w) => w.includes("이미지")));
});

test("upload route rejects cross-origin requests and reuses cached text without AI calls", async () => {
  const denied = await upload(new Request("http://localhost:3100/api/attachments", { method: "POST", headers: { origin: "https://unrelated.example" } }));
  assert.equal(denied.status, 403);
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw Error("Upload must not call an AI service"); };
  try {
    const file = new File(["검증용 자료입니다. 전환율 17.8%"], "attachment-test.md");
    const a = await storeAttachment(file), b = await storeAttachment(file);
    assert.equal(a.id, b.id); assert.ok(a.estimatedTokens > 0);
    const docs = await readAttachments([a.id]); assert.match(docs[0].chunks[0].text, /17.8%/);
    await assert.rejects(() => readAttachments(["../../.env.local"]));
  } finally { globalThis.fetch = original; }
});

test("chat forwards only bounded excerpts, compact history and no raw attachment IDs to provider", async () => {
  const meta = await storeAttachment(new File(["지속가능한 포장 소비자 설문 100명. 재구매 의향 62%. 출처: 내부 설문 2025."], "research-test.md"));
  const input = { deckType: "consulting" as const, designSystemId: "ict-forest" as const, topic: "지속가능한 포장", purpose: "수업", slideCount: 6 };
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    const prompt = JSON.parse(request.input);
    if (prompt.attachmentText) {
      assert.ok(prompt.attachmentText.includes("62%"));
      assert.ok(prompt.attachmentText.includes("research-test.md"));
      assert.ok(prompt.userContext.length <= 8);
    }
    assert.ok(!request.input.includes(meta.id));
    return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(pipelineFixture(request, input, "내부 설문 62%")) }] }] });
  };
  try {
    const body = { provider: "openai", model: "test", input, attachmentIds: [meta.id], messages: Array.from({ length: 20 }, () => ({ role: "user", text: "재구매 의향", outlineDraft: demoOutline(input), createdAt: "test" })) };
    const response = await action(new Request("http://localhost:3100/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "x-user-api-key": "test-only" }, body: JSON.stringify(body) }), { params: Promise.resolve({ action: ["chat"] }) });
    assert.equal(response.status, 200); const result = await response.json();
    assert.ok(result.attachmentUsage.estimatedTokens <= 2400); assert.ok(result.attachmentUsage.selected > 0);
  } finally { globalThis.fetch = original; }
});

test("only approved new palettes are registered and keep readable contrast", () => {
  for (const id of ["lemonade", "sand", "charcoal"]) {
    const ds = design(id);
    assert.equal(ds.id, id); assert.ok(contrast(ds.colors.primary) >= 4.5); assert.ok(contrast(ds.colors.darkest) >= 4.5);
    assert.equal(ds.font, "Pretendard");
    assert.equal(deckInputSchema.shape.designSystemId.safeParse(id).success, true);
  }
  assert.equal(deckInputSchema.shape.designSystemId.safeParse("burgundy").success, false);
});
