import {renderToStaticMarkup} from "react-dom/server";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {SlidePreview} from "../src/components/slide-preview";
import {visualIds} from "../src/lib/visual-model";
import {layoutNames} from "../src/lib/model";
import {sampleData} from "../src/lib/demo";
import {forest} from "../src/lib/design";
async function main(){
  const font=(await readFile("src/app/fonts/PretendardVariable.woff2")).toString("base64");
  const item={index:2,section:"본문",message:"제공한 근거로 문제를 구분하고 다음 실행을 정합니다",contentHint:"구성 검토"};
  const body=visualIds.filter(id=>id.startsWith("c-")).map(id=>renderToStaticMarkup(<article><h2>{layoutNames[id]}</h2><SlidePreview slide={{layoutId:id,section:"본문",headline:item.message,data:sampleData(id,item),sources:[],notes:"구성 예시"}} design={forest}/></article>)).join("");
  await mkdir("output/visual-library",{recursive:true});
  await writeFile("output/visual-library/index.html",`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>새 본문 구조 9종</title><style>@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font})}body{font-family:Pretendard;background:#eee;margin:0;padding:24px}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}article{background:white;padding:10px}h2{font-size:14px}.slide-preview{aspect-ratio:16/9;position:relative}.slide-preview>svg{width:100%;height:100%}.fit-warning{color:red}</style><h1>새 본문 구조 9종 · 구성 예시</h1><main>${body}</main></html>`);
}void main();
