import { readFile,mkdir,writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { prepareTask,runResearch,createStoryline } from "../src/lib/research-pipeline";
import { generateCandidates } from "../src/lib/ai";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { candidatePlan } from "../src/lib/candidate-plan";
import { mapConcurrent } from "../src/lib/concurrency";
import { mergeExecution } from "../src/lib/execution-model";
import { withExecution } from "../src/lib/execution-scope";
import { withRunContext,runState } from "../src/lib/run-checkpoints";
import { saveGenerationReport } from "../src/lib/run-report-storage";
import { saveAttemptReport } from "../src/lib/run-attempt-report";
import { renderSlidePng } from "../src/lib/visual-review";
import { design } from "../src/lib/design";
import { GENERATION_CONFIG } from "../src/lib/generation-config";
import type { Deck,DeckInput,ChatMessage } from "../src/lib/model";

async function main(){
 const fixture=(JSON.parse(await readFile("tests/fixtures/general-decks.json","utf8")) as {id:string;input:DeckInput;attachment:string}[]).find(f=>f.id==="market-entry")!;
 const baseline=JSON.parse(await readFile("output/quality-execution/C/market-entry.json","utf8"));
 const key=process.env.OPENAI_API_KEY;if(!key)throw Error("로컬 키가 설정되지 않았습니다.");
 const c={provider:"openai" as const,key,model:process.env.OPENAI_MODEL??"gpt-6-luna"};
 if(c.model!=="gpt-6-luna")throw Error("현재 Luna 설정을 유지해야 합니다. 실행하지 않았습니다.");
 const id="stability-"+randomUUID(),directory="output/stabilization/"+id;await mkdir(directory,{recursive:true});
 const previous=process.argv[2]?JSON.parse(await readFile(process.argv[2],"utf8")) as {deck:Deck;durationMs:number;paidRuns:number}:undefined;
 const runId=previous?.deck.generation?.runId??id;
 const started=performance.now();let phase="prepare",failure="";
 const messages:ChatMessage[]=previous?.deck.chat.setup??[{role:"user",text:fixture.input.purpose,createdAt:new Date().toISOString()}];
 let deck:Deck={id,input:fixture.input,designSystem:design(fixture.input.designSystemId),research:[],outline:[],chat:{setup:messages,outline:[],slides:{}},candidates:{},picked:{},edited:{},demo:false};
 const progress=async(label:string)=>{console.log(label);await writeFile(directory+"/progress.json",JSON.stringify({id,phase:label,elapsedMs:Math.round(performance.now()-started),completedSlides:Object.keys(deck.candidates).length}));};
 const measured=await withRunContext(runId,()=>withExecution(async()=>{
  try{
   await progress(phase);const prepared=await prepareTask(c,fixture.input,fixture.attachment,messages);deck.researchRecord=prepared;
   phase="research";await progress(phase);const researched=await runResearch(c,fixture.input,prepared,fixture.attachment,messages);deck.research=researched.sources;deck.researchRecord=researched.researchRecord;
   // The old comparison explicitly proceeded with recorded gaps. Keep that evaluation policy,
   // while retaining every gap and warning; this is not a production approval bypass.
   phase="storyline";await progress(phase);const story=await createStoryline(c,fixture.input,messages,[],{...researched.researchRecord,acceptedLimits:true,requiresReview:false});deck.outline=story.outlineDraft;deck.researchRecord=story.researchRecord;
   phase="candidates";await progress(phase);const outcomes=await mapConcurrent(deck.outline,async item=>{
    const slides=await generateCandidates(c,fixture.input,item,deck.research,"동일 입력 안정화·전달량 측정",[],true,deck.outline,fixture.attachment,0,[],[],undefined,deck.researchRecord?.evidence,deck.outline.slice(0,item.index).map(previous=>candidatePlan(fixture.input,previous)[0]),{record:deck.researchRecord});
    deck.candidates[item.index]=slides;deck.picked[item.index]=0;await progress(`candidates ${Object.keys(deck.candidates).length}/${deck.outline.length}`);return item.index;
   });const errors=outcomes.filter(o=>o.status==="rejected");if(errors.length)throw Error(errors.map(o=>o.status==="rejected"?(o.reason instanceof Error?o.reason.message:String(o.reason)):"").join(" / "));
   phase="review";await progress(phase);const reviewed=await reviewAndRepairDeck(c,deck);for(const replacement of reviewed.replacements)deck.candidates[replacement.index][0]=replacement.slide;deck.review=reviewed.review;
   if(reviewed.review.status==="incomplete")failure="덱 검토 미완료";
  }catch(error){failure=error instanceof Error?error.message:"알 수 없는 실패";}
  deck.generation=await runState(failure?(deck.review?.status==="incomplete"?"incomplete":"failed"):"complete",failure||undefined);
 }));
 deck.execution=mergeExecution(previous?.deck.execution,measured.execution);const attemptDurationMs=Math.round(performance.now()-started),durationMs=attemptDurationMs+(previous?.durationMs??0);
 const report=await saveGenerationReport(deck);const attempt=await saveAttemptReport(deck,"stability-stage2",failure?504:200,failure||undefined);
 const calls=deck.execution.calls,known=calls.filter(c=>c.inputTokens!==undefined),inputTokens=known.reduce((sum,c)=>sum+c.inputTokens!,0),outputTokens=calls.reduce((sum,c)=>sum+(c.outputTokens??0),0),missingUsageCalls=calls.filter(c=>c.inputTokens===undefined||c.outputTokens===undefined).length;
 const maximumInput=baseline.metrics.inputTokens*GENERATION_CONFIG.benchmark.maxInputRatioToBaseline;
 const metrics={id,resumedFrom:previous?.deck.id,attemptDurationMs,model:c.model,completed:!failure,phase,failure,durationMs,calls:calls.length,inputTokens,outputTokens,missingUsageCalls,baseline:{durationMs:baseline.durationMs,inputTokens:baseline.metrics.inputTokens,calls:baseline.calls.length},target:{maxDurationMs:GENERATION_CONFIG.benchmark.maxDurationMs,maxInputTokens:maximumInput},gates:{completion:!failure,time:durationMs<=GENERATION_CONFIG.benchmark.maxDurationMs,input:missingUsageCalls===0&&inputTokens<=maximumInput},evidenceCounts:deck.researchRecord?.evidenceCounts,evidenceScopeComparison:deck.execution.evidenceScopes?.filter(s=>s.stage==="candidates").map(s=>({slide:s.slideIndex===undefined?null:s.slideIndex+1,before:s.availableRows,after:s.sentRows,attachments:s.attachmentRows,refs:s.evidenceIds})),report:report.paths,attempt,paidRuns:1+(previous?.paidRuns??0),costNotice:"금액은 제공자 응답에 없으므로 추정하지 않습니다. 토큰은 반환된 값만 합산합니다. 미반환 사용량은 0이 아닙니다.",deck};
 await writeFile(directory+"/result.json",JSON.stringify(metrics,null,2),{mode:0o600});
 await writeFile(directory+"/measurement.md",`# 3차 개선 2단계 · 최소 유료 측정\n\n실행: ${id}\n\n상태: ${failure?"미통과 — "+failure:"완료"}\n\n|항목|이전 C|이번|\n|---|---:|---:|\n|경과 분|${(baseline.durationMs/60000).toFixed(2)}|${(durationMs/60000).toFixed(2)}|\n|호출|${baseline.calls.length}|${calls.length}|\n|확인된 입력 토큰|${baseline.metrics.inputTokens}|${inputTokens}|\n|사용량 미반환 호출|기존 기록 참조|${missingUsageCalls}|\n\n완료 기준: ${JSON.stringify(metrics.gates)}\n\n같은 입력과 기존 비교의 제한 근거 진행 정책을 썼습니다. 조사 결과는 고정하지 않았으므로 품질 또는 effort의 인과 효과를 주장하지 않습니다. 실패나 미완료를 성공으로 바꾸지 않았습니다.\n\n## 장별 공개 근거 전달 범위\n\n${JSON.stringify(metrics.evidenceScopeComparison,null,2)}\n\n${metrics.costNotice}\n`);
 console.log(JSON.stringify({...metrics,deck:undefined}));
 for(const item of deck.outline){const slide=deck.candidates[item.index]?.[0];if(slide)try{await writeFile(`${directory}/slide-${item.index+1}.png`,await renderSlidePng(slide,deck.designSystem,item.index+1,deck.input.topic,deck.outline.map(s=>s.section)));}catch(error){console.log(`offline render ${item.index+1}: ${error instanceof Error?error.message:"failed"}`);}}
}
void main().catch(error=>{console.error(error instanceof Error?error.message:"실패");process.exitCode=1;});
