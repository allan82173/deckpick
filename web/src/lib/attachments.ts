import sharp from "sharp";
import type { VisionImage } from "./vision";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { attachmentSchema, fileLimitBytes, fileLimitMB } from "./attachment-model";
import { chunkSections, tokenEstimate, type Excerpt, type AttachmentDocument } from "./attachment-context";
const directory = path.join(process.cwd(), ".attachments");
const storedSchema = z.object({ metadata: attachmentSchema, chunks: z.array(z.object({ location: z.string(), text: z.string() })).max(1500) });
const xml = new XMLParser({ ignoreAttributes: false, processEntities: true, parseTagValue: false });
function tagText(value: unknown, wanted: string): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => tagText(v, wanted));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, v]) => key === wanted ? (Array.isArray(v) ? v.map(String) : [typeof v === "object" && v && "#text" in v ? String(v["#text"]) : String(v)]) : tagText(v, wanted));
}
export async function extractAttachment(name: string, bytes: Uint8Array): Promise<{ sections: Excerpt[]; warnings: string[] }> {
  if (!bytes.length || bytes.length > fileLimitBytes(name)) throw Error(`비어 있지 않은 ${fileLimitMB(name)}MB 이하 파일을 첨부해 주세요.`);
  const ext = path.extname(name).toLowerCase();
  const sections: Excerpt[] = [], warnings: string[] = [];
  if ([".txt", ".md", ".csv"].includes(ext)) {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\u0000")) throw Error("UTF-8 텍스트 파일로 변환해 첨부해 주세요.");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 35) sections.push({ location: `${i + 1}~${Math.min(i + 35, lines.length)}행`, text: lines.slice(i, i + 35).join("\n") });
  } else if (ext === ".pdf") {
    if (Buffer.from(bytes.slice(0, 5)).toString() !== "%PDF-") throw Error("올바른 PDF 파일이 아닙니다.");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Uint8Array.from(bytes) });
    try {
      const result = await parser.getText({ first: 200 });
      for (const page of result.pages) sections.push({ location: `${page.num}쪽`, text: page.text });
      if (result.total > 200) warnings.push("처음 200쪽만 추출했습니다. 필요한 범위로 나눠 첨부해 주세요.");
      if (result.pages.some((p) => p.text.trim().length < 20)) warnings.push("일부 페이지에 텍스트가 적습니다. 스캔·이미지·도표는 읽지 못할 수 있습니다.");
    } finally { await parser.destroy(); }
    warnings.push("텍스트만 추출했습니다. 이미지·차트의 시각 정보와 표의 정렬은 원본 확인이 필요합니다.");
  } else if ([".docx", ".pptx"].includes(ext)) {
    const archive = await JSZip.loadAsync(bytes);
    const entries = Object.values(archive.files).filter((f) => !f.dir);
    // Bound the decompressed archive before reading XML entries.
    let expanded = 0;
    for (const entry of entries) {
      const info = entry as unknown as { _data?: { uncompressedSize?: number } };
      expanded += info._data?.uncompressedSize ?? 0;
    }
    if (entries.length > 3000 || expanded > 50 * 1024 * 1024) throw Error("압축 해제 용량이 너무 큽니다. 필요한 부분만 별도 파일로 첨부해 주세요.");
    if (ext === ".docx") {
      const doc = archive.file("word/document.xml");
      if (!doc) throw Error("올바른 DOCX 파일이 아닙니다.");
      const paragraphs = (await doc.async("string")).match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
      for (let i = 0; i < paragraphs.length; i += 15) sections.push({ location: `본문 ${i + 1}~${Math.min(i + 15, paragraphs.length)}문단`, text: paragraphs.slice(i, i + 15).map((p) => tagText(xml.parse(p), "w:t").join(" ")).join("\n") });
      warnings.push("본문 텍스트·표 안의 글만 추출했습니다. 이미지·머리말·주석과 실제 쪽 배치는 제외됩니다.");
    } else {
      const slides = entries.filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name)).sort((a, b) => Number(a.name.match(/slide(\d+)\.xml$/)?.[1]) - Number(b.name.match(/slide(\d+)\.xml$/)?.[1]));
      if (!slides.length) throw Error("올바른 PPTX 파일이 아닙니다.");
      for (const slide of slides.slice(0, 200)) sections.push({ location: `${slide.name.match(/slide(\d+)\.xml$/)?.[1]}번 슬라이드`, text: tagText(xml.parse(await slide.async("string")), "a:t").join("\n") });
      if (slides.length > 200) warnings.push("처음 200장만 추출했습니다.");
      warnings.push("슬라이드 텍스트만 추출했습니다. 이미지·차트·발표자 노트는 제외됩니다.");
    }
  } else throw Error("PDF·DOCX·PPTX·TXT·MD·CSV 파일을 첨부해 주세요.");
  if (!sections.some((s) => s.text.trim())) throw Error("읽을 수 있는 텍스트가 없습니다. 스캔 파일은 OCR 처리 후 첨부해 주세요.");
  let characters = 0;
  const limited = sections.flatMap((section) => {
    const remaining = 500000 - characters;
    if (remaining <= 0) return [];
    const text = section.text.slice(0, remaining); characters += text.length;
    return [{ ...section, text }];
  });
  if (sections.reduce((n, s) => n + s.text.length, 0) > characters) warnings.push("50만 자까지만 보관했습니다. 큰 문서는 나누어 첨부해 주세요.");
  return { sections: limited, warnings };
}
export async function storeAttachment(file: File) {
  const name = path.basename(file.name).slice(0, 180);
  if (!file.size || file.size > fileLimitBytes(name) || ![".pdf", ".docx", ".pptx", ".txt", ".md", ".csv", ".png", ".jpg", ".jpeg", ".webp"].includes(path.extname(name).toLowerCase())) throw Error("PDF는 30MB 이하, 그 외 문서와 사진은 10MB 이하로 첨부해 주세요.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const id = createHash("sha256").update(bytes).digest("hex");
  try {
    const cached = storedSchema.parse(JSON.parse(await readFile(path.join(directory, id + ".json"), "utf8")));
    return cached.metadata;
  } catch { /* Extract once; do not transmit files to an AI provider. */ }
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(path.extname(name).toLowerCase())) {
    const source = sharp(bytes, { limitInputPixels: 25000000, failOn: "error" });
    const info = await source.metadata();
    if (!["png", "jpeg", "webp"].includes(info.format ?? "") || (info.pages ?? 1) > 1) throw Error("정지 PNG·JPG·WebP 사진만 첨부할 수 있습니다.");
    const result = await source.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    const metadata = attachmentSchema.parse({ id, name, kind: "image", bytes: bytes.length, characters: 0, chunks: 0, estimatedTokens: 0, width: result.info.width, height: result.info.height, warnings: ["긴 변 최대 1,600px로 줄이고 위치·촬영 메타데이터를 제외했습니다.", "사진 분석에는 별도 이미지 토큰이 사용됩니다. 작은 글자가 안 보이면 해당 부분만 캡처해 주세요."] });
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, id + ".webp"), result.data, { mode: 0o600 });
    await writeFile(path.join(directory, id + ".json"), JSON.stringify({ metadata, chunks: [] }), { encoding: "utf8", mode: 0o600 });
    return metadata;
  }
  const { sections, warnings } = await extractAttachment(name, bytes);
  const chunks = chunkSections(sections);
  const text = sections.map((s) => s.text).join("\n");
  const metadata = attachmentSchema.parse({ id, name, bytes: bytes.length, characters: text.length, estimatedTokens: tokenEstimate(text), chunks: chunks.length, warnings });
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, id + ".json"), JSON.stringify({ metadata, chunks }), { encoding: "utf8", mode: 0o600 });
  return metadata;
}
export async function readAttachments(ids: string[]): Promise<AttachmentDocument[]> {
  const documents: AttachmentDocument[] = [];
  for (const id of [...new Set(ids)]) {
    attachmentSchema.shape.id.parse(id);
    try {
      const stored = storedSchema.parse(JSON.parse(await readFile(path.join(directory, id + ".json"), "utf8")));
      if (stored.metadata.kind !== "image") documents.push({ id, name: stored.metadata.name, chunks: stored.chunks });
    } catch { throw Error("첨부 자료를 찾지 못했습니다. 파일을 다시 첨부해 주세요."); }
  }
  return documents;
}

export async function readAttachmentImage(id: string) {
  attachmentSchema.shape.id.parse(id);
  const stored = storedSchema.parse(JSON.parse(await readFile(path.join(directory, id + ".json"), "utf8")));
  if (stored.metadata.kind !== "image") throw Error("사진이 아닙니다.");
  return { metadata: stored.metadata, bytes: await readFile(path.join(directory, id + ".webp")) };
}
export async function readAttachmentImages(ids: string[], lowDetailIds: string[] = []): Promise<VisionImage[]> {
  const images: VisionImage[] = [];
  for (const id of [...new Set(ids)]) {
    attachmentSchema.shape.id.parse(id);
    const stored = storedSchema.parse(JSON.parse(await readFile(path.join(directory, id + ".json"), "utf8")));
    if (stored.metadata.kind !== "image") continue;
    const original = await readAttachmentImage(id);
    const bytes = lowDetailIds.includes(id) ? await sharp(original.bytes).resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer() : original.bytes;
    images.push({ id, width: stored.metadata.width, height: stored.metadata.height, name: stored.metadata.name, mimeType: "image/webp", base64: bytes.toString("base64"), detail: lowDetailIds.includes(id) ? "low" : "auto" });
  }
  return images;
}
