"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {useStudio} from "./store";
import {importLocalSelection,previouslyImportedSelection} from "@/lib/local-selection-import";
export function LocalSelectionLoader({runId}:{runId:string}){
 const {ready,deck,setDeck}=useStudio(),router=useRouter(),latest=useRef(deck);
 const [error,setError]=useState(""),[progress,setProgress]=useState("후보 생성을 기다리고 있습니다.");
 latest.current=deck;
 useEffect(()=>{
  if(!ready)return;
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,cancelDelay:(()=>void)|undefined;
  const delay=()=>new Promise<void>(resolve=>{cancelDelay=resolve;timer=setTimeout(resolve,3000);});
  void(async()=>{
   try{
    const existing=previouslyImportedSelection(localStorage,runId,latest.current);
    let raw:unknown=existing;
    while(!existing&&!controller.signal.aborted){
     const response=await fetch(`/api/local-selection/${encodeURIComponent(runId)}`,{cache:"no-store",signal:controller.signal});
     const value=await response.json();
     if(controller.signal.aborted)return;
     if(response.status===202||response.status===404&&value.code==="PREVIEW_PENDING"){
      setProgress(response.status===202?`전체 ${value.total}장 중 ${value.completed}장의 후보가 준비됐습니다. 모든 장이 준비되면 선택 화면을 엽니다.`:"조사와 발표 흐름을 준비하고 있습니다. 후보가 생성되면 진행 상황을 표시합니다.");
      await delay();continue;
     }
     if(!response.ok)throw Error(typeof value.error==="string"?value.error:"후보를 불러오지 못했습니다.");
     raw=value.deck;break;
    }
    if(controller.signal.aborted)return;
    const next=importLocalSelection(localStorage,runId,raw,latest.current);
    setDeck(next);
    router.replace(`/deck/${encodeURIComponent(next.id)}/pick`);
   }catch(reason){if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"후보를 불러오지 못했습니다.");}
  })();
  return()=>{controller.abort();if(timer)clearTimeout(timer);cancelDelay?.();};
 },[ready,runId,router,setDeck]);
 return <main className="max-w-3xl mx-auto p-8"><h1 className="text-2xl font-bold">디자인 후보 불러오기</h1><p role={error?"alert":"status"} className="mt-4">{error||progress}</p>{error&&<button type="button" className="mt-4 rounded border px-4 py-2" onClick={()=>window.location.reload()}>다시 확인</button>}</main>;
}
