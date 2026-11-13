import test from "node:test";
import assert from "node:assert/strict";
import {contentContractSchema,validateContentContract,inspectContentContract,contractSource} from "../src/lib/content-contract";
import type {Scene} from "../src/lib/scene";
const contract=contentContractSchema.parse({version:1,requirements:[{id:"period",kind:"condition",quote:"6개월 시범 운영, 고객 120명 대상",anchors:["6개월","120명"],display:"body"},{id:"history",kind:"historical",quote:"2025년 실험 결과 18% 개선",anchors:["2025년","18%"],display:"body"}],comparisonDimensions:["비용","효과"]});
const source="비용·효과 비교. 6개월 시범 운영, 고객 120명 대상. 2025년 실험 결과 18% 개선.";
const scene=(text:string):Scene=>({nodes:[{kind:"text",x:1,y:2,w:9,h:2,text,size:16,color:"#000",lineHeight:1.2}],warnings:[]});
test("content contract: supplied conditions and historical evidence are retained",()=>{
 assert.doesNotThrow(()=>validateContentContract(contract,source));
 assert.equal(inspectContentContract(contract,scene("비용·효과. 6개월·고객 120명. 2025년: 18% 개선")).length,0);
 assert.equal(inspectContentContract(contract,scene("비용·효과. 6개월·120명. 개선 예상")).length,1);
});
test("content contract: invented quote, anchor and comparison dimension are rejected",()=>{
 assert.throws(()=>validateContentContract({...contract,requirements:[{...contract.requirements[0],quote:"만족도 99% 확정"}]},source));
 assert.throws(()=>validateContentContract({...contract,requirements:[{...contract.requirements[0],anchors:["150명"]}]},source));
 assert.throws(()=>validateContentContract({...contract,comparisonDimensions:["공급량"]},source));
});
test("content contract: notes-only content cannot satisfy visible requirements",()=>{
 assert.equal(inspectContentContract(contract,scene("비용·효과. 조건은 발표자 노트 참조")).length,2);
 assert.equal(inspectContentContract({...contract,requirements:contract.requirements.map(r=>({...r,display:"notes"}))},scene("비용·효과 요약")).length,0);
});
test("content contract: old slides without a contract remain compatible",()=>{
 assert.deepEqual(inspectContentContract(undefined,scene("기존 장표")),[]);
 assert.match(contractSource({item:{contentHint:"서울 도서관 4곳"},evidence:[{claim:"대출 기간 14일"}]}),/4곳[\s\S]*14일/);
});

test("content contract: comparison dimensions must remain visible",()=>{assert.equal(inspectContentContract({...contract,requirements:[]},scene("비용만 비교")).length,1);});

test("visual raster units preserve text sizes and geometric transforms",async()=>{
 const {scaleSvgUnits}=await import("../src/lib/visual-review");
 const svg=scaleSvgUnits('<text x="1" y="2" font-size="0.1666666667" fill="#244C3C">표본</text><polygon points="1,2 3,4"/><rect transform="rotate(90 1 2)" width="2"/>',96);
 assert.match(svg,/x="96" y="192"/);assert.match(svg,/font-size="16/);assert.match(svg,/points="96,192 288,384"/);assert.match(svg,/rotate\(90 96 192\)/);assert.match(svg,/#244C3C/);
});

test("content contract: a numeric match cannot lose its unit",()=>{
 const c=contentContractSchema.parse({version:1,requirements:[{id:"rate",kind:"fact",quote:"개선율 18%",anchors:["18%"],display:"body"}],comparisonDimensions:[]});
 assert.equal(inspectContentContract(c,scene("18건 처리")).length,1);assert.equal(inspectContentContract(c,scene("개선율 18.0% (기준 기간 유지)")).length,0);
});

test("shared calculation suffixes are compacted without a topic dictionary",async()=>{
 const {compactSharedLabels}=await import("../src/lib/scenario-calculation");
 assert.deepEqual(compactSharedLabels(["접수 처리시간","검토 처리시간","승인 처리시간"]),["접수","검토","승인"]);
 assert.deepEqual(compactSharedLabels(["연구 실험비용","생산 실험비용","검증 실험비용"]),["연구","생산","검증"]);
 assert.deepEqual(compactSharedLabels(["매출","비용","손익"]),["매출","비용","손익"]);
});
test("horizontal chart preview respects the allocated scene aspect ratio",async()=>{
 const {chartPreviewDataUrl}=await import("../src/lib/native-charts");const {forest}=await import("../src/lib/design");
 const url=chartPreviewDataUrl({kind:"horizontal",categories:["접수","검토"],series:[{name:"시간",values:[12,8]}],unit:"분"},forest.colors,4);
 const svg=decodeURIComponent(url.split(",").slice(1).join(","));assert.match(svg,/viewBox="0 0 900 225"/);assert.match(svg,/y2="180"/);
});

test("comparison headings are not forced onto cover or calculation roles",()=>{
 const c={...contract,requirements:[]};assert.deepEqual(inspectContentContract(c,scene("목적과 범위"),false),[]);
 assert.equal(inspectContentContract(contract,scene("조건이 빠진 본문"),false).length,2);
});

test("Japanese middle-dot punctuation is not misclassified as unapproved kana",async()=>{
 const {textArtifacts}=await import("../src/lib/slide-quality");
 assert.deepEqual(textArtifacts("수요・실적은 구분됩니다."),[]);
 assert.ok(textArtifacts("日本語가 혼합된 장표").some(w=>w.includes("한자·가나")));
});

test("occupancy bars are reserved for schedules rather than arbitrary numeric calculations",async()=>{
 const {roleLayouts}=await import("../src/lib/slide-quality");
 for(const type of ["consulting","marketing"] as const){assert.ok(!roleLayouts(type,"계산").some(id=>id.endsWith("contract-bars")));assert.ok(roleLayouts(type,"일정").some(id=>id.endsWith("contract-bars")));}
});

test("formatting words inside a condition does not lose its quantity or unit",async()=>{
 const {anchorSatisfied}=await import("../src/lib/content-contract");
 assert.ok(anchorSatisfied("월 400건","월처리건수400건"));assert.ok(anchorSatisfied("현재 건당 12분","현재건당시간12분"));
 assert.ok(!anchorSatisfied("월 400건","월처리400명"));assert.ok(!anchorSatisfied("18%","18건"));
 assert.ok(anchorSatisfied("12−8","시간12분−시간8분"));assert.ok(!anchorSatisfied("12−8","12분8분"));
});

test("adaptive short cells are not misreported as zero body fill",async()=>{
 const {inspectSlide}=await import("../src/lib/slide-quality");
 const input={topic:"운영 조건 비교",purpose:"합성 검증",slideCount:5,deckType:"consulting" as const,designSystemId:"ict-forest" as const};
 const item={index:1,section:"비교",message:"같은 업무에서 조건을 비교합니다.",contentHint:"",role:"비교" as const,evidenceRefs:["1"]};
 const s={layoutId:"c-comparison-table" as const,section:"비교",headline:"처리시간과 비용을 함께 평가합니다.",data:{criteria:["시간","비용","보안","품질"],alternatives:[{name:"현재",values:["건당 12분 처리","도구 비용 미측정","동일 개인정보 범위","현재 문의율 기준"]},{name:"개선 가정",values:["건당 8분 가정으로 동일 건수를 처리","월 20만 원 가정이며 인건비와 교육비는 제외","개인정보 외부 전송은 허용하지 않음","문의율이 높아지지 않을 때에만 확대"]}],takeaway:"시간과 문의율을 동시에 충족할 때 확대합니다."},sources:[],evidenceRefs:["1"]};
 const quality=inspectSlide(s,item,input,[{id:"1",kind:"내부 전제",claim:"합성 가정",title:"제공 브리프",url:"",locator:"브리프",checkedAt:"2026-11-13"}]);
 assert.ok(!quality.warnings.some(w=>w.includes("본문 채움 비율 0%")));assert.ok(quality.fillRatio>0);
});

test("a URL and paraphrase cannot masquerade as survey interview quotes",async()=>{
 const {unverifiedQuoteWarnings}=await import("../src/lib/slide-quality");
 const evidence=[{id:"1",kind:"내부 전제" as const,claim:"제공한 인터뷰",title:"인터뷰",url:"",checkedAt:"2026-11-13",locator:"1쪽",originalText:"접수 상태를 다시 확인하는 데 시간이 걸립니다."}];
 assert.deepEqual(unverifiedQuoteWarnings([{text:"접수 상태를 다시 확인하는 데 시간이 걸립니다.",speaker:"참여자 A"}],evidence),[]);
 assert.equal(unverifiedQuoteWarnings([{text:"https://example.com/report",speaker:"공식 자료"},{text:"응답자가 만족했습니다",speaker:"자료 요약"},{text:"비용이 90% 줄었습니다",speaker:"참여자 B"}],evidence).length,3);
});

test("dense argument panels reflow headers without dropping source data",async()=>{
 const {makeScene}=await import("../src/lib/scene");const {inspectSceneGeometry}=await import("../src/lib/visual-quality");const {forest}=await import("../src/lib/design");
 for(const topic of ["지역 교통 개선","도서관 운영 개선"]){
 const spec={layoutId:"c-argument-board" as const,section:"비교",headline:`${topic}은 같은 조건에서 대안을 비교합니다.`,data:{insight:"대안별 근거와 적용 조건을 함께 확인합니다.",panels:[0,1,2].map(i=>({kind:"비교",title:`${topic} 비교 ${i+1}`,rows:[0,1,2,3].map(j=>({label:`대안 ${j+1} 적용 범위와 조건`,value:"같은 기간과 모집단의 비교 기준",detail:"운영 범위와 기준 기간을 구분합니다.\n자료의 한계를 유지하며 비교합니다."})),assumption:"제공된 내부 조건과 공개 사실을 구분합니다.\n다른 모집단의 결과를 같은 수치처럼 비교하지 않습니다."})),takeaway:"동일한 범위와 조건을 확인한 뒤 적용 대안을 선택합니다."},sources:[]};
 const before=JSON.stringify(spec.data),scene=makeScene(spec,forest,3,topic);
 assert.equal(JSON.stringify(spec.data),before);assert.deepEqual(inspectSceneGeometry(scene).filter(w=>/겹칩니다|넘칩니다/.test(w)),[]);
 for(let j=1;j<=4;j++)assert.ok(scene.nodes.some(n=>n.kind==="text"&&n.text.includes(`대안 ${j}`)));
 }
});

test("new renderer edits persist and existing adaptive-v3 edit identities stay on the legacy layout",async()=>{
 const {makeScene}=await import("../src/lib/scene");const {patchCanvasNode}=await import("../src/lib/canvas-edits");const {sampleData}=await import("../src/lib/demo");const {forest}=await import("../src/lib/design");
 const item={index:2,section:"판단",message:"조건을 비교합니다.",contentHint:""};
 const spec={layoutId:"c-argument-board" as const,section:"판단",headline:"운영 조건을 기준으로 선택합니다.",data:sampleData("c-argument-board",item),sources:[]};
 for(const version of [undefined,"adaptive-v3"] as const){const slide={...spec,rendererVersion:version};const node=makeScene(slide,forest,3).nodes.find(n=>n.kind==="text"&&n.y>1.9)!;assert.ok(node.kind==="text");const edited=patchCanvasNode(slide,node,{text:"직접 편집 보존",w:node.w+.1});assert.equal(edited.rendererVersion,version??"adaptive-v4");assert.ok(makeScene(edited,forest,3).nodes.some(n=>n.kind==="text"&&n.text==="직접 편집 보존"));}
});

test("convergence conclusion fits available height without dropping conditions",async()=>{
 const {makeScene,richLines}=await import("../src/lib/scene");const {sampleData}=await import("../src/lib/demo");const {forest}=await import("../src/lib/design");
 const data=sampleData("c-evidence-convergence",{index:2,section:"판단",message:"근거를 종합합니다.",contentHint:""});
 const detail="집계 범위가 다르면 순위를 확정하지 않습니다.\n대안의 범위·가격·비용을 같은 날짜에 비교합니다.\n중복과 비용이 낮을 때 교체합니다.\n계산은 가정이며 실제 결과를 보장하지 않습니다.";
 (data.conclusion as {detail:string}).detail=detail;
 const scene=makeScene({layoutId:"c-evidence-convergence",section:"판단",headline:"조건을 비교해 선택합니다.",data,sources:[]},forest,3);
 const node=scene.nodes.find(n=>n.kind==="text"&&n.text===detail);assert.ok(node?.kind==="text");assert.ok(richLines(node.text,node.size,node.w).length*node.size*node.lineHeight/72<=node.h+.05);assert.equal((data.conclusion as {detail:string}).detail,detail);
});
