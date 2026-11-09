"use client";
import {useUiText} from "@/lib/ui-language";

import {useEffect,useState} from "react";
import {LoaderCircle} from "lucide-react";
export const requestStageLabels:Record<string,string>={"research/prepare":"첨부 자료·과제 해석 및 조사 계획","research/run":"질문별 공개 조사·원문 확인","storyline/judgment":"현재 판단·반전 조건 정리","storyline":"발표 흐름·장별 구성 작성","research/continue":"추가 조사","candidates":"장표 후보 생성","candidates/regenerate":"장표 후보 생성","deck/review":"전체 덱 검토","slides/chat":"슬라이드 수정","key-check":"연결 확인"};
type Progress={deckId:string;action:string;active:boolean;startedAt:number;contactAt:number};
export function RequestProgress({deckId,busy=false}:{deckId:string;busy?:boolean}){
  const ui = useUiText();

 const [progress,setProgress]=useState<Progress>(),[now,setNow]=useState(Date.now());
 useEffect(()=>{const receive=(event:Event)=>{const p=(event as CustomEvent<Progress>).detail;if(p?.deckId===deckId){setProgress(p);setNow(Date.now());}};window.addEventListener("deckpick-request-progress",receive);return()=>window.removeEventListener("deckpick-request-progress",receive);},[deckId]);
 const active=progress?.active||busy;
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);
 if(!active)return null;
 const elapsed=Math.max(0,Math.floor((now-(progress?.startedAt??now))/1000));
 const contact=Math.max(0,Math.floor((now-(progress?.contactAt??now))/1000));
 return <div className="notice request-progress" role="status"><LoaderCircle className="spin" size={18}/><div><strong>{progress?.active?ui(requestStageLabels[progress.action]??"AI 요청 처리"):ui("다음 단계 준비")} {ui("중")}</strong><p>{ui("이 단계")}{Math.floor(elapsed/60)}{ui("분")}{elapsed%60}{ui("초 경과 ·")}{contact<30?ui("서버 연결 유지 중"):ui("서버 응답 대기 {0}초", [contact])}</p><small>{ui("조사는 여러 분 걸릴 수 있습니다. 중복 실행하지 않고 현재 요청의 결과를 기다립니다.")}</small></div></div>;
}
