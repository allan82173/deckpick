import {publicDemoOnly,demoUploadNotice} from "./runtime-mode";
import {attachmentSchema,fileLimitBytes,fileLimitMB,type Attachment} from "./attachment-model";
export async function uploadReference(file:File):Promise<Attachment>{
  if(publicDemoOnly)throw Error(demoUploadNotice);
  if(file.size>fileLimitBytes(file.name))throw Error(`개당 ${fileLimitMB(file.name)}MB 이하로 첨부해 주세요.`);
  const extension=({"image/png":"png","image/jpeg":"jpg","image/webp":"webp"} as Record<string,string>)[file.type];
  const normalized=extension&&!/\.(png|jpe?g|webp)$/i.test(file.name)?new File([file],`캡처-${Date.now()}.${extension}`,{type:file.type}):file;
  let response:Response;
  if(process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE==="1"){
    const {upload}=await import("@vercel/blob/client");
    const blob=await upload(`uploads/${crypto.randomUUID()}/${normalized.name.replace(/[\\/]/g,"_")}`,normalized,{access:"private",handleUploadUrl:"/api/attachments/upload",multipart:true});
    response=await fetch("/api/attachments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pathname:blob.pathname,name:normalized.name})});
  }else{const body=new FormData();body.append("file",normalized);response=await fetch("/api/attachments",{method:"POST",body});}
  const result=await response.json();
  if(!response.ok)throw Error(typeof result.error==="string"?result.error:"첨부에 실패했습니다.");
  return attachmentSchema.parse(result.attachment);
}
