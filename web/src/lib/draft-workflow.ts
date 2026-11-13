import { slideSchema, type Deck, type SlideSpec } from "./model";
import { candidatePlan,candidateSignature } from "./candidate-plan";
export function draftSlide(deck:Deck,index:number):SlideSpec|undefined {
  return deck.edited[index] ?? deck.candidates[index]?.[deck.picked[index]] ?? deck.candidates[index]?.[0];
}
export function initializeDraftSelections(deck:Deck):Deck {
  const picked={...deck.picked},candidates={...deck.candidates};let changed=false;
  deck.outline.forEach((_,i)=>{
    if(picked[i]!==undefined&&candidates[i]?.[picked[i]])return;
    if(candidates[i]?.length){picked[i]=0;changed=true;}
    else if(deck.edited[i]){candidates[i]=[deck.edited[i]];picked[i]=0;changed=true;}
  });
  return changed?{...deck,picked,candidates}:deck;
}
export function applyPrimaryDraft(deck:Deck,index:number,slide:SlideSpec):Deck {
  if(draftSlide(deck,index))return initializeDraftSelections(deck);
  slideSchema.parse(slide);
  return {...deck,candidates:{...deck.candidates,[index]:[slide]},picked:{...deck.picked,[index]:0}};
}
export function appendDraftAlternative(deck:Deck,index:number,slide:SlideSpec):Deck {
  const candidates=deck.candidates[index]??[];
  if(candidates.length>=3)return deck;
  slideSchema.parse(slide);
  if(candidates.some(s=>candidateSignature(s)===candidateSignature(slide)||(!slide.layoutId.endsWith("cover")&&s.layoutId===slide.layoutId)))throw Error("기존 초안과 다른 후보가 필요합니다.");
  return {...deck,candidates:{...deck.candidates,[index]:[...candidates,slide]}};
}
export function draftProgress(deck:Deck){
  const ready=deck.outline.filter((_,i)=>slideSchema.safeParse(draftSlide(deck,i)).success).length;
  return {ready,total:deck.outline.length,complete:deck.outline.length>0&&ready===deck.outline.length};
}
export function sameDraftContext(a:Deck,b:Deck){
 const content=(deck:Deck)=>deck.outline.map(({acceptedCandidateCount:_runtime,...item})=>item);
 return a.id===b.id&&JSON.stringify(content(a))===JSON.stringify(content(b));
}
export function selectDraftAlternative(deck:Deck,index:number,slot:number):Deck{
  const options=deck.candidates[index];if(!options?.[slot]||deck.picked[index]===slot)return deck;
  const previous=deck.picked[index]??0;
  const updated=options.map((slide,i)=>i===previous&&deck.edited[index]?deck.edited[index]:slide);
  const edited={...deck.edited};delete edited[index];
  return {...deck,candidates:{...deck.candidates,[index]:updated},picked:{...deck.picked,[index]:slot},edited};
}

/** Initial full drafts include every suitable candidate (up to three), retaining manual work. */
export function candidateTargetCount(deck:Deck,index:number){
 const accepted=deck.outline[index]?.acceptedCandidateCount;if(accepted)return accepted;
 try{return candidatePlan(deck.input,deck.outline[index]).length;}catch{return 1;}
}
export function draftNeedsCandidates(deck:Deck,index:number){
 return !draftSlide(deck,index)||(deck.candidates[index]?.length??0)<candidateTargetCount(deck,index);
}
export function applyDraftCandidates(deck:Deck,index:number,incoming:SlideSpec[]):Deck{
 if(!incoming.length)throw Error("생성된 후보가 없습니다.");
 incoming.forEach(s=>slideSchema.parse(s));
 const normalized=initializeDraftSelections(deck);
 if(!draftSlide(normalized,index))return {...normalized,outline:normalized.outline.map((item,i)=>i===index?{...item,acceptedCandidateCount:incoming[0]?.quality?.suitableCandidateCount}:item),candidates:{...normalized.candidates,[index]:incoming.slice(0,3)},picked:{...normalized.picked,[index]:0}};
 const accepted=incoming[0]?.quality?.excludedCandidates?.length?incoming[0].quality.suitableCandidateCount:undefined;
 let next=accepted?{...normalized,outline:normalized.outline.map((item,i)=>i===index?{...item,acceptedCandidateCount:accepted}:item)}:normalized;
 for(const slide of incoming){const existing=next.candidates[index]??[];if(existing.length>=3)break;if(existing.some(s=>candidateSignature(s)===candidateSignature(slide)||(!slide.layoutId.endsWith("cover")&&s.layoutId===slide.layoutId)))continue;next=appendDraftAlternative(next,index,slide);}
 return next;
}
