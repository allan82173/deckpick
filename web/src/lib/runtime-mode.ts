export const sharedPreview = process.env.NEXT_PUBLIC_SHARED_PREVIEW === "1";
export const publicDemoOnly = process.env.NEXT_PUBLIC_DEMO_ONLY === "1" || process.env.NEXT_PUBLIC_SHARED_PREVIEW === "1";
export function isDemoOnly(){return process.env.NEXT_PUBLIC_DEMO_ONLY === "1" || process.env.NEXT_PUBLIC_SHARED_PREVIEW === "1";}
export const demoUploadNotice = "공개 데모에서는 파일 첨부를 지원하지 않습니다. 예시 슬라이드 선택·직접 편집·PPTX 다운로드를 이용해 주세요.";

export function isShowcaseOnly(){return process.env.NEXT_PUBLIC_SHOWCASE_ONLY === "1";}
