import {passedCriteria} from "./editorial-fixture";
import {preserveCoverScope} from "../src/lib/cover-scope";
import test from "node:test";
import assert from "node:assert/strict";
import {compactSlideItem,neighborHeadlines} from "../src/lib/generation-context";
import {visualReviewBatch} from "../src/lib/visual-review";
import {demoCandidates,demoOutline,sampleData} from "../src/lib/demo";
import {forest} from "../src/lib/design";
import {isAdvisoryWarning,inspectSlide,textArtifacts} from "../src/lib/slide-quality";
import {makeScene,richLines} from "../src/lib/scene";
import {inspectSceneGeometry} from "../src/lib/visual-quality";
import {retainMeaningfulCandidates} from "../src/lib/candidate-usability";
import type {OutlineItem} from "../src/lib/model";
import {research,generateCandidates} from "../src/lib/ai";
import {plainHtml,quoteExists} from "../src/lib/source-pages";
const input={topic:"도서관 운영 개선",purpose:"제안",deckType:"consulting" as const,designSystemId:"ict-forest" as const,slideCount:6};

test("structural empty arrays are not placeholders but displayed blanks still are",()=>{
 assert.deepEqual(textArtifacts(JSON.stringify({name:"고객팀",advisors:[],children:[]})),[]);
 assert.ok(textArtifacts(JSON.stringify({name:"담당자 []"})).some(w=>w.includes("자리표시자")));
});

test("already valid geometry outranks a clipping alternative without regeneration",()=>{
 const item=demoOutline(input)[0],slides=demoCandidates(input,item);
 slides[0].quality={warnings:["텍스트가 박스 높이를 넘칩니다"],rendererWarnings:["텍스트가 박스 높이를 넘칩니다"],fillRatio:.5,attempts:0};
 slides[1].quality={warnings:[],rendererWarnings:[],fillRatio:.5,attempts:0};
 const ranked=retainMeaningfulCandidates(slides.slice(0,2),item);
 assert.equal(ranked[0].data.title,slides[1].data.title);assert.equal(ranked.length,2);
});

test("multi-line calendar periods and organization responsibilities have real text height",()=>{
 const item={...demoOutline(input)[2],section:"일정"};
 const calendar={layoutId:"c-calendar" as const,section:item.section,headline:item.message,sources:[],data:{periods:["안정화\n2027-01-01~2027-12-31","시범사업\n2028-01-01~2028-12-31","선별 확대\n2029-01-01~2030-12-31"],events:[{name:"책임",cells:["준법·고객팀\n목록·오류 기준선 구축","운영·수익팀\n사업 시범 운영","CEO\n검증 사업 확대"]},{name:"목표",cells:["중대한 오류 0건","기준 대비 제안 목표\n정시 도착률 +2%p","성과 기준 충족 사업만 확대"]}],takeaway:"검증한 사업만 확대하는 제안 일정입니다."}};
 const scene=makeScene(calendar,forest);assert.deepEqual([...scene.warnings,...inspectSceneGeometry(scene)].filter(w=>/넘|겹/.test(w)),[]);
 const orgData=sampleData("c-org-chart",item) as {top:{name:string;role:string}};orgData.top.role="제안 조직, 자원 배분·확대 승인\n매월 운영 관문, 조건 충족 시 의사결정";
 const org=makeScene({layoutId:"c-org-chart",section:item.section,headline:item.message,sources:[],data:orgData},forest);
 assert.deepEqual([...org.warnings,...inspectSceneGeometry(org)].filter(w=>/넘/.test(w)),[]);
});

test("dense bibliography keeps full metadata in a wide table instead of clipped cards",()=>{
 const source={layoutId:"c-evidence-table" as const,section:"출처",headline:"자료의 대상 기간과 적용 범위를 구분합니다.",sources:[],data:{rows:Array.from({length:6},(_,i)=>({id:`ID ${i+1}`,claim:"발행기관: 공공 연구기관\n문서명: 연간 운영 실적과 조사 보고서\n대상 기간: 2025년\n발표일: 2026.01.15",scope:"URL: 발표자 노트 원문 목록\n본문 적용 범위: 연간 집계와 조사 대상의 관측 결과\n표본 밖 대상이나 미래의 실적에 확대 적용하지 않음"})),takeaway:"정정 자료가 공개되면 판단을 갱신합니다."}};
 const scene=makeScene(source,forest);
 assert.deepEqual([...scene.warnings,...inspectSceneGeometry(scene)].filter(w=>/넘|겹/.test(w)),[]);
 const visible=scene.nodes.filter(n=>n.kind==="text").map(n=>n.kind==="text"?n.text:"").join(" ");assert.match(visible,/표본 밖 대상이나 미래의 실적에 확대 적용하지 않음/);
});

test("source Markdown links render as labels and remain real hyperlinks in editable PPTX",async()=>{
 const url="https://example.org/public/report",runs=richLines(`[공식 원문](${url})`,12,4).flat();
 assert.equal(runs.map(r=>r.text).join(""),"공식 원문");assert.ok(runs.every(r=>r.link===url));
 const {exportDeck}=await import("../src/lib/export"),{default:JSZip}=await import("jszip");
 const item=demoOutline(input)[0],s=demoCandidates(input,item)[0];s.data.subtitle=`[공식 원문](${url})`;
 const deck={id:"link-test",input,designSystem:forest,research:[],outline:[item],candidates:{0:[s]},picked:{0:0},edited:{},chat:{setup:[],outline:[],slides:{}},demo:false};
 const bytes=await(await exportDeck(deck,false)).write({outputType:"nodebuffer"}),zip=await JSZip.loadAsync(bytes as Buffer);
 assert.match(await zip.file("ppt/slides/slide1.xml")!.async("string"),/hlinkClick/);
 assert.ok((await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string")).includes(url));
});

test("a dense KPI row receives space from shorter calendar rows instead of clipping",()=>{
 const data={periods:["2027년 기준선","2028년 시범사업","2029~2030년 확대 관문"],events:Array.from({length:4},(_,i)=>({name:`책임팀 ${i+1}`,cells:["기준선 설정\n정기 측정","이행 상태 유지\n문제 시 중단",i===3?"최종 목표, 추가 비용 반영 후 시범사업\n증분 공헌이익 두 분기 연속 양수,\n음수 시 확대 보류":"목표 유지\n미달 시 보류"]})),takeaway:"가정 목표를 충족한 사업만 확대합니다."};
 const scene=makeScene({layoutId:"c-calendar",section:"일정",headline:"동일한 관문으로 판단합니다.",data,sources:[]},forest);
 assert.deepEqual([...scene.warnings,...inspectSceneGeometry(scene)].filter(w=>/넘|겹/.test(w)),[]);
 const target=scene.nodes.find(n=>n.kind==="text"&&n.text.includes("최종 목표"));assert.ok(target?.kind==="text"&&target.size>=12);
});
test("compact context removes only duplicated fields, preserving current message and conditions",()=>{
 const item:OutlineItem={index:2,section:"비교",message:"같은 조건으로 비교합니다",contentHint:"2025년, 30명, VAT 제외, 실제 관측 아님",role:"비교",evidenceRefs:["1"],contentContract:{version:1,requirements:[{id:"period",kind:"condition",quote:"2025년, 30명",anchors:["2025년","30명"],display:"body"}],comparisonDimensions:[]}};
 const small=compactSlideItem(item);assert.equal(small.contentHint,item.contentHint);assert.deepEqual(small.evidenceRefs,["1"]);assert.ok(!("contentContract" in small));
 assert.ok(JSON.stringify(small).length<JSON.stringify(item).length);
 assert.equal(neighborHeadlines([item],3).previous?.message,item.message);
});
test("three final alternatives receive one visual model call and individually attributed results",async()=>{
 const original=fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.ok(JSON.stringify(body).includes("image_url"));return Response.json({status:"completed",output:[{content:[{type:"output_text",text:JSON.stringify({warnings:[],reviews:[{index:0,warnings:[],criteria:passedCriteria()},{index:1,warnings:["둘째 후보의 제목이 잘립니다"],criteria:passedCriteria()},{index:2,warnings:[],criteria:passedCriteria()}]})}]}]});};
 try{const slides=demoCandidates(input,demoOutline(input)[0]),results=await visualReviewBatch({provider:"openai",key:"test-only",model:"gpt-6-luna"},slides,forest,1,input.topic);assert.equal(calls,1);assert.deepEqual(results.map(r=>r.status),["passed","issues","passed"]);assert.deepEqual(results[0].warnings,[]);assert.match(results[1].warnings[0],/둘째/);}finally{globalThis.fetch=original;}
});
test("advisory length limits stay visible while semantic failures remain repairable",()=>{
 assert.equal(isAdvisoryWarning("문구 길이: takeaway는 110자 이내"),true);
 assert.equal(isAdvisoryWarning("차트 의미 (ordinal-distance): 순위를 막대로 표현"),false);
 assert.equal(isAdvisoryWarning("필수 내용 기간 누락"),false);
 const item=demoOutline(input)[0],slide=demoCandidates(input,item)[0];
 slide.data.subtitle="조건과 예외를 보존하는 긴 설명입니다. ".repeat(10);
 assert.ok(inspectSlide(slide,item,input,[]).warnings.some(isAdvisoryWarning));
});
test("search is URL discovery with one tool call; originals stay in the verification stage",async()=>{
 const original=fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const b=JSON.parse(String(init?.body));assert.equal(b.max_tool_calls,1);assert.match(b.input,/원문 열람.*하지 않습니다/);return Response.json({output:[{type:"web_search_call",action:{sources:[{title:"공식 보고서",url:"https://example.org/report"}]}}]});};
 try{const result=await research({provider:"openai",key:"test-only",model:"gpt-6-luna"},"공식 보고서");assert.equal(calls,1);assert.equal(result.sources[0].url,"https://example.org/report");}finally{globalThis.fetch=original;}
});
test("financial table image alt text remains verifiable source text without OCR calls",()=>{
 const text=plainHtml('<h1>분기 실적</h1><img src="table.png" alt="별도 매출액 50,448억원, 영업이익 4,212억원"><script>비공개 명령</script>');
 assert.ok(quoteExists("별도 매출액 50,448억원, 영업이익 4,212억원",text));assert.doesNotMatch(text,/비공개 명령/);
});

test("explicit cover scope dates survive without spending a repair call or inventing facts",()=>{
 const slide=demoCandidates(input,demoOutline(input)[0])[0];slide.data.subtitle="현행 설명 유지";
 slide.contentContract={version:1,requirements:[{id:"period",kind:"condition",quote:"공개 자료 기준일은 2026년 11월 13일, 전략 기간은 2027~2030년이다",anchors:["2026년 11월 13일","2027~2030년"],display:"body"}],comparisonDimensions:[]};
 const result=preserveCoverScope(slide,{...input,stage:"final"});assert.match(String(result.data.subtitle),/현행 설명 유지/);assert.match(String(result.data.subtitle),/2027~2030년/);assert.equal(result.data.eyebrow,"최종 발표");assert.deepEqual(preserveCoverScope(result,input).data,result.data);
});

test("repairs for three alternatives share one request and preserve per-slot reasons",async()=>{
 const original=fetch;let candidateCalls=0,visualCalls=0;
 const item={...demoOutline(input)[0],role:"사실 제시" as const,contentContract:{version:1 as const,requirements:[{id:"scope",kind:"condition" as const,quote:"야간 운영 시간을 포함한다",anchors:["야간 운영"],display:"body" as const}],comparisonDimensions:[]}};
 globalThis.fetch=async(_url,init)=>{
  const b=JSON.parse(String(init?.body)),props=b.text.format.schema.properties;
  let value:unknown;
  if(props.slides){candidateCalls++;const p=JSON.parse(b.input);if(candidateCalls>1){assert.equal(p.slotPlan.length,3);assert.ok(p.slotPlan.every((s:{repairInstruction?:string})=>s.repairInstruction?.includes("scope")));}
   value={slides:p.slotPlan.map((s:{layoutId:string},i:number)=>({layoutId:s.layoutId,section:item.section,headline:`도서관 운영 제안 ${i+1}`,dataJson:JSON.stringify({...p.layoutExamples[s.layoutId],title:`도서관 운영 제안 ${i+1}`,subtitle:candidateCalls===1?"기존 운영 제안":"야간 운영 시간을 포함한 제안"}),sourceUrls:[],notes:"합성 검증"}))};
  }else{visualCalls++;value={warnings:[],reviews:[0,1,2].map(index=>({index,warnings:[],criteria:passedCriteria()}))};}
  return Response.json({status:"completed",output:[{content:[{type:"output_text",text:JSON.stringify(value)}]}]});
 };
 try{const result=await generateCandidates({provider:"openai",key:"test-only",model:"gpt-6-luna"},input,item,[],"",[],false,[item]);assert.equal(result.length,3);assert.equal(candidateCalls,2);assert.equal(visualCalls,1);assert.ok(result.every(s=>String(s.data.subtitle).includes("야간 운영")));}finally{globalThis.fetch=original;}
});
