import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {LocalSelectionLoader} from "@/components/local-selection-loader";
import {localSelectionEnabled,validSelectionRunId} from "@/lib/local-selection-access";
export const dynamic="force-dynamic";
export default async function LocalSelectionPage({params}:{params:Promise<{runId:string}>}){
 if(!localSelectionEnabled())notFound();
 const {runId}=await params,host=(await headers()).get("host")??"";
 let local=false;try{local=["localhost","127.0.0.1","[::1]"].includes(new URL(`http://${host}`).hostname);}catch{}
 if(!local||!validSelectionRunId(runId))notFound();
 return <LocalSelectionLoader runId={runId}/>;
}
