"use client";
import { useEffect,useState,useRef } from "react";
import type { Deck } from "@/lib/model";
import { generationReport,reportMarkdown,reportFileDate } from "@/lib/run-report";
import { FileText } from "lucide-react";
import { publicDemoOnly } from "@/lib/runtime-mode";
import { GENERATION_CONFIG } from "@/lib/generation-config";
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function GenerationReportButton({deck}:{deck:Deck}){
 const [status,setStatus]=useState(""),[formatsOpen,setFormatsOpen]=useState(false);const saved=useRef("");
 const complete=deck.outline.length>0&&deck.outline.every((_,i)=>!!(deck.edited[i]??deck.candidates[i]?.[deck.picked[i]]));
 const signature=JSON.stringify([deck.id,deck.execution?.updatedAt,deck.generation,deck.review,deck.picked,deck.edited,deck.candidates]);
 useEffect(()=>{if(!complete||saved.current===signature||publicDemoOnly)return;const controller=new AbortController();const timer=setTimeout(()=>{
  void fetch("/api/run-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deck}),signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("리포트 자동 저장 실패");saved.current=signature;setStatus("생성 리포트 자동 저장됨");}).catch(e=>{if(e.name!=="AbortError")setStatus("자동 저장 실패 · 다운로드로 보관할 수 있습니다.");});
 },700);return()=>{clearTimeout(timer);controller.abort();};},[signature,complete,deck]);
 function downloadFormat(format:"md"|"json"){const report=generationReport(deck);const base=reportFileDate(report.generatedAt)+"_"+report.topic.replace(/[<>:"/\\|?*]/g,"_").slice(0,GENERATION_CONFIG.reports.topicCharacters);download(base+"."+format,format==="md"?reportMarkdown(report):JSON.stringify(report,null,2),format==="md"?"text/markdown;charset=utf-8":"application/json;charset=utf-8");}
 return <div className="generation-report-control"><button className="button" disabled={!complete} aria-expanded={formatsOpen} onClick={()=>setFormatsOpen(open=>!open)}><FileText size={16}/> 생성 리포트 다운로드</button>{formatsOpen&&<div className="generation-report-formats" aria-label="리포트 파일 형식"><button className="button" onClick={()=>downloadFormat("md")}>Markdown (.md)</button><button className="button" onClick={()=>downloadFormat("json")}>JSON (.json)</button></div>}<small role="status">{status||"Markdown + JSON · 비공개 조건 값 제외"}</small></div>;
}
