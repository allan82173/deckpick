"use client";
import {useEffect,useState} from "react";
import type {Deck} from "@/lib/model";

/** Local hand-off only. Does not review, regenerate or export the deck. */
export function LocalSelectionSave({deck,disabled}:{deck:Deck;disabled:boolean}){
 const [runId,setRunId]=useState(""),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{
  if(process.env.NEXT_PUBLIC_CLI_ONLY!=="1")return;
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith("deckpick-selection-import:")&&localStorage.getItem(key)===deck.id){setRunId(key.slice("deckpick-selection-import:".length));return;}}setRunId("");}catch{setRunId("");}
 },[deck.id]);
 if(!runId)return null;
 return <div className="draft-review-actions"><button className="button primary" disabled={disabled||saving} onClick={async()=>{setSaving(true);setMessage("");try{const response=await fetch(`/api/local-selection/${encodeURIComponent(runId)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deck})});const value=await response.json();if(!response.ok)throw Error(value.error??"선택 저장 실패");setMessage("선택을 검토용으로 저장했습니다. AI 검토와 최종 PPT 출력은 아직 실행하지 않았습니다.");}catch(error){setMessage(error instanceof Error?error.message:"선택을 저장하지 못했습니다.");}finally{setSaving(false);}}}>{saving?"선택 저장 중…":"선택 완료 · 검토용으로 저장"}</button><span role="status">{message||"후보를 고른 뒤 저장해 주세요. 이후 선택한 장을 따로 검토합니다."}</span></div>;
}
