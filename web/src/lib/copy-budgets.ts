import type { SlideSpec } from "./model";

/** Writing budgets are repair instructions, never silent substring operations. */
const limits:Record<string,Record<string,number>>={
 "numbered-agenda":{"steps.*.title":18,"steps.*.question":38},
 "priority-path":{"first.action":24,"first.reason":42,"first.result":32,"parallel.action":24,"parallel.reason":42,"parallel.result":32,"later.action":24,"later.trigger":42,"later.result":32},
 "share-comparison":{"panels.*.title":28,"panels.*.denominator":42,"panels.*.insight":42},
 "service-ecosystem":{"sources.*.name":20,"sources.*.entry":32,"hub.name":24,"hub.job":42,"services.*":20,"value":42},
 "spotlight-comparison":{"options.*.name":20,"options.*.finding":40,"options.*.implication":36,"verdict":46},
 "benchmark-cards":{"cases.*.company":24,"cases.*.region":20,"cases.*.what":42,"cases.*.result":42,"cases.*.lesson":38,"application":68},
 "business-structure":{"actors.*.name":22,"actors.*.responsibility.*":32,"transactions.*":20},
 "hub-spoke":{"hub.name":18,"hub.detail":42,"spokes.*.name":18,"spokes.*.detail":40},
 "value-chain":{"primary.*.name":18,"primary.*.detail":40,"support.*.name":18,"support.*.detail":65,"goal.name":24,"goal.detail":50},

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
