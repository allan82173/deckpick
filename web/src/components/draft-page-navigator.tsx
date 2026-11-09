"use client";
import {useUiText} from "@/lib/ui-language";

import {useEffect,useRef,useState,type ReactNode} from "react";
import {Plus} from "lucide-react";
import {canvasHeadline} from "@/lib/canvas-edits";
import {MAX_DECK_SLIDES,type Deck} from "@/lib/model";
import {draftSlide} from "@/lib/draft-workflow";
import {SlidePreview} from "./slide-preview";

export function DraftPageNavigator({deck,children,disabled,onInsertRequest}:{deck:Deck;children:ReactNode;disabled:boolean;onInsertRequest:(at:number)=>void}){
  const ui = useUiText();

  const [active,setActive]=useState(0);
  const content=useRef<HTMLDivElement>(null),list=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let frame=0;
    const update=()=>{
      frame=0;
      const cards=Array.from(content.current?.querySelectorAll<HTMLElement>(".full-draft-card")??[]);
      let current=0;
      cards.forEach((card,index)=>{if(card.getBoundingClientRect().top<=window.innerHeight*0.35)current=index;});
      setActive(current);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    update();window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);
    const observer=new ResizeObserver(schedule);if(content.current)observer.observe(content.current);
    return()=>{window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);observer.disconnect();cancelAnimationFrame(frame);};
  },[deck.outline.length]);
  useEffect(()=>{
    const panel=list.current,button=panel?.querySelector<HTMLElement>(`[data-page="${active}"]`);
    if(!panel||!button)return;
    const top=button.offsetTop-panel.offsetTop,bottom=top+button.offsetHeight;
    if(top<panel.scrollTop)panel.scrollTop=top;
    else if(bottom>panel.scrollTop+panel.clientHeight)panel.scrollTop=bottom-panel.clientHeight;
  },[active]);
  return <div className="draft-review-layout">
    <nav className="draft-page-rail" aria-label={ui("슬라이드 페이지 탐색")}>
      <div className="draft-rail-heading"><strong>{ui("슬라이드")}</strong><span aria-live="polite">{active+1} / {deck.outline.length}</span></div>
      <div className="draft-rail-list" ref={list}>{deck.outline.map((item,index)=>{const slide=draftSlide(deck,index);return <div className="draft-rail-entry" key={index}><button data-page={index} className={`draft-rail-page${active===index?" is-current":""}`} aria-current={active===index?"page":undefined} aria-label={ui("{0}번 페이지로 이동: {1}", [index+1,slide?canvasHeadline(slide):item.message])} onClick={()=>{
        const card=content.current?.querySelectorAll<HTMLElement>(".full-draft-card")[index];
        card?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});
      }}><span className="draft-rail-number">{String(index+1).padStart(2,"0")}</span><span className="draft-rail-thumbnail" aria-hidden="true">{slide?<SlidePreview slide={slide} design={deck.designSystem} page={index+1} name={deck.input.topic} sections={deck.outline.map(o=>o.section)}/>:<span className="draft-rail-placeholder">{ui("작성 대기")}</span>}</span><span className="draft-rail-title">{slide?canvasHeadline(slide):item.message}</span></button><div className="draft-rail-insert"><button type="button" disabled={disabled||deck.outline.length>=MAX_DECK_SLIDES} aria-label={ui("{0}번 슬라이드 다음에 페이지 추가", [index+1])} title={deck.outline.length>=MAX_DECK_SLIDES?ui("최대 {0}장", [MAX_DECK_SLIDES]):ui("{0}번 슬라이드 다음에 페이지 추가", [index+1])} onClick={()=>onInsertRequest(index+1)}><Plus size={13}/></button></div></div>;})}</div>
    </nav>
    <div className="draft-review-content" ref={content}>{children}</div>
  </div>;
}
