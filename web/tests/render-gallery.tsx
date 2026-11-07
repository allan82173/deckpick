import { renderToStaticMarkup } from "react-dom/server";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { SlidePreview } from "../src/components/slide-preview";
import { layoutIds, layoutNames } from "../src/lib/model";
import { sampleData } from "../src/lib/demo";
import { forest } from "../src/lib/design";
async function main() {
  const font = await readFile("src/app/fonts/PretendardVariable.woff2");
  const body = layoutIds
    .map((layoutId, i) =>
      renderToStaticMarkup(
        <section>
          <h2>
            {i + 1}. {layoutNames[layoutId]}
          </h2>
          <SlidePreview
            slide={{
              layoutId,
              section: "문제",
              headline: "핵심 문제를 먼저 확인합니다",
              data: sampleData(layoutId, {
                index: 2,
                section: "문제",
                message: "핵심 문제를 먼저 확인합니다",
                contentHint: "검증용",
              }),
              sources: [
                { title: "검증용 출처", url: "https://example.org/verified" },
              ],
            }}
            design={forest}
            page={i + 1}
            name="검증용 발표"
          />
        </section>,
      ),
    )
    .join("");
  await mkdir("output", { recursive: true });
  await writeFile(
    "output/preview-gallery.html",
    `<!doctype html><html lang="ko"><meta charset="utf-8"><title>14 layouts preview QA</title><style>@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font.toString("base64")})}body{font-family:Pretendard;background:#eee;margin:0;padding:20px}section{max-width:960px;margin:0 auto 25px}h2{font-size:16px}.slide-preview{background:white;position:relative;aspect-ratio:16/9}.slide-preview svg{width:100%;height:100%}.fit-warning{position:absolute;bottom:0;right:0;background:#fff2cc;font-size:10px}</style>${body}</html>`,
  );
}
void main();
