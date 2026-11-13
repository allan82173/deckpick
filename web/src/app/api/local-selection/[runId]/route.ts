import {selectionPreviewResponse,selectionSaveResponse} from "@/lib/local-selection-access";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{runId:string}>}){
 return selectionPreviewResponse(request,(await params).runId);
}
export async function POST(request:Request,{params}:{params:Promise<{runId:string}>}){
 return selectionSaveResponse(request,(await params).runId);
}
