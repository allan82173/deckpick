"use client";
import {useUiText} from "@/lib/ui-language";

import {useEffect,useRef,useState} from "react";
import {Plus,LoaderCircle,X,Paperclip} from "lucide-react";
import {insertPageSchema,type InsertPageInput} from "@/lib/insert-page";
import {FILE_ACCEPT,MAX_ATTACHMENTS,MAX_DOCUMENTS,MAX_PHOTOS,canAttach,type Attachment} from "@/lib/attachment-model";
import {uploadReference} from "@/lib/client-upload";
import {MAX_DECK_SLIDES} from "@/lib/model";
export function PageInsertForm({at,total,disabled,onInsert,openRequest}:{at:number;total:number;disabled:boolean;onInsert:(at:number,input:InsertPageInput)=>Promise<void>;openRequest?:number}){
  const ui = useUiText();

  const [open,setOpen]=useState(false),[message,setMessage]=useState(""),[section,setSection]=useState(""),[hint,setHint]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const container=useRef<HTMLDivElement>(null),fileInput=useRef<HTMLInputElement>(null),uploadLock=useRef(false);
  const [files,setFiles]=useState<Attachment[]>([]),[uploading,setUploading]=useState(false);
  async function upload(selected:File[]){if(uploadLock.current)return;uploadLock.current=true;setUploading(true);setError("");let next=[...files];try{for(const file of selected){const loaded=await uploadReference(file);if(!canAttach(next,loaded))throw Error(`이 장에는 문서 ${MAX_DOCUMENTS}개, 사진 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);next=[...next.filter(f=>f.id!==loaded.id),loaded];setFiles(next);}}catch(e){setError(e instanceof Error?e.message:"첨부를 읽지 못했습니다.");}finally{setUploading(false);uploadLock.current=false;}}
  useEffect(()=>{if(openRequest!==undefined){setOpen(true);setError("");}},[openRequest]);
  useEffect(()=>{if(open&&openRequest!==undefined){const frame=requestAnimationFrame(()=>container.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"center"}));return()=>cancelAnimationFrame(frame);}},[open,openRequest]);
  return <div className="page-insert-gap" ref={container}>
    {!open?<button className="page-insert-trigger" aria-label={total>=MAX_DECK_SLIDES?ui("최대 {0}장", [MAX_DECK_SLIDES]):at===total?ui("마지막에 페이지 추가"):ui("{0}번과 {1}번 사이에 페이지 추가", [at,at+1])} disabled={disabled||total>=MAX_DECK_SLIDES} onClick={()=>setOpen(true)}><Plus size={15}/>{total>=MAX_DECK_SLIDES?ui("최대 {0}장", [MAX_DECK_SLIDES]):ui("페이지 추가")}</button>:<form className="page-insert-form" onSubmit={async e=>{e.preventDefault();setError("");const result=insertPageSchema.safeParse({message,section,contentHint:hint,attachments:files});if(!result.success){setError(ui("이 페이지에서 전달할 키메시지나 질문을 입력해 주세요."));return;}setBusy(true);try{await onInsert(at,result.data);setOpen(false);setMessage("");setSection("");setHint("");setFiles([]);}catch(e){setError(e instanceof Error?e.message:ui("페이지를 추가하지 못했습니다."));}finally{setBusy(false);}}}>
      <div className="insert-heading"><strong>{at===total?ui("새 마지막 페이지"):ui("{0}번 위치에 새 페이지", [at+1])}</strong><button type="button" className="icon-button" disabled={busy} aria-label={ui("페이지 추가 닫기")} onClick={()=>setOpen(false)}><X size={16}/></button></div>
      <label>{ui("이 페이지의 키메시지 또는 질문 *")}<textarea autoFocus maxLength={120} required value={message} disabled={busy||disabled} onChange={e=>setMessage(e.target.value)} placeholder={ui("예: 제품 비교 단계에서 고객이 어떤 정보 때문에 선택을 망설일까요?")}/></label>
      <p className="hint">{ui("완성된 문장이 아니어도 됩니다. 하고 싶은 말 한 문장으로 먼저 만들고, 생성 후 AI 대화로 보완하세요.")}</p>
      <div className="insert-fields"><label>{ui("섹션 이름 · 선택")}<input maxLength={8} value={section} disabled={busy||disabled} onChange={e=>setSection(e.target.value)} placeholder={ui("예: 고객 분석")}/></label><label>{ui("꼭 담을 내용·근거 · 선택")}<textarea maxLength={1200} value={hint} disabled={busy||disabled} onChange={e=>setHint(e.target.value)} placeholder={ui("포함할 항목, 참고 파일의 위치, 검증할 가설 등을 적어 주세요.")}/></label></div>
      <section className="insert-attachments" aria-label={ui("이 페이지의 근거 파일")} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!disabled&&!busy)void upload(Array.from(e.dataTransfer.files));}}>
      <button type="button" className="button small" disabled={busy||disabled||uploading||files.length>=MAX_ATTACHMENTS} onClick={()=>fileInput.current?.click()}>{uploading?<LoaderCircle className="spin" size={14}/>:<Paperclip size={14}/>}{ui("근거 파일 첨부")}</button>
      <input ref={fileInput} type="file" multiple hidden accept={FILE_ACCEPT} aria-label={ui("새 페이지 근거 파일 선택")} onChange={e=>{if(e.target.files)void upload(Array.from(e.target.files));e.target.value="";}}/>
      <p className="hint">{ui("이 장에 사용할 PDF·Word·PPTX·TXT·MD·CSV·사진을 첨부하거나 끌어놓으세요. 문서 최대")}{MAX_DOCUMENTS}{ui("개 · 사진 최대")}{MAX_PHOTOS}{ui("장 · PDF 30MB · 그 외 개당 10MB. 문서는 필요한 발췌만 읽습니다.")}</p>
      {files.map(f=><div className="insert-file" key={f.id}><span>{f.name}<small>{f.kind==="image"?ui("사진"):ui("{0}자 추출", [f.characters.toLocaleString()])}</small></span><button type="button" aria-label={ui("{0} 첨부 해제", [f.name])} disabled={uploading||busy} onClick={()=>setFiles(previous=>previous.filter(v=>v.id!==f.id))}><X size={13}/></button></div>)}
      </section>
      {error&&<p role="alert" className="attachment-error">{error}</p>}
      <button className="button primary" type="submit" disabled={busy||disabled||uploading||!message.trim()}>{busy?<LoaderCircle size={15} className="spin"/>:<Plus size={15}/>}{ui("이 메시지로 페이지 만들기")}</button>
    </form>}
  </div>;
}
