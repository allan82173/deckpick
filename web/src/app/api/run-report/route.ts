import { isDemoOnly } from "@/lib/runtime-mode";
import { isSameOriginRequest } from "@/lib/request-origin";
import { persistedDeckSchema } from "@/lib/model";
import { saveGenerationReport } from "@/lib/run-report-storage";
import { GENERATION_CONFIG } from "@/lib/generation-config";
export const runtime="nodejs";
export async function POST(request:Request){
 if(isDemoOnly()||!isSameOriginRequest(request))return Response.json({error:"허용되지 않은 요청입니다."},{status:403});
 const text=await request.text();if(Buffer.byteLength(text)>GENERATION_CONFIG.reports.maxRequestBytes)return Response.json({error:"리포트 자료가 너무 큽니다."},{status:413});
 try{const raw=JSON.parse(text),deck=persistedDeckSchema.parse(raw.deck);return Response.json(await saveGenerationReport(deck));}catch{return Response.json({error:"리포트를 저장하지 못했습니다."},{status:400});}
}
