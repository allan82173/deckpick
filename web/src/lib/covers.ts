import type { SlideSpec } from "./model";
export const coverStyles = ["photo", "white", "type"] as const;
export const coverStyleNames: Record<string, string> = { classic: "기존 단색형", photo: "사진 반반형", white: "화이트 보고서형", type: "큰 제목형" };
export function coverPhotoSrc(data: Record<string, unknown>) {
  return typeof data.photoId === "string" && /^[a-f0-9]{64}$/.test(data.photoId) ? `/api/attachments/${data.photoId}` : data.referencePhoto === "mgrv-space" ? "/cover-assets/mgrv-space.jpg" : undefined;
}
export function coverTitle(topic: string, variant: number) {
  const n = variant % 6;
  return [topic, `${topic}\n핵심 쟁점과 실행 방안`, `${topic}\n비교 근거와 판단`, `${topic}\n의사결정을 위한 검토`, `${topic}\n우선순위와 실행 과제`, `${topic}\n다음 단계의 제안`][n];
}
export function styleCover(slide: SlideSpec, variant: number, topic: string): SlideSpec {
  if (slide.layoutId !== "c-cover") return slide;
  const { photoId, referencePhoto, ...data } = slide.data;
  return { ...slide, data: { ...data, coverStyle: coverStyles[variant % 3], ...(typeof photoId === "string" && /^[a-f0-9]{64}$/.test(photoId) ? { photoId } : {}), ...(referencePhoto ? { referencePhoto } : {}) } };
}
// Explicit local conversion: never modify other slides or silently overwrite saved covers.
export function coverAlternatives(base: SlideSpec, topic: string): SlideSpec[] {
  return coverStyles.map((_, i) => {
    const title = coverTitle(topic, i);
    return styleCover({ ...base, headline: title, data: { ...base.data, title } }, i, topic);
  });
}
