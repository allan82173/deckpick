"use client";
import {sharedPreview} from "@/lib/runtime-mode";
import {useUiText} from "@/lib/ui-language";

import {EvidenceReview} from "./evidence-review";
import {useState} from "react";
import Link from "next/link";
import {Download,LoaderCircle,RefreshCw} from "lucide-react";
import {draftSlide,draftProgress,draftNeedsCandidates} from "@/lib/draft-workflow";
import {canvasHeadline} from "@/lib/canvas-edits";
import type {Deck,SlideSpec} from "@/lib/model";
import {GenerationReportButton} from "./generation-report-button";
import {LocalSelectionSave} from "./local-selection-save";
import {DraftCandidateSidebar} from "./draft-candidate-sidebar";
import {SlideChatPanel} from "./slide-chat-panel";
import {EditableSlide} from "./editable-slide";
import {DraftPageNavigator} from "./draft-page-navigator";
import {PageInsertForm} from "./page-insert-form";
import type {InsertPageInput} from "@/lib/insert-page";
export function FullDraftReview({onReplay,onReview,deck,busyIndex,running,failed,onRetry,onCompare,onLoadAlternatives,onSelectAlternative,onInsert,onEdit,onSlideChat,onError}:{onReplay?:()=>void;onReview:()=>void;deck:Deck;busyIndex:number|null;running:boolean;failed:boolean;onRetry:()=>void;onCompare:(index:number)=>void;onLoadAlternatives:(index:number)=>void;onSelectAlternative:(index:number,slot:number)=>void;onInsert:(at:number,input:InsertPageInput)=>Promise<void>;onEdit:(slide:SlideSpec,index:number)=>void;onSlideChat:(index:number,text:string)=>Promise<void>;onError:(text:string)=>void}){
  const ui = useUiText();

  const [exporting,setExporting]=useState(false);
  const [insertRequest,setInsertRequest]=useState<{at:number;sequence:number}|null>(null);
  const progress=draftProgress(deck);
  const missing=!sharedPreview&&deck.outline.some((_,i)=>draftNeedsCandidates(deck,i));
  return <main className="workspace full-draft-workspace">
    <div className="draft-heading"><div><span className="eyebrow">03 — FULL DRAFT</span><h1>{ui("먼저 전체 초안을 확인하세요.")}</h1><p>{ui("내용과 구성을 채운 덱입니다. 마음에 들지 않는 장만 다른 후보로 바꾸거나 문구를 수정하세요.")}</p></div><button className="button primary" disabled={!progress.complete||running||exporting} onClick={async()=>{setExporting(true);onError("");try{const {exportDeck}=await import("@/lib/export");await exportDeck(deck);}catch(e){onError(e instanceof Error?e.message:ui("내려받지 못했습니다."));}finally{setExporting(false);}}}>{exporting?<LoaderCircle size={16} className="spin"/>:<Download size={16}/>} {ui("PPTX 다운로드")}</button></div>
    <div className="draft-status" role="status"><span>{running?<><LoaderCircle className="spin" size={15}/> {busyIndex===null?ui("전체 초안 준비 중"):ui("{0}번 장의 내용과 구성을 작성 중", [busyIndex+1])}</>:progress.complete?ui("전체 초안이 준비됐습니다."):ui("초안에 확인하거나 보완할 장이 있습니다.")}</span><strong>{progress.ready} / {progress.total}{ui("장")}</strong><div className="draft-progress"><i style={{width:`${progress.total?progress.ready/progress.total*100:0}%`}}/></div></div>
    {deck.demo&&<p className="notice">{ui("데모는 준비된 예시입니다. 실제 주제·첨부 자료를 분석한 초안은 AI 모드에서 생성하세요.")}</p>}
    {(failed||missing)&&!running&&<div className="notice warning">{ui("아직 준비되지 않은 장표 또는 후보가 있습니다. 기존 초안과 직접 수정한 내용은 유지됩니다.")}<button className="button small" onClick={onRetry}><RefreshCw size={13}/> {ui("이어서 생성")}</button></div>}
    <div className="draft-navigation"><Link href={`/deck/${deck.id}/outline`}>{ui("목차·핵심 메시지 조정")}</Link><span>{ui("장별 초안과 최대 3개의 후보를 함께 준비합니다. 내용에 맞는 형식이 2개면 2개를 보여줍니다.")}</span></div>
    <div className="draft-review-actions"><button className="button" disabled={sharedPreview||running||busyIndex!==null||!progress.complete||deck.demo} onClick={onReview}>{deck.review?.status==="incomplete"?ui("미완료 검토 다시 실행"):ui("전체 논리·요구사항 검토")}</button>{deck.review && <p className="notice">{deck.review.summary}{deck.review.status==="incomplete"?ui(" · 검토 미완료"):ui(" · 남은 문제 {0}개", [deck.review.issues.length])}</p>}</div>
    {!sharedPreview&&<><button className="button" disabled={running||!progress.complete||!onReplay} onClick={onReplay}>같은 자료·구성으로 새 초안 만들기</button><p className="small">기존 작업은 보관하고, 조사와 8장 구성을 유지해 장표만 다시 만듭니다.</p></>}<EvidenceReview deck={deck}/>
    <GenerationReportButton deck={deck}/>
    <LocalSelectionSave deck={deck} disabled={running||!progress.complete}/>
    <DraftPageNavigator deck={deck} disabled={sharedPreview||running||busyIndex!==null} onInsertRequest={at=>setInsertRequest(previous=>({at,sequence:(previous?.sequence??0)+1}))}><div className="full-draft-slides">{deck.outline.map((item,index)=>{const slide=draftSlide(deck,index);return <div className="full-draft-entry" key={index}><div className="draft-page-with-candidates"><article className="full-draft-card"><header><span>{String(index+1).padStart(2,"0")} / {item.section}</span><strong>{slide?canvasHeadline(slide):item.message}</strong>{deck.review?.issues.some(issue=>issue.index===index)&&<span className="quality-badge">{ui("논리 확인 필요")}</span>}{!!slide?.quality?.warnings.length&&<span className="quality-badge" title={slide.quality.warnings.join("\n")}>{ui("확인 필요")}{slide.quality.warnings.length}</span>}</header>{slide?<EditableSlide key={`${index}:${deck.picked[index]}:${item.message}`} slide={slide} deck={deck} index={index} disabled={running||busyIndex!==null} onChange={next=>onEdit(next,index)}/>:<div className="draft-page-placeholder">{busyIndex===index?<><LoaderCircle className="spin"/> {ui("내용을 채우고 있습니다.")}</>:ui("이 장의 초안을 준비합니다.")}</div>}<div className="draft-page-actions"><span className="canvas-edit-hint">{ui("한 번 눌러 선택 · 테두리로 이동 · 8개 손잡이로 크기 조절 · 두 번 눌러 글자 편집")}</span></div>{slide?.sources.length?<details className="draft-sources"><summary>{ui("이 장의 출처")}{slide.sources.length}{ui("개")}</summary>{slide.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>)}</details> :null}{slide&&!sharedPreview&&<details className="draft-sources"><summary>{ui("장표 품질 4개 기준")} · {slide.quality?.visual?.criteria?.length===4?`${slide.quality.visual.criteria.filter(c=>c.passed).length}/4`:ui("미검수")}</summary><ol>{["키메시지와 앞뒤 연결","제목을 뒷받침하는 본문","가시화 선택의 적합성","제출 전 수정 필요 여부"].map((label,n)=>{const result=slide.quality?.visual?.criteria?.find(c=>c.criterion===n+1);return <li key={n}><strong>{ui(label)}</strong> · {result?ui(result.passed?"통과":"수정 필요"):ui("미검수")}{result&&<p>{result.reason}{result.improvement&&` · ${result.improvement}`}</p>}</li>;})}</ol></details>}{!sharedPreview&&<SlideChatPanel key={item.message} files={item.attachments} index={index} messages={deck.chat.slides[index]??[]} disabled={running||busyIndex!==null||!slide} demo={deck.demo} onSend={onSlideChat}/>}</article><DraftCandidateSidebar deck={deck} index={index} busy={busyIndex===index} disabled={running||busyIndex!==null} onLoad={()=>onLoadAlternatives(index)} onSelect={slot=>onSelectAlternative(index,slot)} onCompare={()=>onCompare(index)}/></div>{!sharedPreview&&<PageInsertForm openRequest={insertRequest?.at===index+1?insertRequest.sequence:undefined} at={index+1} total={deck.outline.length} disabled={running||busyIndex!==null} onInsert={async(at,input)=>{await onInsert(at,input);}}/>}</div>})}</div></DraftPageNavigator>
  </main>;
}



