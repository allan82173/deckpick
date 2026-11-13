import type {SlideSpec,DeckInput} from "./model";

/** Scope dates are source metadata, not creative copy. Restore only explicit
 * missing date anchors, without another model call or deleting existing text. */
export function preserveCoverScope(slide:SlideSpec,input:DeckInput):SlideSpec{
 if(!slide.layoutId.endsWith("cover"))return slide;
 const data={...slide.data};
 if(slide.layoutId==="c-cover"&&input.stage)data.eyebrow=input.stage==="final"?"최종 발표":"중간 발표";
 let subtitle=String(data.subtitle??"");
 const visible=JSON.stringify(data).replace(/\s/g,"");
 for(const requirement of slide.contentContract?.requirements??[]){
  if(requirement.display!=="body"||requirement.kind!=="condition"||!/기간|기준일/.test(requirement.quote))continue;
  for(const anchor of requirement.anchors){
   if(visible.includes(anchor.replace(/\s/g,""))||subtitle.replace(/\s/g,"").includes(anchor.replace(/\s/g,"")))continue;
   if(/^(?:19|20)\d{2}\s*[~～]\s*(?:19|20)\d{2}년?$/.test(anchor))subtitle+=`\n전략 기간 ${anchor}`;
   else if(/^(?:19|20)\d{2}년\s*\d{1,2}월\s*\d{1,2}일$/.test(anchor)&&requirement.quote.includes("기준일"))subtitle+=`\n기준일 ${anchor}`;
  }
 }
 if(subtitle.length<=300)data.subtitle=subtitle;
 return {...slide,data};
}
