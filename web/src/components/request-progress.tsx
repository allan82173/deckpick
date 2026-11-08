"use client";
import {useEffect,useState} from "react";
import {LoaderCircle} from "lucide-react";
export const requestStageLabels:Record<string,string>={"research/prepare":"첨부 자료·과제 해석 및 조사 계획","research/run":"질문별 공개 조사·원문 확인","storyline":"판단·발표 흐름 작성","research/continue":"추가 조사","candidates":"장표 후보 생성","candidates/regenerate":"장표 후보 생성","deck/review":"전체 덱 검토","slides/chat":"슬라이드 수정","key-check":"연결 확인"};
type Progress={deckId:string;action:string;active:boolean;startedAt:number;contactAt:number};
export function RequestProgress({deckId,busy=false}:{deckId:string;busy?:boolean}){
 const [progress,setProgress]=useState<Progress>(),[now,setNow]=useState(Date.now());
 useEffect(()=>{const receive=(event:Event)=>{const p=(event as CustomEvent<Progress>).detail;if(p?.deckId===deckId){setProgress(p);setNow(Date.now());}};window.addEventListener("deckpick-request-progress",receive);return()=>window.removeEventListener("deckpick-request-progress",receive);},[deckId]);
 const active=progress?.active||busy;
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);
 if(!active)return null;
 const elapsed=Math.max(0,Math.floor((now-(progress?.startedAt??now))/1000));
 const contact=Math.max(0,Math.floor((now-(progress?.contactAt??now))/1000));
 return <div className="notice request-progress" role="status"><LoaderCircle className="spin" size={18}/><div><strong>{progress?.active?(requestStageLabels[progress.action]??"AI 요청 처리"):"다음 단계 준비"} 중</strong><p>이 단계 {Math.floor(elapsed/60)}분 {elapsed%60}초 경과 · {contact<30?"서버 연결 유지 중":`서버 응답 대기 ${contact}초`}</p><small>조사는 여러 분 걸릴 수 있습니다. 중복 실행하지 않고 현재 요청의 결과를 기다립니다.</small></div></div>;
}
