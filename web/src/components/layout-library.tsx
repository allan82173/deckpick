"use client";
import { useState } from "react";
import { bodyLayouts, layoutGroup, layoutGroups } from "@/lib/layout-catalog";
import { layoutNames, type Deck, type LayoutId } from "@/lib/model";
import { sampleData } from "@/lib/demo";
import { SlidePreview } from "./slide-preview";
import { roleLayouts } from "@/lib/slide-quality";
export function LayoutLibrary({deck,index,busy,onPick}:{deck:Deck;index:number;busy:boolean;onPick:(id:LayoutId,slot:number)=>void}){
  const [group,setGroup]=useState("전체"),[slot,setSlot]=useState(0);
  const role = deck.outline[index]?.role ?? deck.candidates[index]?.[deck.picked[index] ?? 0]?.role;
  const ids=role ? roleLayouts(deck.input.deckType, role) : bodyLayouts(deck.input), visible=deck.candidates[index]??[];
  return <details className="layout-library"><summary>전체 본문 유형 보기 · {ids.length}개 구성</summary>
    <p className="hint">참고 자료의 표현 방식을 정리한 구성 예시입니다. 아래 예시는 현재 프로젝트를 분석한 결과가 아닙니다. 원하는 유형을 골라 후보 한 자리만 다시 만드세요.</p>
    <div className="library-controls"><label>유형<select aria-label="본문 유형 필터" value={group} onChange={e=>setGroup(e.target.value)}>{["전체",...layoutGroups].map(name=><option key={name}>{name}</option>)}</select></label><label>바꿀 후보<select aria-label="구성을 넣을 후보" value={slot} onChange={e=>setSlot(Number(e.target.value))}>{[0,1,2].map(i=><option key={i} value={i}>후보 {String.fromCharCode(65+i)}</option>)}</select></label><span className="hint">{deck.demo?"데모: 예시 후보로 교체":"AI 모드: 선택 시 후보 생성 요청 1회 · 검증 재시도가 추가될 수 있음"}</span></div>
    <div className="layout-library-grid">{ids.filter(id=>group==="전체"||layoutGroup(id)===group).map(id=>{
      const used=visible.some(s=>s.layoutId===id);
      return <article key={id} className="layout-library-card"><div><strong>{layoutNames[id]}</strong><small>{layoutGroup(id)}</small></div><SlidePreview slide={{layoutId:id,section:deck.outline[index].section,headline:deck.outline[index].message,data:sampleData(id,deck.outline[index]),sources:[],notes:"구성 예시"}} design={deck.designSystem} page={index+1}/><button className="button small" disabled={busy||used||visible.length!==3} onClick={()=>onPick(id,slot)}>{used?"현재 후보에 포함됨":`후보 ${String.fromCharCode(65+slot)}에 이 구성 사용`}</button></article>;
    })}</div>
  </details>;
}
