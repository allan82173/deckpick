import type {OutlineItem} from "./model";
import type {ResearchRecord} from "./evidence-model";

/** Remove duplicated design records, never evidence values or user decisions. */
export function compactSlideItem(item:OutlineItem){
 const {argument:_argument,calculation:_calculation,contentContract:_contract,attachments:_attachments,...identity}=item;
 return identity;
}
export function neighborHeadlines(outline:OutlineItem[],index:number){
 const pick=(item:OutlineItem|undefined)=>item?{index:item.index,section:item.section,message:item.message,transition:item.argument?.transition}:null;
 return {previous:pick(outline.find(item=>item.index===index-1)),next:pick(outline.find(item=>item.index===index+1))};
}
export function taskContextForSlide(record:ResearchRecord|undefined,item:OutlineItem){
 const analysis=record?.analysis;if(!analysis)return undefined;
 // Checklist and terminology remain whole. Other questions are represented by
 // their public question; the relevant question keeps its complete definition.
 return {...analysis,questions:analysis.questions.map(q=>q.id===item.argument?.questionId?q:{id:q.id,publicQuestion:q.publicQuestion})};
}
