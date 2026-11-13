import type { SlideSpec } from "./model";

/** Writing budgets are repair instructions, never silent substring operations. */
const limits:Record<string,Record<string,number>>={
 "cover":{"title":30,"subtitle":110,"eyebrow":24},
 "executive-summary":{"rows.*.section":18,"rows.*.finding":64,"rows.*.implication":52},
 "argument-board":{"panels.*.title":24,"panels.*.rows.*.label":24,"panels.*.rows.*.detail":78},
 "horizontal-formula":{"items.*.label":24,"items.*.basis":58},
 "comparison-table":{"alternatives.*.name":18,"alternatives.*.values.*":48,"criteria.*":18},
 "evidence-convergence":{"evidences.*.label":20},
 "judgment-reversal":{"priorities.*.name":28,"priorities.*.why":65,"priorities.*.reversal":65,"priorities.*.method":65},
};
export function layoutCopyBudget(layoutId:string){return {takeaway:110,unit:24,"series.*.name":32,"categories.*":36,...(limits[layoutId.slice(2)]??{})};}
export function copyBudgetWarnings(slide:SlideSpec){
 const messages:string[]=[];
 for(const [path,max] of Object.entries(layoutCopyBudget(slide.layoutId))){
  const visit=(value:unknown,parts:string[])=>{if(!parts.length){if(typeof value==="string"&&[...value.replace(/\*\*/g,"")].length>max)messages.push(`문구 길이: ${path}는 ${max}자 안팎으로 정리하세요. 필수 수치·조건·고유명사를 생략하지 말고 중복 설명을 줄이세요: ${value}`);return;}
   const [key,...rest]=parts;if(key==="*"&&Array.isArray(value))value.forEach(v=>visit(v,rest));else if(value&&typeof value==="object")visit((value as Record<string,unknown>)[key],rest);
  };visit(slide.data,path.split("."));
 }
 return messages;
}
