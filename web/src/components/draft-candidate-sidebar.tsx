"use client";
import {LoaderCircle,RefreshCw,MessageSquare,Check} from "lucide-react";
import type {Deck} from "@/lib/model";
import {candidatePlan} from "@/lib/candidate-plan";
import {canvasHeadline} from "@/lib/canvas-edits";
import {SlidePreview} from "./slide-preview";
export function DraftCandidateSidebar({deck,index,busy,disabled,onLoad,onSelect,onCompare}:{deck:Deck;index:number;busy:boolean;disabled:boolean;onLoad:()=>void;onSelect:(slot:number)=>void;onCompare:()=>void}){
  const options=deck.candidates[index]??[],selected=deck.picked[index]??0;
  let maximum=3;try{maximum=candidatePlan(deck.input,deck.outline[index]).length;}catch{maximum=options.length;}
  return <aside className="draft-candidate-sidebar" aria-label={`${index+1}번 장의 레이아웃 후보`}>
    <button className="button draft-compare-button" disabled={disabled||busy||!options.length||options.length>=maximum} onClick={onLoad}>{busy?<LoaderCircle className="spin" size={15}/>:<RefreshCw size={15}/>}이 장 다른 후보 보기</button>
    <div className="draft-sidebar-caption"><strong>레이아웃 후보</strong><span>{options.length} / {maximum}</span></div>
    <p className="draft-sidebar-help">후보를 누르면 왼쪽 장표에 적용됩니다.</p>
    <div className="draft-sidebar-options">{Array.from({length:maximum},(_,i)=>i).map(slot=>{const original=options[slot],slide=slot===selected?deck.edited[index]??original:original;return slide?<button key={slot} className={`draft-sidebar-option${selected===slot?" selected":""}`} aria-label={`${index+1}번 장 후보 ${String.fromCharCode(65+slot)} 선택`} aria-pressed={selected===slot} disabled={disabled||busy} onClick={()=>onSelect(slot)}><span className="draft-option-label">후보 {String.fromCharCode(65+slot)}<span>{selected===slot?<><Check size={12}/>적용 중</>:"적용하기"}</span></span><span aria-hidden="true"><SlidePreview slide={slide} design={deck.designSystem} page={index+1} name={deck.input.topic} sections={deck.outline.map(o=>o.section)}/></span><span className="draft-option-title">{canvasHeadline(slide)}</span></button>:<div className="draft-sidebar-empty" key={slot}><strong>후보 {String.fromCharCode(65+slot)}</strong><span>{busy?<><LoaderCircle size={14} className="spin"/>준비 중</>:"위 버튼을 눌러 후보를 확인하세요"}</span></div>;})}</div>
    <button className="text-button draft-sidebar-chat" disabled={disabled||busy||!options.length} onClick={onCompare}><MessageSquare size={13}/>AI 대화·후보 상세 수정</button>
  </aside>;
}
