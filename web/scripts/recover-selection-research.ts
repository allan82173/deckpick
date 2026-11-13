/** Re-read discovered public URLs through the app; preserve initial failure records. */
import {readFile,writeFile,readdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {runQuestionResearch,type QuestionResult} from "../src/lib/research-questions";
import {withExecution,executionSnapshot} from "../src/lib/execution-scope";
import {mergeExecution} from "../src/lib/execution-model";
import {withRunContext} from "../src/lib/run-checkpoints";
import {cliOnlyRequested,localAgentStatus} from "../src/lib/local-agent";
import {deckInputSchema,type Source} from "../src/lib/model";
import {saveGenerationReport} from "../src/lib/run-report-storage";

// Domain grouping is a source-order heuristic only, never an identity or access check.
function diverse(sources:Source[]){const groups=new Map<string,Source[]>();for(const s of sources){const key=new URL(s.url).hostname.split(".").slice(-2).join(".");groups.set(key,[...(groups.get(key)??[]),s]);}const lists=[...groups.values()],out:Source[]=[];for(let i=0;i<Math.max(0,...lists.map(l=>l.length));i++)for(const list of lists)if(list[i])out.push(list[i]);return out;}
async function main(){
 const runId=process.argv[2],questionId=process.argv[3];if(!runId||!/^[a-zA-Z0-9_-]{1,96}$/.test(runId))throw Error("safe run ID required");
 if(!cliOnlyRequested()||!localAgentStatus("codex").subscriptionReady)throw Error("구독 로그인 필요 · API 사용 없음");
 const dir=path.resolve("output",runId),file=path.join(dir,"progress.json"),progress=JSON.parse(await readFile(file,"utf8")),deck=progress.deck;
 const config=JSON.parse(await readFile(path.join(dir,"input.json"),"utf8"));
 if(JSON.stringify(deckInputSchema.parse(config.input))!==JSON.stringify(deck.input))throw Error("Recovery input differs");
 const before=await readFile(file,"utf8");await writeFile(path.join(dir,`progress-before-source-recovery-${Date.now()}.json`),before);
 const checkpointDir=path.resolve(".generation-runs",createHash("sha256").update(JSON.stringify(runId)).digest("hex"));
 const seeds:Record<string,QuestionResult>={},latest:Record<string,string>={};
 for(const name of await readdir(checkpointDir)){
  if(!name.endsWith(".checkpoint.json"))continue;const value=JSON.parse(await readFile(path.join(checkpointDir,name),"utf8"));
  if(!/^research-question:/.test(value.stage)||!value.result?.sources?.length)continue;
  const q=value.stage.slice("research-question:".length),old=value.result;
  if(questionId&&q!==questionId)continue;
  if((latest[q]??"")>=value.updatedAt)continue;latest[q]=value.updatedAt;
  if(!deck.researchRecord.analysis.questions.some((item:{id:string})=>item.id===q))continue;
  const plan=deck.researchRecord.plan.questions.find((p:{questionId:string})=>p.questionId===q);
  const terms=[...new Set((plan?.focusQueries??[]).join(" ").match(/[A-Za-z][A-Za-z-]{2,}/g)??[])].map(v=>String(v).toLowerCase());
  const ordered=diverse(old.sources),score=(s:Source)=>terms.filter(t=>(s.title+" "+s.url).toLowerCase().includes(t)).length;
  if(questionId)ordered.sort((a,b)=>score(b)-score(a));
  seeds[q]={sources:ordered,queries:old.queries,evidence:[],pages:[],rounds:[],rejectedRows:[],warnings:[],complete:true};
 }
 if(!Object.keys(seeds).length)throw Error("No same-run discovered source cache");
 const c={provider:"anthropic" as const,key:"",model:"gpt-6.1-sol",localAgent:"codex" as const,language:"ko" as const},prior=deck.execution;
 await withExecution(()=>withRunContext(runId,async()=>{
  try{console.log(`Re-reading sources for ${Object.keys(seeds).join(", ")}; no repeated initial searches`);
   const priorComplete=deck.researchRecord.researchComplete;
   const result=await runQuestionResearch(c,deck.input,deck.researchRecord,{seedResults:seeds,questionId});deck.researchRecord={...result.researchRecord,researchComplete:questionId?priorComplete:result.researchRecord.researchComplete};deck.research=[...new Map([...deck.research,...result.sources].map((s:Source)=>[s.url,s])).values()];progress.stage="source-recovery-complete";progress.status="running";
  }catch(error){progress.stage="source-recovery-failed";progress.status="failed";await writeFile(path.join(dir,`source-recovery-failure-${Date.now()}.json`),JSON.stringify({error:error instanceof Error?error.message:String(error),apiKeyUsed:false}));throw error;}
  finally{const snapshot=executionSnapshot();if(snapshot)deck.execution=mergeExecution(prior,snapshot);await writeFile(file,JSON.stringify(progress,null,2));await saveGenerationReport(deck);}
 }));
 console.log(JSON.stringify({stage:progress.stage,evidence:deck.researchRecord.evidence.length,publicSources:deck.researchRecord.evidence.filter((e:{kind:string})=>e.kind==="공개 사실").length,calls:deck.execution.calls.length}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
