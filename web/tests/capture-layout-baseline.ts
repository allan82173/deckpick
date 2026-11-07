import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { layoutIds, type Deck } from "../src/lib/model";
import { makeScene } from "../src/lib/scene";
import { sampleData } from "../src/lib/demo";
import { design } from "../src/lib/design";
import { exportDeck } from "../src/lib/export";
async function main(){
 const input={topic:"기존 유형 회귀 검사",purpose:"배치 보존",slideCount:20,deckType:"consulting" as const,designSystemId:"ict-forest" as const};
 const outline=layoutIds.map((_,index)=>({index,section:"분석",message:"같은 자료의 배치와 서체를 보존합니다.",contentHint:""}));
 const slides=layoutIds.map((layoutId,index)=>({layoutId,section:"분석",headline:outline[index].message,data:sampleData(layoutId,outline[index]),sources:[]}));
 const rows=slides.map((slide,index)=>({id:slide.layoutId,slide,hash:createHash("sha256").update(JSON.stringify(makeScene(slide,design(input.designSystemId),index+1,input.topic,outline.map(o=>o.section)))).digest("hex")}));
 await mkdir("output/layout-expansion",{recursive:true});await writeFile("output/layout-expansion/baseline-scenes.json",JSON.stringify({input,outline,rows},null,2));
 const deck:Deck={id:"baseline",input,designSystem:design(input.designSystemId),outline,candidates:Object.fromEntries(slides.map((s,i)=>[i,[s]])),picked:Object.fromEntries(slides.map((_,i)=>[i,0])),edited:{},research:[],chat:{setup:[],outline:[],slides:{}},demo:true};
 await writeFile("output/layout-expansion/baseline.pptx",await(await exportDeck(deck,false)).write({outputType:"nodebuffer"}) as Buffer);console.log(rows.length);
}main();
