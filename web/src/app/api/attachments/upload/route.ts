import {handleUpload,type HandleUploadBody} from "@vercel/blob/client";
import {isSameOriginRequest} from "@/lib/request-origin";
import {fileLimitBytes,FILE_ACCEPT} from "@/lib/attachment-model";
export const runtime="nodejs";
export async function POST(request:Request){
 if(process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE!=="1"||!isSameOriginRequest(request))return Response.json({error:"허용되지 않은 요청입니다."},{status:403});
 try{const body=await request.json() as HandleUploadBody;
 const result=await handleUpload({request,body,onBeforeGenerateToken:async(pathname)=>{
  if(!/^uploads\/[a-f0-9-]{36}\//.test(pathname))throw Error("잘못된 업로드 위치입니다.");
  const name=pathname.split("/").at(-1)!;if(!FILE_ACCEPT.split(",").some(ext=>name.toLowerCase().endsWith(ext)))throw Error("지원하지 않는 파일입니다.");
  return {maximumSizeInBytes:fileLimitBytes(name),addRandomSuffix:true,allowOverwrite:false};
 }});return Response.json(result);
 }catch{return Response.json({error:"업로드 준비에 실패했습니다."},{status:400});}
}
