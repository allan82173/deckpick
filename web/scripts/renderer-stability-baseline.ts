import {readdir,readFile,mkdir,writeFile} from "node:fs/promises";
import {makeScene} from "../src/lib/scene";
import {inspectSceneGeometry} from "../src/lib/visual-quality";
import {renderSlidePng} from "../src/lib/visual-review";
import type {Deck} from "../src/lib/model";
async function main(){
 const files:string[]=[];
 for(const p of ["output/quality-execution/A","output/quality-execution/B","output/quality-execution/C"]){for(const f of await readdir(p))if(f.endsWith(".json"))files.push(p+"/"+f);}
 for(const d of await readdir("output/stabilization"))files.push("output/stabilization/"+d+"/result.json");
 const slides=[];let runs=0;const counts:Record<string,number>={};
 for(const file of files){let deck:Deck;try{deck=JSON.parse(await readFile(file,"utf8")).deck;if(!deck)continue;}catch{continue;}runs++;
 for(const item of deck.outline){const slide=deck.edited[item.index]??deck.candidates[item.index]?.[deck.picked[item.index]??0];if(!slide)continue;const sections=deck.outline.map(s=>s.section);const scene=makeScene(slide,deck.designSystem,item.index+1,deck.input.topic,sections);const warnings=[...new Set([...scene.warnings,...inspectSceneGeometry(scene,item.index===0||["표지","목차"].includes(item.section))])].filter(w=>/텍스트|겹|넘|빈 공간|글자|폰트/.test(w));counts[slide.layoutId]=(counts[slide.layoutId]??0)+warnings.length;
 slides.push({file,index:item.index,slide,design:deck.designSystem,topic:deck.input.topic,sections,scene,warnings});}}
 const ranking=Object.entries(counts).sort((a,b)=>b[1]-a[1]);const targets=ranking.slice(0,3).map(r=>r[0]);const dir="output/stability-stage5";await mkdir(dir,{recursive:true});
 // Never overwrite a baseline after renderer changes.
 try{await readFile(dir+"/baseline.json");throw Error("baseline already exists");}catch(e){if(e instanceof Error&&e.message==="baseline already exists")throw e;}
 await writeFile(dir+"/baseline.json",JSON.stringify({runs,files,ranking,targets,slides},null,2));
 for(const id of targets){const example=slides.filter(s=>s.slide.layoutId===id).sort((a,b)=>b.warnings.length-a.warnings.length)[0];await writeFile(dir+"/"+id+"-before.png",await renderSlidePng(example.slide,example.design,example.index+1,example.topic,example.sections));}
 console.log(JSON.stringify({runs,slides:slides.length,ranking,targets}));
}
void main();
