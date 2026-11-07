import {notFound} from "next/navigation";
import {PublicExample} from "@/components/public-example";
export const dynamicParams=false;
export function generateStaticParams(){return [{stage:"input"},{stage:"outline"},{stage:"draft"}];}
export default async function ExampleStagePage({params}:{params:Promise<{stage:string}>}){const {stage}=await params;if(stage!=="input"&&stage!=="outline"&&stage!=="draft")notFound();return <PublicExample stage={stage}/>;}
