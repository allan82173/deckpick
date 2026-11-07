import {z} from "zod";
import {makeScene} from "./scene";
import {canvasHeadline,patchCanvasNode} from "./canvas-edits";
import {draftSlide} from "./draft-workflow";
import type {Deck,SlideSpec,DesignSystem} from "./model";
export const deckContextSchema=z.array(z.object({index:z.number().int().min(0).max(29),headline:z.string().max(500),layoutId:z.string().max(60),text:z.string().max(1400),requests:z.array(z.string().max(400)).max(2)})).max(30);
export type DeckChatContext=z.infer<typeof deckContextSchema>;
export const slideChatResponseSchema=z.object({reply:z.string().min(1).max(4000),changes:z.array(z.object({before:z.string().min(1).max(3000),after:z.string().max(3000)})).max(25)});
export function deckChatContext(deck:Deck):DeckChatContext{
  return deck.outline.map((item,index)=>{const slide=draftSlide(deck,index);const text=slide?makeScene(slide,deck.designSystem,index+1,deck.input.topic,deck.outline.map(o=>o.section)).nodes.filter(n=>n.kind==="text").map(n=>n.kind==="text"?n.text:"").filter(t=>t!==deck.input.topic&&!deck.outline.some(o=>o.section===t)&&!/^\d{2}$/.test(t)):[];
    return {index,headline:(slide?canvasHeadline(slide):item.message).slice(0,500),layoutId:slide?.layoutId??"",text:[...new Set(text)].join("\n").slice(0,1400),requests:(deck.chat.slides[index]??[]).filter(m=>m.role==="user").slice(-2).map(m=>m.text.slice(0,400))};});
}
export function applySlideChatChanges(slide:SlideSpec,design:DesignSystem,index:number,topic:string,sections:string[],changes:z.infer<typeof slideChatResponseSchema>["changes"]){
  const original=makeScene({...slide,canvasEdits:undefined},design,index+1,topic,sections).nodes;
  const current=makeScene(slide,design,index+1,topic,sections).nodes;
  let next=slide;
  for(const change of changes){const matches=current.flatMap((node,i)=>node.kind==="text"&&node.text===change.before?[i]:[]);if(!matches.length)throw Error("AI가 현재 장표에 없는 텍스트를 수정하려 했습니다. 원본은 유지했습니다.");for(const i of matches)next=patchCanvasNode(next,original[i],{text:change.after});}
  return next;
}
