import {readFile,writeFile} from "node:fs/promises";
import {makeScene} from "../src/lib/scene";
import {inspectSceneGeometry} from "../src/lib/visual-quality";
import {renderSlidePng} from "../src/lib/visual-review";
import type {SlideSpec} from "../src/lib/model";
async function main(){const dir="output/stability-stage5",b=JSON.parse(await readFile(dir+"/baseline.json","utf8"));const counts:Record<string,{before:number;after:number;slides:number}>={};let unaffected=0;const regressions:string[]=[],rows=[];
for(const old of b.slides){const scene=makeScene(old.slide,old.design,old.index+1,old.topic,old.sections);const warnings=[...new Set([...scene.warnings,...inspectSceneGeometry(scene,old.index===0||["표지","목차"].includes(old.slide.section))])].filter(w=>/텍스트|겹|넘|빈 공간|글자|폰트/.test(w));const id=old.slide.layoutId;const count=counts[id]??={before:0,after:0,slides:0};count.before+=old.warnings.length;count.after+=warnings.length;count.slides++;if(!b.targets.includes(id)){if(JSON.stringify(scene)!==JSON.stringify(old.scene))regressions.push(old.file+":"+old.index);else unaffected++;}rows.push({file:old.file,index:old.index,id,before:old.warnings,after:warnings});}
for(const id of b.targets){const example=b.slides.filter((s:{slide:SlideSpec})=>s.slide.layoutId===id).sort((a:{warnings:string[]},b:{warnings:string[]})=>b.warnings.length-a.warnings.length)[0];await writeFile(dir+"/"+id+"-after.png",await renderSlidePng(example.slide,example.design,example.index+1,example.topic,example.sections));}
const result={counts,targets:b.targets,unaffected,regressions,rows};await writeFile(dir+"/after.json",JSON.stringify(result,null,2));console.log(JSON.stringify({counts,unaffected,regressions},null,2));}void main();
