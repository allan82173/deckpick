/** Actual DeckPick pipeline; CLI subscription only; stop before review/export. */
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {prepareTask,runResearch,createStoryline} from "../src/lib/research-pipeline";
import {generateCandidates} from "../src/lib/ai";
import {withExecution,executionSnapshot} from "../src/lib/execution-scope";
import {withRunContext} from "../src/lib/run-checkpoints";
import {localAgentStatus,cliOnlyRequested} from "../src/lib/local-agent";
import {design} from "../src/lib/design";
import {persistedDeckSchema,deckInputSchema,outlineItemSchema,type Deck} from "../src/lib/model";
import {saveGenerationReport} from "../src/lib/run-report-storage";

async function main(){
 const [inputPath,runId]=process.argv.slice(2);
 if(!inputPath||!runId||!/^[a-zA-Z0-9_-]{1,100}$/.test(runId))throw Error("input JSON path and safe run ID required");
 if(!cliOnlyRequested()||!localAgentStatus("codex").subscriptionReady)throw Error("구독 로그인 필요 · API로 전환하지 않습니다.");
 const config=JSON.parse(await readFile(inputPath,"utf8")),input=deckInputSchema.parse(config.input);
 const dir=path.resolve("output",runId),previewDir=path.resolve(".generation-runs/selection-previews");
 await mkdir(dir,{recursive:true});await mkdir(previewDir,{recursive:true});
 const old=await readFile(path.join(dir,"progress.json"),"utf8").then(JSON.parse).catch(()=>null);
 if(old&&JSON.stringify(old.deck.input)!==JSON.stringify(input))throw Error("실행 ID의 입력이 다릅니다. 다른 ID를 사용하세요.");
 let deck:Deck=old?.deck??{id:crypto.randomUUID(),input,designSystem:design(input.designSystemId),outline:[],research:[],candidates:{},picked:{},edited:{},chat:{setup:[],outline:[],slides:{}},demo:false};
 const c={provider:"anthropic" as const,key:"",model:"gpt-6.1-sol",localAgent:"codex" as const,language:"ko" as const};
 let stage=old?.stage??"start",status="running";
 const save=async()=>{
  const execution=executionSnapshot();if(execution)deck.execution=execution;
  const progress={runId,stage,status,apiKeyUsed:false,exported:false,reviewDeferredUntilSelection:true,deck};
  await writeFile(path.join(dir,"progress.json"),JSON.stringify(progress,null,2));
  const file=path.join(previewDir,runId+".json"),temp=file+".tmp";
  await writeFile(temp,JSON.stringify(deck));await rename(temp,file);
  await writeFile(path.join(dir,"status.json"),JSON.stringify({runId,stage,status,ready:deck.outline.filter(o=>deck.candidates[o.index]?.length).length,total:input.slideCount,calls:execution?.calls.length??0,updatedAt:new Date().toISOString()}));
 };
 await withExecution(()=>withRunContext(runId,async()=>{
  try{
   if(!deck.researchRecord?.analysis){stage="task-and-research-plan";console.log(stage);await save();deck.researchRecord=await prepareTask(c,input,config.context??"",[]);await save();}
   if(!deck.researchRecord?.coverage){stage="public-research";console.log(stage);await save();const r=await runResearch(c,input,deck.researchRecord!,config.context??"",[]);deck.researchRecord=r.researchRecord;deck.research=r.sources;await save();}
   if(deck.researchRecord?.requiresReview){status="needs-evidence-decision";await save();throw Error("공개 근거 확인이 필요합니다. 사용자 확인 없이 근거 한계를 수용하지 않았습니다.");}
   if(!deck.outline.length){stage="judgment-and-storyline";console.log(stage);await save();const story=await createStoryline(c,input,[],[],deck.researchRecord!);deck.outline=story.outlineDraft.map(o=>outlineItemSchema.parse(o));deck.researchRecord=story.researchRecord;await save();}
   if(deck.outline.length!==input.slideCount)throw Error(`요청 ${input.slideCount}장과 실제 구성 ${deck.outline.length}장 불일치`);
   for(const item of deck.outline){
    const i=item.index;if(deck.candidates[i]?.length)continue;
    stage=`slide-${i+1}-of-${input.slideCount}`;console.log(stage);await save();
    const previous=deck.outline.slice(0,i).map(o=>deck.candidates[o.index]?.[0]?.layoutId??"");
    const candidates=await generateCandidates(c,input,item,deck.research,"모든 후보는 실제 내용이 채워진 독립 초안입니다. 키메시지를 본문 근거로 증명하고 적합한 다른 가시화와 비교해 구성하세요. 같은 내용을 추상적 상자에 반복하거나 수량 없는 순위를 막대로 표현하지 마세요. 숫자·기간·조건·가정과 실제 확인을 보존하세요. 제목·본문·시각화가 같은 판단을 전달해야 합니다.",[],false,deck.outline,"",0,[],[],undefined,deck.researchRecord?.evidence,previous,{record:deck.researchRecord,visualReviewTiming:"after-selection"});
    if(!candidates.length)throw Error(`${i+1}장 유효 후보 없음`);
    deck.candidates[i]=candidates;deck.picked[i]=0;deck.outline[i]={...item,acceptedCandidateCount:candidates.length,contentContract:candidates[0].contentContract??item.contentContract};
    await save();console.log(`${stage} ready choices=${candidates.length}`);
   }
   stage="awaiting-user-selection";status="selection-ready";persistedDeckSchema.parse(deck);await save();
   const report=await saveGenerationReport(deck);await writeFile(path.join(dir,"generation-report.md"),report.markdown);await writeFile(path.join(dir,"generation-report.json"),report.json);
   console.log(JSON.stringify({runId,stage,slides:deck.outline.length,candidates:deck.outline.map(o=>deck.candidates[o.index].length),calls:deck.execution?.calls.length,apiCalls:deck.execution?.calls.filter(c=>c.transport!=="cli").length??0,selectionUrl:`http://127.0.0.1:3100/local-selection/${runId}`,exported:false}));
  }catch(e){if(status==="running")status="failed";await save();await writeFile(path.join(dir,`failure-${Date.now()}.json`),JSON.stringify({stage,status,error:e instanceof Error?e.message:String(e),apiKeyUsed:false}));await saveGenerationReport(deck);throw e;}
 }));
}
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
