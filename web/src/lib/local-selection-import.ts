import {persistedDeckSchema,type Deck} from "./model";
import {loadDeckArchive,saveDeckArchive} from "./deck-session";
type Shelf=Pick<Storage,"getItem"|"setItem"|"key"|"length">;
const marker=(runId:string)=>`deckpick-selection-import:${runId}`;
export function selectionPreviewProgress(deck:Deck){
 const total=deck.input.slideCount,completed=Array.from({length:total},(_,index)=>deck.candidates[index]?.length?1:0).reduce<number>((sum,value)=>sum+value,0);
 return {ready:deck.outline.length===total&&completed===total,completed,total};
}
/** Repeat visits restore the user's latest copy, never overwrite it with the runner snapshot. */
export function previouslyImportedSelection(storage:Shelf,runId:string,current:Deck|null):Deck|undefined{
 const id=storage.getItem(marker(runId));
 if(!id)return;
 const saved=current?.id===id?current:loadDeckArchive(storage,id);
 if(!saved)throw Error("이 후보는 이미 불러온 기록이 있습니다. 보관된 작업에서 확인해 주세요.");
 return saved;
}
export function importLocalSelection(storage:Shelf,runId:string,raw:unknown,current:Deck|null):Deck{
 const previous=previouslyImportedSelection(storage,runId,current);
 const incoming=previous??persistedDeckSchema.parse(raw) as Deck;
 const retained=previous??(current?.id===incoming.id?current:loadDeckArchive(storage,incoming.id));
 const next=retained??{...incoming,generation:{runId,status:"awaiting-review" as const,completedStages:incoming.outline.map((_,i)=>`candidate:${i}`),lastCompletedStage:`candidate:${incoming.outline.length-1}`,updatedAt:new Date().toISOString()}};
 if(!previous&&!selectionPreviewProgress(next).ready)throw Error("전체 장의 후보를 아직 준비하고 있습니다.");
 if(current&&current.id!==next.id)saveDeckArchive(storage,current);
 saveDeckArchive(storage,next);
 storage.setItem("deckpick-deck",JSON.stringify(next));
 storage.setItem(marker(runId),next.id);
 return next;
}
