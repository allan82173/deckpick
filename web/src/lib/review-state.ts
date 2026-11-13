import type { Deck } from "./model";
import { draftSlide } from "./draft-workflow";
import type { SlideSpec } from "./model";
import { inspectSlide } from "./slide-quality";
function ordered(value:unknown):unknown {return Array.isArray(value)?value.map(ordered):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,ordered(v)])):value;}
/** Schema parsing may reorder properties. QA metadata is not a user edit. */
export function sameReviewedSlide(a:SlideSpec|undefined,b:SlideSpec|undefined){
 if(!a||!b)return a===b;
 const content=({quality:_quality,...rest}:SlideSpec)=>JSON.stringify(ordered(rest));
 return content(a)===content(b);
}
export function invalidateStaleReview(previous: Deck | null, next: Deck | null): Deck | null {
  if(next){
    const current=next,reviewed=!!current.review&&previous?.review!==current.review;
    const edited={...current.edited};let changed=false;
    for(const [key,slide] of Object.entries(edited)){
      const index=Number(key),item=current.outline[index];
      if(!item||!reviewed&&sameReviewedSlide(previous?draftSlide(previous,index):undefined,slide))continue;
      // An old image assessment cannot describe newly edited text. Recompute
      // current geometry rather than carrying stale clipping warnings forward.
      const quality=inspectSlide(slide,item,current.input,current.researchRecord?.evidence??[],current.outline.slice(0,index).map((_,i)=>draftSlide(current,i)?.layoutId??""));
      edited[index]={...slide,quality:{...quality,suitableCandidateCount:slide.quality?.suitableCandidateCount,excludedCandidates:slide.quality?.excludedCandidates,attempts:slide.quality?.attempts??0}};changed=true;
    }
    if(changed)next={...current,edited};
  }
  if (!previous?.review || !next || previous.review !== next.review) return next;
  const visible = (deck: Deck) => JSON.stringify({ input: deck.input, outline: deck.outline, evidence: deck.researchRecord, slides: deck.outline.map((_, index) => draftSlide(deck, index)), design: deck.designSystem });
  return visible(previous) === visible(next) ? next : { ...next, review: undefined };
}
