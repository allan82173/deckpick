"use client";
import {publicDemoOnly,demoUploadNotice} from "@/lib/runtime-mode";
import { useRef, useState } from "react";
import { Paperclip, LoaderCircle, X } from "lucide-react";
import { useStudio } from "./store";
import { FILE_ACCEPT, MAX_ATTACHMENTS, MAX_DOCUMENTS, MAX_PHOTOS, canAttach } from "@/lib/attachment-model";
import { uploadReference } from "@/lib/client-upload";
export function useAttachmentUpload() {
  const { deck, setDeck } = useStudio();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  const files = deck?.attachments ?? [];
  async function upload(selected: Iterable<File>) {
    if (publicDemoOnly){setError(demoUploadNotice);return;}
    if (!deck || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    let pendingFiles = files;
    try {
      for (const file of selected) {
        const attachment = await uploadReference(file);
        if (!canAttach(pendingFiles, attachment)) throw Error(`문서는 ${MAX_DOCUMENTS}개, 사진은 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
        pendingFiles = [...pendingFiles.filter((file) => file.id !== attachment.id), attachment];
        setDeck((d) => d?.id === deck.id && canAttach(d.attachments ?? [], attachment) ? { ...d, attachments: [...(d.attachments ?? []).filter((f) => f.id !== attachment.id), attachment] } : d);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다."); }
    finally { lock.current = false; setBusy(false); }
  }
  return { files, busy, error, upload };
}
export function Attachments({ state, collapseList = false }: { state: ReturnType<typeof useAttachmentUpload>; collapseList?: boolean }) {
  const { deck, setDeck } = useStudio();
  const input = useRef<HTMLInputElement>(null);
  if (!deck) return null;
  const { files, busy, error, upload } = state;
  if(publicDemoOnly)return <p className="hint">{demoUploadNotice}</p>;
  const fileItems = files.map((file) => <div key={file.id} className="attachment-item">
      {file.kind === "image" && <a className="attachment-thumbnail" href={`/api/attachments/${file.id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/attachments/${file.id}`} width={84} height={64} alt={`${file.name} 미리보기`} /></a>}
      <div><strong>{file.name}</strong>
        <small>{file.kind === "image" ? `${file.width} × ${file.height}px · 사진` : `${file.characters.toLocaleString()}자 · ${file.chunks}개 구간 · 전체 약 ${file.estimatedTokens.toLocaleString()} 토큰`}</small>
        {file.kind === "image" && <div className="image-options">
          <label><input type="checkbox" checked={file.includeForAI !== false} onChange={(e) => setDeck((d) => d ? { ...d, attachments: (d.attachments ?? []).map((f) => f.id === file.id ? { ...f, includeForAI: e.target.checked } : f) } : d)} /> AI 분석에 포함</label>
          <select aria-label={`${file.name} 읽기 화질`} value={file.imageDetail ?? "auto"} onChange={(e) => setDeck((d) => d ? { ...d, attachments: (d.attachments ?? []).map((f) => f.id === file.id ? { ...f, imageDetail: e.target.value as "auto" | "low" } : f) } : d)}><option value="auto">글자·도표 읽기</option><option value="low">저비용 · 큰 구성만</option></select>
        </div>}
        <details><summary>읽기 범위·주의사항</summary><p>{file.kind === "image" ? "분석 포함이 켜진 사진은 다음 대화·목차·후보 생성 요청에도 전송됩니다. 필요 없으면 체크를 끄거나 첨부를 해제하세요. 사진 토큰은 텍스트 발췌 예산과 별도입니다." : "문서 발췌문은 요청당 최대 약 2,400 토큰입니다. 전체를 매번 읽지는 않습니다."}</p>{file.warnings.map((w) => <p key={w}>{w}</p>)}</details>
      </div>
      <button type="button" className="icon-button" disabled={busy} aria-label={`${file.name} 첨부 해제`} onClick={() => setDeck((d) => d ? { ...d, attachments: (d.attachments ?? []).filter((f) => f.id !== file.id) } : d)}><X size={14} /></button>
    </div>);
  return <section className="attachment-panel" aria-label="첨부 자료">
    <div className="attachment-heading">
      <button type="button" className="text-button" disabled={busy || files.length >= MAX_ATTACHMENTS} onClick={() => input.current?.click()}>
        {busy ? <LoaderCircle size={14} className="spin" /> : <Paperclip size={14} />} {busy ? "사진·자료 준비 중…" : "사진·자료 첨부"}
      </button><span>문서 {files.filter((file) => file.kind !== "image").length}/{MAX_DOCUMENTS} · 사진 {files.filter((file) => file.kind === "image").length}/{MAX_PHOTOS} · PDF 30MB · 그 외 개당 10MB</span>
    </div>
    <input ref={input} type="file" multiple hidden accept={FILE_ACCEPT} aria-label="참고 파일 선택" onChange={(e) => { if (e.target.files) void upload(Array.from(e.target.files)); e.target.value = ""; }} />
    <p className="hint">캡처는 채팅창에 Ctrl+V, 사진·파일은 드래그해 넣으세요. PNG·JPG·WebP와 PDF·Word·PPTX·TXT·MD·CSV를 지원합니다.</p>
    {files.length > 0 && (collapseList ? (
      <details className="attachment-list">
        <summary>첨부 목록 보기 · {files.length}개</summary>
        {fileItems}
      </details>
    ) : fileItems)}
    {files.length > 0 && deck.demo && <p className="hint">데모 모드는 사진·문서를 AI로 분석하지 않습니다. 실제 분석은 AI 모드에서 사용하세요.</p>}
    <p className="hint">첨부 준비는 무료이며, AI로 사진을 읽는 요청에는 이미지 토큰이 사용됩니다.</p>
    {error && <p role="alert" className="attachment-error">{error}</p>}
  </section>;
}
