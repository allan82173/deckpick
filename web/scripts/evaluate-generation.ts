import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { Deck, DeckInput, ChatMessage, SlideSpec } from "../src/lib/model";
import { design } from "../src/lib/design";
async function main(){
const profile=process.argv[2]??"A";
if(!["A","B","C"].includes(profile))throw Error("Use A, B or C");
const root=profile==="C"?"src/lib":profile==="B"?"output/quality-execution/baseline-b/lib":"output/quality-execution/baseline/lib";
async function load(name:string){return import(pathToFileURL(path.resolve(root,name+".ts")).href);}
const ai=await load("ai"),pipeline=await load("research-pipeline"),reviewer=await load("deck-review");
const fixtures=JSON.parse(await readFile("tests/fixtures/general-decks.json","utf8")) as {id:string;category:string;input:DeckInput;attachment:string}[];
const directory=`output/quality-execution/${profile}`;await mkdir(directory,{recursive:true});
const nativeFetch=globalThis.fetch;
type Usage={stage:string;durationMs:number;status:number;input?:number;output?:number;total?:number;effort?:string;maxOutput?:number};
let calls:Usage[]=[];
let currentFixture="";
function oldStage(body:Record<string,unknown>){const text=String(body.instructions??body.system??"");return text.includes("과제 해석자")?"interpretTask":text.includes("잠정 판단을 만")?"judgment":text.includes("주장 지도")?"story":text.includes("처음 읽는 검토자")?"assessDeck":text.includes("조사 계획")?"planResearch":text.includes("근거표")?"evidence":body.tools?"research":"candidates";}
globalThis.fetch=async(input,init)=>{
  const url=String(input);if(!url.includes("api.openai.com")&&!url.includes("api.anthropic.com"))return nativeFetch(input,init);
  const body=JSON.parse(String(init?.body??"{}")) as Record<string,unknown>;
  const stage=oldStage(body);

  const started=performance.now();const response=await nativeFetch(input,{...init,body:JSON.stringify(body)});
  const data=await response.clone().json().catch(()=>({}));
  calls.push({stage,durationMs:Math.round(performance.now()-started),status:response.status,input:data.usage?.input_tokens,output:data.usage?.output_tokens,total:data.usage?.total_tokens,effort:(body.reasoning as {effort?:string})?.effort,maxOutput:body.max_output_tokens as number|undefined});
  if(currentFixture)await writeFile(`${directory}/${currentFixture}.progress`,JSON.stringify({profile,id:currentFixture,updatedAt:new Date().toISOString(),calls}));
  return response;
};
const key=process.env.OPENAI_API_KEY;if(!key)throw Error("Local API key missing; no secret was printed.");
const c={provider:"openai" as const,key,model:process.env.OPENAI_MODEL??"gpt-6-luna"};
for(const f of fixtures){
 if(process.argv[3]&&f.id!==process.argv[3])continue;
 const file=`${directory}/${f.id}${process.argv[4]==="retry"?".retry":""}.json`;
 try{await readFile(file);console.log(`${profile} ${f.id}: existing result retained`);continue;}catch{}
 calls=[];currentFixture=f.id;const started=performance.now();let deck:Deck|undefined;let phase="prepare";let failure="";
 const execute=async()=>{try{
  const messages:ChatMessage[]=[{role:"user",text:f.input.purpose,createdAt:new Date().toISOString()}];
  const prepared=await pipeline.prepareTask(c,f.input,f.attachment,messages);
  phase="research";const researched=await pipeline.runResearch(c,f.input,prepared,f.attachment,messages);
  // Evaluation explicitly proceeds with recorded limits so all profiles have the same continuation policy.
  const record={...researched.researchRecord,acceptedLimits:true,requiresReview:false};phase="story";
  const story=await pipeline.createStoryline(c,f.input,messages,[],record);
  deck={id:`eval-${profile}-${f.id}`,input:f.input,designSystem:design(f.input.designSystemId),research:researched.sources,researchRecord:story.researchRecord,outline:story.outlineDraft,chat:{setup:messages,outline:[],slides:{}},candidates:{},picked:{},edited:{},demo:false};
  for(const item of deck.outline){phase=`slide-${item.index+1}`;const slides:SlideSpec[]=await ai.generateCandidates(c,f.input,item,deck.research,"동일 입력 회귀 평가",[],true,deck.outline,f.attachment,0,[],[],undefined,deck.researchRecord?.evidence,deck.outline.slice(0,item.index).map(i=>deck!.candidates[i.index]?.[0]?.layoutId??""),{record:deck.researchRecord});deck.candidates[item.index]=slides;deck.picked[item.index]=0;}
  phase="review";const checked=await reviewer.reviewAndRepairDeck(c,deck);for(const r of checked.replacements)deck.candidates[r.index][0]=r.slide;deck.review=checked.review;
 }catch(e){failure=e instanceof Error?e.message:"Unknown failure";}};
 if(profile==="C"){const scope=await import("../src/lib/execution-scope");const measured=await scope.withExecution(execute);if(deck)deck.execution=measured.execution;calls=measured.execution.calls.map(c=>({stage:c.stage,durationMs:c.durationMs,status:c.status,input:c.inputTokens,output:c.outputTokens,total:c.totalTokens,effort:c.effort,maxOutput:c.maxOutputTokens}));}else await execute();
 const evidence=deck?.researchRecord?.evidence??[],slides=deck?Object.values(deck.candidates).flatMap(v=>v[0]?[v[0]]:[]):[];
 const {makeScene}=await import("../src/lib/scene"),{inspectSceneGeometry}=await import("../src/lib/visual-quality");
 const geometryWarnings=deck?slides.flatMap((slide,index)=>inspectSceneGeometry(makeScene(slide,deck!.designSystem,index+1,deck!.input.topic,deck!.outline.map(o=>o.section)),index===0||["표지","목차"].includes(slide.section)).map(w=>({slide:index+1,warning:w}))):[];
 const result={geometryWarnings,profile,id:f.id,model:c.model,completed:!failure,phase,failure,durationMs:Math.round(performance.now()-started),calls,
  metrics:{contextMatchedEvidence:evidence.filter(e=>e.kind==="공개 사실"&&e.contextMatch==="일치").length,originalVerified:evidence.filter(e=>e.kind==="공개 사실"&&e.originalVerified).length,publicEvidence:evidence.filter(e=>e.kind==="공개 사실").length,pdfOriginals:deck?.researchRecord?.originalPages?.filter((p:{url:string;opened:boolean;format?:string})=>p.opened&&(p.format==="pdf"||/\.pdf(?:\?|$)/i.test(p.url))).length??0,judgmentSlides:slides.filter(s=>s.claimType==="추론"||s.claimType==="가설"||s.role==="판단"||s.role==="우선순위").length,slideCount:slides.length,calculationSlides:deck?.outline.filter(o=>o.calculation).length??0,checklistViolations:deck?.review?.checklist.filter(v=>!v.passed).length??null,visualWarnings:geometryWarnings.length,inputTokens:calls.reduce((n,v)=>n+(v.input??0),0),outputTokens:calls.reduce((n,v)=>n+(v.output??0),0),callCount:calls.length},deck};
 if(deck){const {renderSlidePng}=await import("../src/lib/visual-review");const images=`${directory}/${f.id}-slides`;await mkdir(images,{recursive:true});for(let i=0;i<slides.length;i++){try{await writeFile(`${images}/${i+1}.png`,await renderSlidePng(slides[i],deck.designSystem,i+1,deck.input.topic,deck.outline.map(o=>o.section)));}catch{}}}
 if(profile==="C"&&deck){const {saveGenerationReport}=await import("../src/lib/run-report-storage");await saveGenerationReport(deck);}
 await writeFile(file,JSON.stringify(result,null,2));console.log(JSON.stringify({profile,id:f.id,completed:result.completed,phase,calls:calls.length,durationMs:result.durationMs,failure}));
 // A rejected credential/model is not a reason to burn the same failing request on all fixtures.
 if(failure&&calls.some(call=>[401,403,429].includes(call.status)))break;
}

}
void main().catch(error=>{console.error(error instanceof Error?error.message:"Evaluation failed");process.exitCode=1;});
