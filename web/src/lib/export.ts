import { addNativeChart } from "./native-charts";
import PptxGenJS from "pptxgenjs";
import { slideSchema, type Deck } from "./model";
import { makeScene, richLines } from "./scene";
export async function exportDeck(deck: Deck, download = true) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "DeckPick";
  pptx.subject = deck.input.purpose;
  pptx.title = deck.input.topic;
  pptx.company = "DeckPick";
  pptx.theme = { headFontFace: "Pretendard", bodyFontFace: "Pretendard" };
  for (let i = 0; i < deck.outline.length; i++) {
    const spec = deck.edited[i] ?? deck.candidates[i]?.[deck.picked[i]];
    if (!spec) throw Error(`${i + 1}번 슬라이드를 선택해 주세요.`);
    if (!slideSchema.safeParse(spec).success)
      throw Error(
        `${i + 1}번 슬라이드에 비어 있거나 잘못 입력한 내용이 있습니다.`,
      );
    const slide = pptx.addSlide();
    for (const n of makeScene(
      spec,
      deck.designSystem,
      i + 1,
      deck.input.topic,
      deck.outline.map((o) => o.section),
    ).nodes) {
      if (n.kind === "text") {
        const lines = richLines(n.text, n.size, n.w,n.oneLine);
        const runs = lines.flatMap((line, index) => [
          ...line.map((run) => ({
            text: run.text,
            options: {
              bold: n.bold || run.bold,
              color: run.bold
                ? deck.designSystem.colors.primary.slice(1)
                : n.color.slice(1),
            },
          })),
          ...(index < lines.length - 1
            ? [
                {
                  text: "\n",
                  options: { bold: n.bold, color: n.color.slice(1) },
                },
              ]
            : []),
        ]);
        slide.addText(runs, {
          x: n.x,
          y: n.y,
          w: n.w,
          h: n.h,
          fontFace: "Pretendard",
          fontSize: n.size,
          color: n.color.slice(1),
          bold: n.bold,
          align: n.align ?? "left",
          valign: "top",
          margin: 0,
          breakLine: false,
          lineSpacingMultiple: 1.25,
          paraSpaceAfter: 0,
          transparency: 0,
        });
      } else if (n.kind === "image" && n.chart) {
        addNativeChart(slide,n.chart,deck.designSystem.colors,n);
      } else if (n.kind === "image") {
        const url = n.src.startsWith("/api/attachments/") ? `${n.src}?format=png` : n.src;
        const response = await fetch(url);
        if (!response.ok) throw Error("표지 사진을 찾지 못했습니다. 사진을 다시 선택한 뒤 내려받아 주세요.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        const data = `data:${response.headers.get("content-type")?.split(";")[0] ?? "image/png"};base64,${btoa(binary)}`;
        slide.addImage({ data, x: n.x, y: n.y, w: n.w, h: n.h, sizing: { type: "cover", w: n.w, h: n.h } });
      } else if (n.kind === "line")
        slide.addShape(pptx.ShapeType.line, {
          x: n.x,
          y: n.y,
          w: n.w,
          h: n.h,
          line: { color: n.fill.slice(1), width: n.strokeWidth ?? 1 },
        });
      else {
        const right = n.kind === "triangle" && n.rotate === 90;
        slide.addShape(
          n.kind === "triangle"
            ? pptx.ShapeType.triangle
            : n.kind === "ellipse"
              ? pptx.ShapeType.ellipse
              : n.kind === "trapezoid"
                ? pptx.ShapeType.trapezoid
                : pptx.ShapeType.rect,
          {
            x: right ? n.x + (n.w - n.h) / 2 : n.x,
            y: right ? n.y + (n.h - n.w) / 2 : n.y,
            w: right ? n.h : n.w,
            h: right ? n.w : n.h,
            rotate: n.rotate ?? 0,
            fill: { color: n.fill.slice(1) },
            line: {
              color: (n.stroke ?? n.fill).slice(1),
              width: n.stroke ? (n.strokeWidth ?? 1) : 0,
            },
          },
        );
      }
    }
    slide.addNotes(
      [
        spec.notes ?? "",
        ...(spec.layoutId === "c-cover" && spec.data.referencePhoto === "mgrv-space" && !spec.data.photoId ? ["표지 사진: 맹그로브 공식 홈페이지 https://mangrove.city/ — https://static.mgrv.net/mangrove-city/main/main-background-7.webp"] : []),
        ...spec.sources.map((s) => `출처: ${s.title} - ${s.url}`),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  const filename = `${deck.input.topic.replace(/[<>:"/\\|?*]/g, "_").slice(0, 70)}.pptx`;
  if (download) await pptx.writeFile({ fileName: filename });
  return pptx;
}
