import { readFile,writeFile,mkdir } from "node:fs/promises";
import { makeScene } from "../src/lib/scene";
import { inspectSceneGeometry } from "../src/lib/visual-quality";
import { renderSlidePng } from "../src/lib/visual-review";
import { generationReport,reportMarkdown } from "../src/lib/run-report";
import type { Deck } from "../src/lib/model";
type Run={profile:string;id:string;completed:boolean;failure:string;phase:string;durationMs:number;calls:{stage:string;input?:number;output?:number;status:number}[];metrics:Record<string,number|null>;deck?:Deck};
async function main(){
 const root="output/quality-execution";
 const fixtures=JSON.parse(await readFile("tests/fixtures/general-decks.json","utf8")) as {id:string;category:string}[];
 const rows:Record<string,unknown>[]=[],lines=["# Luna A/B/C 실행 비교", "", "A: 수정 전 · B: 단계별 effort·출력 한도만 변경 · C: 실행 조건 전체 변경. 같은 모델과 입력을 사용한 각 1회 실행이며 검색 시점·결과가 달라 인과 효과를 확정하지 않는다.","", "| 설정 | 주제 | 결과 | 일치 공개 근거 | 원문 대조/공개 근거 | PDF | 판단 장/전체 | 계산 장 | 체크 위반 | 좌표 경고 | 분 | 호출 | 입력/출력 토큰 |", "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"];
 for(const profile of ["A","B","C"])for(const fixture of fixtures){
  let run:Run;let retry=false;try{try{run=JSON.parse(await readFile(`${root}/${profile}/${fixture.id}.retry.json`,"utf8"));retry=true;}catch{run=JSON.parse(await readFile(`${root}/${profile}/${fixture.id}.json`,"utf8"));}}catch{lines.push(`| ${profile} | ${fixture.category} | 실행 중 또는 미기록 | — | — | — | — | — | — | — | — | — | — |`);continue;}
  const deck=run.deck;
  const slides=deck?deck.outline.flatMap((_,i)=>{const s=deck.edited[i]??deck.candidates[i]?.[deck.picked[i]??0];return s?[s]:[];}):[];
  const geometry=deck?slides.flatMap((s,i)=>inspectSceneGeometry(makeScene(s,deck.designSystem,i+1,deck.input.topic,deck.outline.map(o=>o.section)),i===0||["표지","목차"].includes(s.section)).map(warning=>({slide:i+1,warning}))):[];
  if(deck){const directory=`${root}/${profile}/${fixture.id}-slides`;await mkdir(directory,{recursive:true});for(let i=0;i<slides.length;i++)await writeFile(`${directory}/${i+1}.png`,await renderSlidePng(slides[i],deck.designSystem,i+1,deck.input.topic,deck.outline.map(o=>o.section)));const report=generationReport(deck);await writeFile(`${directory}/report.json`,JSON.stringify(report,null,2));await writeFile(`${directory}/report.md`,reportMarkdown(report));}
  const m:Record<string,number|null>={...run.metrics,visualWarnings:geometry.length},tokens=(key:"input"|"output")=>run.calls.some(c=>c[key]!==undefined)?run.calls.reduce((n,c)=>n+(c[key]??0),0):null;
  const geometryCounts={overlap:geometry.filter(w=>/겹/.test(w.warning)).length,overflow:geometry.filter(w=>/넘/.test(w.warning)).length,empty:geometry.filter(w=>/빈 공간/.test(w.warning)).length,smallText:geometry.filter(w=>/글자 크기/.test(w.warning)).length};
  const row={profile,id:fixture.id,category:fixture.category,retry,completed:run.completed,phase:run.phase,failure:run.failure,metrics:m,durationMs:run.durationMs,calls:run.calls.length,inputTokens:tokens("input"),outputTokens:tokens("output"),missingUsageCalls:run.calls.filter(c=>c.input===undefined||c.output===undefined).length,geometryCounts,geometry};rows.push(row);
  const available=!!deck;
  lines.push(`| ${profile} | ${fixture.category} | ${run.completed?"완료":`실패: ${run.phase}`} | ${available?m.contextMatchedEvidence:"—"} | ${available?`${m.originalVerified}/${m.publicEvidence}`:"—"} | ${available?m.pdfOriginals:"—"} | ${available?`${m.judgmentSlides}/${m.slideCount}`:"—"} | ${available?m.calculationSlides:"—"} | ${available?m.checklistViolations:"—"} | ${available?geometry.length:"—"} | ${(run.durationMs/60000).toFixed(1)} | ${run.calls.length} | ${tokens("input")??"미제공"}/${tokens("output")??"미제공"} |`);
 }
 lines.push("", "## 해석 범위", "", "- 실패 실행의 품질 지표는 0이 아니라 미측정이다. 실패까지 사용한 시간·호출·반환 토큰은 기록한다.", "- 판단 장은 추론·가설 표시 또는 판단·우선순위 역할로 분류한 비율이다. 판단의 실질적 설득력을 사람이 평가한 점수는 아니다.", "- 좌표 경고는 모든 A/B/C 결과에 동일한 최신 검사기를 오프라인 적용했다. 자동 줄바꿈·글꼴 폭 근사에 따른 오탐 가능성이 있다.", "- A/B의 단계 이름은 요청 프롬프트에서 추정한 값이다. 호출 수와 토큰은 실제 제공자 반환값이다. C의 실행 리포트는 앱의 명시적 단계 기록을 사용한다.", "- 계산 장은 구조화 calculation이 있는 장이다. 모든 가정이 조사로 검증됐다는 뜻은 아니다.", "- 완료는 파이프라인 종료를 뜻한다. 경고가 남거나 주장·근거의 사람이 검토해야 할 문제가 있을 수 있다.", "", "## 실패 기록", "");
 for(const r of rows)if(!r.completed)lines.push(`- ${r.profile}/${r.id}: ${r.failure}`);
 for(const r of rows)if(r.retry){const original:Run=JSON.parse(await readFile(`${root}/${r.profile}/${r.id}.json`,"utf8"));lines.push(`- ${r.profile}/${r.id}는 조사 형식 계약 수정 후 1회 재실행한 결과다. 초기 결과도 원본 JSON에 보존했다: ${original.failure} (초기 ${original.calls.length}회, ${(original.durationMs/60000).toFixed(1)}분). 재실행 토큰은 표에 별도 실행으로 집계하며 초기 사용량을 포함하지 않는다.`);}
 await writeFile(`${root}/comparison.json`,JSON.stringify(rows,null,2));await writeFile(`${root}/comparison.md`,lines.join("\n"));console.log(JSON.stringify({recorded:rows.length,completed:rows.filter(r=>r.completed).length,total:15}));
}
void main();
