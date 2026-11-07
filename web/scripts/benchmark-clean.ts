import { readFile,mkdir,writeFile } from "node:fs/promises";
import {benchmarkGates} from "../src/lib/benchmark-gates";
import { inputUsage } from "../src/lib/usage-estimate";
import { comparableEvidenceCounts } from "../src/lib/context-match";
import { createHash } from "node:crypto";
import {readdir} from "node:fs/promises";
import {exportDeck} from "../src/lib/export";
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
 const hashes:Record<string,string>={};async function hashFiles(dir:string){for(const file of await readdir(dir,{withFileTypes:true})){const p=dir+"/"+file.name;if(file.isDirectory())await hashFiles(p);else if(file.name.endsWith(".ts"))hashes[p]=createHash("sha256").update(await readFile(p)).digest("hex");}}await hashFiles("src/lib");hashes["scripts/benchmark-clean.ts"]=createHash("sha256").update(await readFile("scripts/benchmark-clean.ts")).digest("hex");
 const fingerprint=createHash("sha256").update(JSON.stringify({hashes,input:fixture.input,attachment:fixture.attachment,model:c.model,config:GENERATION_CONFIG})).digest("hex");
 const repeat=process.argv[2]?JSON.parse(await readFile(process.argv[2],"utf8")):undefined;
 if(repeat&&(!repeat.canRepeat||repeat.attemptNumber!==1||repeat.fingerprint!==fingerprint))throw Error("외부 일시 오류 1회에만 같은 코드·조건으로 다시 실행할 수 있습니다.");
 const attemptNumber=repeat?2:1;
 const offline=JSON.parse(await readFile("output/stability-stage3/offline-context.json","utf8"));
 const id="clean-"+randomUUID(),directory="output/stability-clean/"+id;await mkdir(directory,{recursive:true});
 const started=performance.now();let phase="prepare",failure="",failureCategory="";
 const messages:ChatMessage[]=[{role:"user",text:fixture.input.purpose,createdAt:new Date().toISOString()}];
 let deck:Deck={id,input:fixture.input,designSystem:design(fixture.input.designSystemId),research:[],outline:[],chat:{setup:messages,outline:[],slides:{}},candidates:{},picked:{},edited:{},demo:false};
 const progress=async(label:string)=>{console.log(label);await writeFile(directory+"/progress.json",JSON.stringify({id,phase:label,elapsedMs:Math.round(performance.now()-started),completedSlides:Object.keys(deck.candidates).length}));};
 const measured=await withRunContext(id,()=>withExecution(async()=>{
  try{
   await progress(phase);const prepared=await prepareTask(c,fixture.input,fixture.attachment,messages);deck.researchRecord=prepared;
   phase="research";await progress(phase);const researched=await runResearch(c,fixture.input,prepared,fixture.attachment,messages);deck.research=researched.sources;deck.researchRecord=researched.researchRecord;
   // The old comparison explicitly proceeded with recorded gaps. Keep that evaluation policy,
   // while retaining every gap and warning; this is not a production approval bypass.
   phase="storyline";await progress(phase);const story=await createStoryline(c,fixture.input,messages,[],{...researched.researchRecord,acceptedLimits:true,requiresReview:false});deck.outline=story.outlineDraft;deck.researchRecord=story.researchRecord;
   phase="candidates";await progress(phase);const outcomes=await mapConcurrent(deck.outline,async item=>{
    const slides=await generateCandidates(c,fixture.input,item,deck.research,"동일 입력 안정화·전달량 측정",[],true,deck.outline,fixture.attachment,0,[],[],undefined,deck.researchRecord?.evidence,deck.outline.slice(0,item.index).map(previous=>candidatePlan(fixture.input,previous)[0]),{record:deck.researchRecord});
    deck.candidates[item.index]=slides;deck.picked[item.index]=0;await progress(`candidates ${Object.keys(deck.candidates).length}/${deck.outline.length}`);return item.index;
   });const errors=outcomes.filter(o=>o.status==="rejected");if(errors.length){failureCategory=errors.every(o=>o.status==="rejected"&&o.reason?.failureCategory==="transient")?"transient":"validation";throw Error(errors.map(o=>o.status==="rejected"?(o.reason instanceof Error?o.reason.message:String(o.reason)):"").join(" / "));}
   phase="review";await progress(phase);const reviewed=await reviewAndRepairDeck(c,deck);for(const replacement of reviewed.replacements)deck.candidates[replacement.index][0]=replacement.slide;deck.review=reviewed.review;
   if(reviewed.review.status==="incomplete"){failure="덱 검토 미완료";failureCategory="deadline";}
  }catch(error){failure=error instanceof Error?error.message:"알 수 없는 실패";if(!failureCategory)failureCategory=error instanceof Error&&"failureCategory" in error?String(error.failureCategory):"validation-or-deadline";}
  deck.generation=await runState(failure?(deck.review?.status==="incomplete"?"incomplete":"failed"):"complete",failure||undefined);
 }),{fresh:true});
 deck.execution=measured.execution;const durationMs=Math.round(performance.now()-started);
 const report=await saveGenerationReport(deck);const attempt=await saveAttemptReport(deck,"stability-clean",failure?504:200,failure||undefined);
 const calls=deck.execution.calls,usage=inputUsage(calls),inputTokens=usage.total,outputTokens=calls.reduce((n,c)=>n+(c.outputTokens??0),0),missingUsageCalls=usage.estimatedCalls+usage.unestimatedCalls;
 const maximumInput=baseline.metrics.inputTokens*GENERATION_CONFIG.benchmark.maxInputRatioToBaseline;
 const reduction=1-durationMs/baseline.durationMs;
 const evidenceComparison={baselineRecorded:offline.original,baselineReclassified:offline.reclassified,current:comparableEvidenceCounts(deck.researchRecord?.evidence??[])};
 const metrics={id,attemptNumber,fingerprint,repeatOf:repeat?.id,canRepeat:!!failure&&failureCategory==="transient"&&attemptNumber===1,failureCategory,usage,evidenceComparison,model:c.model,completed:!failure,phase,failure,durationMs,calls:calls.length,inputTokens,outputTokens,missingUsageCalls,baseline:{durationMs:baseline.durationMs,inputTokens:baseline.metrics.inputTokens,calls:baseline.calls.length},target:{maxDurationMs:GENERATION_CONFIG.benchmark.maxDurationMs,maxInputTokens:maximumInput},gates:benchmarkGates(durationMs,{durationMs:baseline.durationMs,inputTokens:baseline.metrics.inputTokens},usage,!failure),evidenceCounts:deck.researchRecord?.evidenceCounts,evidenceScopeComparison:deck.execution.evidenceScopes?.filter(s=>s.stage==="candidates").map(s=>({slide:s.slideIndex===undefined?null:s.slideIndex+1,before:s.availableRows,after:s.sentRows,attachments:s.attachmentRows,refs:s.evidenceIds})),report:report.paths,attempt,paidRuns:1,costNotice:"금액은 응답에 없어 확정하지 않습니다. 미반환 입력은 요청 길이 추정치를 포함해 판정하며 실제 과금·도구 내부 문맥과 다를 수 있습니다.",deck};
 await writeFile(directory+"/result.json",JSON.stringify(metrics,null,2),{mode:0o600});
 await writeFile(directory+"/measurement.md",`# 3차 개선 2단계 · 최소 유료 측정\n\n실행: ${id}\n\n상태: ${failure?"미통과 — "+failure:"완료"}\n\n|항목|이전 C|이번|\n|---|---:|---:|\n|경과 분|${(baseline.durationMs/60000).toFixed(2)}|${(durationMs/60000).toFixed(2)}|\n|호출|${baseline.calls.length}|${calls.length}|\n|확인된 입력 토큰|${baseline.metrics.inputTokens}|${inputTokens}|\n|사용량 미반환 호출|기존 기록 참조|${missingUsageCalls}|\n\n완료 기준: ${JSON.stringify(metrics.gates)}\n\n같은 입력과 기존 비교의 제한 근거 진행 정책을 썼습니다. 조사 결과는 고정하지 않았으므로 품질 또는 effort의 인과 효과를 주장하지 않습니다. 실패나 미완료를 성공으로 바꾸지 않았습니다.\n\n## 장별 공개 근거 전달 범위\n\n${JSON.stringify(metrics.evidenceScopeComparison,null,2)}\n\n${metrics.costNotice}\n`);
 await writeFile(directory+"/conditions.json",JSON.stringify({fingerprint,hashes,config:GENERATION_CONFIG,model:c.model,input:fixture.input},null,2));
 await writeFile(directory+"/measurement.md",`# 깨끗한 시장 진입 테스트 · 개정 기준\n\n실행 ${id}, 시도 ${attemptNumber} (이전 실행·캐시·재개 합산 없음)\n\n판정: ${JSON.stringify(metrics.gates)}\n\n시간: ${(durationMs/60000).toFixed(2)}분 / 이전 C ${(baseline.durationMs/60000).toFixed(2)}분, 단축률 ${(reduction*100).toFixed(1)}%\n\n호출 ${calls.length}, 입력 ${inputTokens} (${usage.label}), 출력 확인값 ${outputTokens}\n\n${JSON.stringify(usage,null,2)}\n\n## 같은 맥락 기준·원문 대조 비교\n\n${JSON.stringify(evidenceComparison,null,2)}\n\n기존 C의 최대 조사 라운드는 3, 이번은 ${GENERATION_CONFIG.research.roundsPerQuestion}다. 검색 결과·모델 출력이 고정되지 않아 라운드 수의 인과 효과를 단정하지 않는다. 기록 행·서로 다른 주장·독립 URL을 분리해 비교한다. 기존 부분 일치 0은 당시 구분값 부재이며 새 기준 재판정 열을 함께 제공한다.\n\n실패: ${failure||"없음"} / ${failureCategory||"없음"}\n\n${metrics.costNotice}\n`);
 console.log(JSON.stringify({...metrics,deck:undefined}));
 if(!failure){const pptx=await exportDeck(deck,false);await pptx.writeFile({fileName:directory+"/result.pptx"});}
 for(const item of deck.outline){const slide=deck.candidates[item.index]?.[0];if(slide)try{await writeFile(`${directory}/slide-${item.index+1}.png`,await renderSlidePng(slide,deck.designSystem,item.index+1,deck.input.topic,deck.outline.map(s=>s.section)));}catch(error){console.log(`offline render ${item.index+1}: ${error instanceof Error?error.message:"failed"}`);}}
}
void main().catch(error=>{console.error(error instanceof Error?error.message:"실패");process.exitCode=1;});
