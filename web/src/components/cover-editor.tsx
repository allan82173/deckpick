"use client";
import {useUiText} from "@/lib/ui-language";

import {uploadReference} from "@/lib/client-upload";
import { useRef, useState } from "react";
import { attachmentSchema } from "@/lib/attachment-model";
import { coverPhotoSrc, coverStyleNames } from "@/lib/covers";
import type { SlideSpec } from "@/lib/model";
import { useStudio } from "./store";
export function CoverEditor({ slide, onChange }: { slide: SlideSpec; onChange: (slide: SlideSpec) => void }) {
  const ui = useUiText();

  const { deck } = useStudio();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const current = useRef(slide); current.current = slide;
  const update = (data: Record<string, unknown>) => onChange({ ...current.current, data: { ...current.current.data, ...data } });
  const src = coverPhotoSrc(slide.data);
  async function upload(file: File) {
    setBusy(true); setError("");
    try {
      const photo=await uploadReference(file);
      if (photo.kind !== "image") throw Error("PNG·JPG·WebP 사진을 선택해 주세요.");
      update({ photoId: photo.id, referencePhoto: undefined, coverStyle: "photo" });
    } catch (e) { setError(e instanceof Error ? e.message : "사진을 넣지 못했습니다."); }
    finally { setBusy(false); }
  }
  return <div className="cover-controls">
    <label>{ui("표지 구성")}<select aria-label={ui("표지 구성")} value={String(slide.data.coverStyle ?? "classic")} onChange={(e) => update({ coverStyle: e.target.value })}>{Object.entries(coverStyleNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    {slide.data.coverStyle === "photo" && <>
      {src && <img src={src} alt={ui("선택한 표지 사진")} width={120} height={80} style={{ objectFit: "cover" }} />}
      <button className="button small" disabled={busy} onClick={() => input.current?.click()}>{busy ? ui("사진 준비 중…") : ui("표지 사진 선택·교체")}</button>
      <input hidden ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
      {(deck?.attachments ?? []).filter((f) => f.kind === "image").map((photo) => <button className="text-button" key={photo.id} onClick={() => update({ photoId: photo.id, referencePhoto: undefined })}>{ui("첨부 사진 사용:")}{photo.name}</button>)}
      <button className="text-button" disabled={!src} onClick={() => update({ photoId: undefined, referencePhoto: undefined })}>{ui("사진 제외")}</button>
      <p className="hint">{ui("사진은 오른쪽 절반을 채우도록 중앙 기준으로 잘라 표시합니다. 표지에 넣는 것만으로 AI 분석 요청은 발생하지 않습니다.")}</p>
      {slide.data.referencePhoto === "mgrv-space" && <a href="https://mangrove.city/" target="_blank" rel="noopener noreferrer">{ui("사진 출처: 맹그로브 공식 홈페이지")}</a>}
    </>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
