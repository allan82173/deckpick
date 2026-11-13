import type { Scene } from "./scene";
import type { Calculation } from "./task-model";
import { calculateScenario } from "./scenario-calculation";

const factor=(unit:string)=>/억\s*원/.test(unit)?1e8:/만\s*원/.test(unit)?1e4:1;
const dimension=(unit:string)=>/원/.test(unit)?"원":/%|퍼센트|비율/.test(unit)?"비율":unit;
const normalized=(value:number,unit:string)=>value*factor(unit)*(/%|퍼센트/.test(unit)?.01:1);
/** Numeric presence is a guard, not a proof that labels or judgments are sound. */
export function missingCalculationOutputs(scene:Scene,calculation:Calculation){
 const visible:{value:number;unit:string}[]=[];
 const unitNames=[...new Set([...calculation.steps.map(s=>s.unit),...calculation.assumptions.map(a=>a.unit),"억 원","만 원","원","%","비율","배"])].filter(Boolean).sort((a,b)=>b.length-a.length);
 const unitPattern=unitNames.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s*")).join("|");
 const numbers=new RegExp(`[−-]?\\d[\\d,]*(?:\\.\\d+)?\\s*(${unitPattern})?`,"g");
 for(const node of scene.nodes){
  if(node.kind==="image"&&node.chart){const c=node.chart;visible.push(...c.series.flatMap(s=>s.values.map(value=>({value:normalized(value,c.unit),unit:dimension(c.unit)}))));}
  if(node.kind==="text")for(const match of node.text.matchAll(numbers)){
   const unit=match[1]??"",raw=match[0].replace(/,/g,"").replace("−","-"),value=normalized(parseFloat(raw),unit);if(Number.isFinite(value))visible.push({value,unit:dimension(unit)});
  }
 }
 return calculateScenario(calculation).outputs.filter(o=>!visible.some(v=>v.unit===dimension(o.unit)&&Math.abs(v.value-normalized(o.value,o.unit))<=Math.max(1e-7,Math.abs(normalized(o.value,o.unit))*1e-6)));
}
