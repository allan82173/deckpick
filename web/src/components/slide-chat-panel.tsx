"use client";
import {useUiText} from "@/lib/ui-language";

import {Attachments,useAttachmentUpload} from "./attachments";
import {useState} from "react";
import {MessageSquare,Send,LoaderCircle} from "lucide-react";
import type {Attachment} from "@/lib/attachment-model";
import type {ChatMessage} from "@/lib/model";
export function SlideChatPanel({index,messages,disabled,demo,onSend,files}:{index:number;messages:ChatMessage[];disabled:boolean;demo:boolean;files?:Attachment[];onSend:(index:number,text:string)=>Promise<void>}){
  const ui = useUiText();

  const uploads=useAttachmentUpload();
  const [text,setText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  return <details className="slide-chat-panel"><summary><MessageSquare size={15}/>{index+1}{ui("번 슬라이드 AI와 대화")}<span>{messages.length?ui("{0}개 기록", [messages.length]):ui("전체 덱 맥락 공유")}</span></summary><div className="slide-chat-body"><p className="hint">{ui("다른 장의 최신 내용 요약과 장별 최근 요청도 함께 참고합니다. 수정은 이 장에만 적용합니다.")}{demo&&ui("현재 데모 모드입니다.")}</p>
    {files?.length?<p className="hint">{ui("이 장의 근거 파일:")}{files.map(f=>f.name).join(" · ")}</p>:null}<div className="slide-chat-messages" aria-label={ui("{0}번 슬라이드 대화 기록", [index+1])} aria-live="polite">{messages.length?messages.map((m,i)=><div className={`slide-chat-message ${m.role}`} key={i}><strong>{m.role==="user"?ui("나"):"DeckPick"}</strong><p>{m.text}</p></div>):<p className="hint">{ui("예: ‘1번 장에서 바꾼 타깃에 맞춰 이 장의 문구를 수정해 줘’")}</p>}</div>
    <details className="slide-chat-attachments"><summary>{ui("공통 참고 자료·사진 첨부")}</summary><Attachments state={uploads}/></details><form onSubmit={async e=>{e.preventDefault();if(!text.trim()||busy)return;setBusy(true);setError("");try{await onSend(index,text.trim());setText("");}catch(e){setError(e instanceof Error?e.message:ui("대화를 처리하지 못했습니다."));}finally{setBusy(false);}}}><label>{index+1}{ui("번 슬라이드 수정 요청")}<textarea aria-label={ui("{0}번 슬라이드 AI 요청", [index+1])} placeholder={ui("이 장에서 바꾸거나 물어볼 내용을 적어 주세요.")} maxLength={3000} value={text} disabled={disabled||busy} onPaste={e=>{const files=Array.from(e.clipboardData.files);if(files.length){e.preventDefault();void uploads.upload(files);setText(previous=>previous||ui("첨부한 자료를 이 장에 맞춰 검토해 줘"));}}} onDragOver={e=>e.preventDefault()} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();void uploads.upload(Array.from(e.dataTransfer.files));setText(previous=>previous||ui("첨부한 자료를 이 장에 맞춰 검토해 줘"));}}} onChange={e=>setText(e.target.value)}/></label><button type="submit" className="button primary" disabled={disabled||busy||uploads.busy||!text.trim()}>{busy?<LoaderCircle className="spin" size={14}/>:<Send size={14}/>} {busy?ui("답변 준비 중"):ui("보내기")}</button></form>{error&&<p className="attachment-error" role="alert">{error}</p>}
  </div></details>;
}
