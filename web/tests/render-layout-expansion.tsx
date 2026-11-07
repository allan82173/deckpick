import { readFile,mkdir,writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import JSZip from "jszip";
import { expandedKinds,expandedRegistry } from "../src/lib/expanded-layouts";
import { expandedSample } from "../src/lib/expanded-samples";
import { makeScene } from "../src/lib/scene";
import { SlidePreview } from "../src/components/slide-preview";
import { dataSchemas,layoutIds,type Deck,type LayoutId,type SlideSpec } from "../src/lib/model";
import { design } from "../src/lib/design";
import { exportDeck } from "../src/lib/export";
async function main(){
 const stage=Number(process.argv.find(a=>a.startsWith("--stage="))?.slice(8)||1),dir=`output/layout-expansion/stage-${stage}`;await mkdir(dir,{recursive:true});
 const kinds=expandedKinds.filter(k=>expandedRegistry[k].stage===stage),input={topic:`유형 확장 ${stage}단계 · 합성 예시`,purpose:"원본 구조 비교",slideCount:20,deckType:"consulting" as const,designSystemId:"ict-forest" as const};
 const slides:SlideSpec[]=kinds.flatMap(k=>[0,1].map(v=>{const layoutId=`${v?"m":"c"}-${k}` as LayoutId;const data=expandedSample(layoutId,v)!;dataSchemas[layoutId].parse(data);return {layoutId,section:"유형 검증",headline:`${expandedRegistry[k].name} · ${v?"업무 개선":"시장 전략"} 합성 예시`,data,sources:[],notes:"합성 가상 예시 · 실제 수치나 조사 아님"};}));
 const outline=slides.map((s,index)=>({index,section:s.section,message:s.headline,contentHint:""})),deck:Deck={id:`stage-${stage}`,input,designSystem:design(input.designSystemId),outline,candidates:Object.fromEntries(slides.map((s,i)=>[i,[s]])),picked:Object.fromEntries(slides.map((_,i)=>[i,0])),edited:{},chat:{setup:[],outline:[],slides:{}},research:[],demo:true};
 const thumbs:Buffer[]=[],inspections=[],html=[];
 for(let i=0;i<slides.length;i++){const slide=slides[i],scene=makeScene(slide,deck.designSystem,i+1,input.topic,outline.map(o=>o.section));const markup=renderToStaticMarkup(<SlidePreview slide={slide} design={deck.designSystem} page={i+1} name={input.topic} sections={outline.map(o=>o.section)}/>);let svg=markup.slice(markup.indexOf("<svg"),markup.lastIndexOf("</svg>")+6).replace("<svg",'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"');const png=await sharp(Buffer.from(svg)).flatten({background:"#fff"}).png().toBuffer();await writeFile(`${dir}/${slide.layoutId}.png`,png);thumbs.push(await sharp(png).resize(480,270).png().toBuffer());html.push(`<article><h2>${slide.headline}</h2>${markup}</article>`);inspections.push({id:slide.layoutId,reference:expandedRegistry[expandedKinds.find(k=>slide.layoutId.endsWith(k))!].reference,warnings:scene.warnings,charts:scene.nodes.filter(n=>n.kind==="image"&&n.chart).length,nodes:scene.nodes.length});}
 await sharp({create:{width:1440,height:290*Math.ceil(thumbs.length/3),channels:3,background:"#e8eeea"}}).composite(thumbs.map((input,i)=>({input,left:i%3*480,top:Math.floor(i/3)*290}))).jpeg({quality:94}).toFile(`${dir}/montage.jpg`);
 await writeFile(`${dir}/preview.html`,`<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{font-family:Pretendard;background:#eee}article{max-width:1280px;background:white;margin:24px auto}h2{font-size:18px}.slide-preview svg{width:100%}</style>${html.join("")}</html>`);
 const pptx=await(await exportDeck(deck,false)).write({outputType:"nodebuffer"}) as Buffer;await writeFile(`${dir}/stage-${stage}.pptx`,pptx);const zip=await JSZip.loadAsync(pptx);const charts=Object.keys(zip.files).filter(f=>/^ppt\/charts\/chart\d+\.xml$/.test(f));const books=Object.keys(zip.files).filter(f=>f.startsWith("ppt/embeddings/")&&f.endsWith(".xlsx"));await writeFile(`${dir}/inspection.json`,JSON.stringify({stage,kinds:kinds.length,slides:slides.length,charts:charts.length,workbooks:books.length,inspections},null,2));
 const baseline=JSON.parse(await readFile("output/layout-expansion/baseline-scenes.json","utf8"));const regression=baseline.rows.map((r:{slide:SlideSpec;id:string;hash:string},i:number)=>({id:r.id,unchanged:createHash("sha256").update(JSON.stringify(makeScene(r.slide,design(baseline.input.designSystemId),i+1,baseline.input.topic,baseline.outline.map((o:{section:string})=>o.section)))).digest("hex")===r.hash}));await writeFile("output/layout-expansion/regression.json",JSON.stringify({old:regression.length,unchanged:regression.filter((r:{unchanged:boolean})=>r.unchanged).length,totalIds:layoutIds.length,regression},null,2));
 console.log(JSON.stringify({stage,kinds:kinds.length,slides:slides.length,charts:charts.length,workbooks:books.length,warnings:inspections.filter(r=>r.warnings.length),oldUnchanged:regression.every((r:{unchanged:boolean})=>r.unchanged),totalIds:layoutIds.length}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});
