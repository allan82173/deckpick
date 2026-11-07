import {publicDemoOnly,demoUploadNotice} from "./runtime-mode";
import {attachmentSchema,fileLimitBytes,fileLimitMB,type Attachment} from "./attachment-model";
export async function uploadReference(file:File):Promise<Attachment>{
  if(publicDemoOnly)throw Error(demoUploadNotice);
  if(file.size>fileLimitBytes(file.name))throw Error(`개당 ${fileLimitMB(file.name)}MB 이하로 첨부해 주세요.`);
  const extension=({"image/png":"png","image/jpeg":"jpg","image/webp":"webp"} as Record<string,string>)[file.type];
  const normalized=extension&&!/\.(png|jpe?g|webp)$/i.test(file.name)?new File([file],`캡처-${Date.now()}.${extension}`,{type:file.type}):file;
  const body=new FormData();body.append("file",normalized);
  const response=await fetch("/api/attachments",{method:"POST",body});const result=await response.json();
  if(!response.ok)throw Error(typeof result.error==="string"?result.error:"첨부에 실패했습니다.");
  return attachmentSchema.parse(result.attachment);
}
