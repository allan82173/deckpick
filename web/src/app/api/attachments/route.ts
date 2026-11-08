import {get} from "@vercel/blob";
import {isDemoOnly} from "@/lib/runtime-mode";
import {isSameOriginRequest} from "@/lib/request-origin";
import { storeAttachment } from "@/lib/attachments";
import { MAX_FILE_BYTES, fileLimitBytes, fileLimitMB } from "@/lib/attachment-model";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    if (isDemoOnly()) return Response.json({error:"공개 데모에서는 AI 호출·파일 첨부를 지원하지 않습니다."},{status:403});
    if (!isSameOriginRequest(request)) return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
    if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES + 65536) return Response.json({ error: "PDF는 30MB 이하, 그 외 파일은 10MB 이하로 첨부해 주세요." }, { status: 413 });
    let file:unknown;
    if(request.headers.get("content-type")?.includes("application/json")&&process.env.VERCEL==="1"){
      const body=await request.json();
      if(typeof body.pathname!=="string"||!/^uploads\/[a-f0-9-]{36}\//.test(body.pathname)||typeof body.name!=="string"||body.name.length>180)return Response.json({error:"업로드한 파일을 확인해 주세요."},{status:400});
      const blob=await get(body.pathname,{access:"private",useCache:false});
      if(!blob||blob.statusCode!==200||blob.blob.size>fileLimitBytes(body.name))return Response.json({error:"업로드한 파일의 크기를 확인해 주세요."},{status:400});
      file=new File([await new Response(blob.stream).arrayBuffer()],body.name);
    }else{const data=await request.formData();file=data.get("file");}
    if (!(file instanceof File)) return Response.json({ error: "파일 한 개를 첨부해 주세요." }, { status: 400 });
    if (file.size > fileLimitBytes(file.name)) return Response.json({ error: `파일은 ${fileLimitMB(file.name)}MB 이하로 첨부해 주세요.` }, { status: 413 });
    return Response.json({ attachment: await storeAttachment(file) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error && !/password|worker|pdfjs|unexpected|invalid|ENOENT/i.test(error.message) ? error.message.slice(0, 200) : "파일을 읽지 못했습니다. 암호·형식을 확인하거나 텍스트 파일로 변환해 주세요." }, { status: 400 });
  }
}
