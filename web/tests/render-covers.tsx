import { renderToStaticMarkup } from "react-dom/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { SlidePreview } from "../src/components/slide-preview";
import { demoCandidates } from "../src/lib/demo";
import { coverStyleNames } from "../src/lib/covers";
import { design } from "../src/lib/design";
async function main() {
  const topic = "MGRV 마케팅 전략 수립";
  const slides = demoCandidates({ topic, purpose: "마케팅 전략 제안", slideCount: 6, deckType: "consulting", designSystemId: "coral" }, { index: 0, section: "표지", message: topic, contentHint: "사진 절반" });
  const font = (await readFile("src/app/fonts/PretendardVariable.woff2")).toString("base64");
  const photo = (await readFile("public/cover-assets/mgrv-space.jpg")).toString("base64");
  const body = slides.map((slide, i) => renderToStaticMarkup(<article><p>후보 {String.fromCharCode(65 + i)} · {coverStyleNames[String(slide.data.coverStyle)]}</p><SlidePreview slide={slide} design={design("coral")} /></article>)).join("").replaceAll("/cover-assets/mgrv-space.jpg", `data:image/jpeg;base64,${photo}`);
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MGRV 표지 3안</title><style>@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{font-family:Pretendard;background:#f5f5f2;color:#17352b;margin:0;padding:35px}h1{font-size:28px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}article{background:white;border:1px solid #ddd;padding:12px}article>p{font-size:14px;font-weight:600}svg{width:100%;display:block}.fit-warning{color:red}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style><h1>MGRV 표지 3안</h1><p>사진 반반형 · 화이트 보고서형 · 큰 제목형</p><div class="grid">${body}</div><p>사진 출처: 맹그로브 공식 홈페이지 · 제목은 검토용 제안입니다.</p></html>`;
  await mkdir("output/cover-preview", { recursive: true });
  await writeFile("output/cover-preview/index.html", html);
}
void main();
