import test from "node:test";
import assert from "node:assert/strict";
import {makeScene} from "../src/lib/scene";
import {forest} from "../src/lib/design";
import {patchCanvasNode} from "../src/lib/canvas-edits";
import {slideSchema,type SlideSpec} from "../src/lib/model";
const slide=():SlideSpec=>({layoutId:"c-metrics-panel",section:"지표",headline:"긴 지표의 편집 저장 검증",sources:[],data:{metrics:Array.from({length:4},(_,i)=>({label:`합성 항목 ${i}`,value:`합성 수치 ${i} · 12345678건 · 이전 기간과 다른 범위`,meaning:`설명 ${i}: 합성 예시이며 실제 관측 결과가 아닙니다.`})),panelTitle:"판단 범위",panel:["비교 조건은 가정입니다.","새 장표를 편집해 확인합니다."],takeaway:"숫자와 단위를 유지합니다."}});
test("editing an adaptive text box keeps its adaptive scene after persistence",()=>{
 const original=slide(),scene=makeScene(original,forest);const value=scene.nodes.find(n=>n.kind==="text"&&n.text.startsWith("합성 수치 0"))!;const other=scene.nodes.find(n=>n.kind==="text"&&n.text.startsWith("설명 1:"))!;
 const edited=patchCanvasNode(original,value,{x:value.x+.1,w:value.w-.1,text:"사용자가 직접 고친 합성 수치"});const persisted=slideSchema.parse(JSON.parse(JSON.stringify(edited)));const rendered=makeScene(persisted,forest);const same=rendered.nodes.find(n=>n.kind==="text"&&n.text.startsWith("설명 1:"));assert.deepEqual(same,other);assert.ok(rendered.nodes.some(n=>n.kind==="text"&&n.text==="사용자가 직접 고친 합성 수치"));
});
test("previously edited slides retain the legacy geometry instead of migrating automatically",()=>{
 const original={...slide(),canvasEdits:{legacySentinel:{color:"#244C3C"}}};const scene=makeScene(original,forest);const value=scene.nodes.find(n=>n.kind==="text"&&n.text.startsWith("합성 수치 0"))!;const other=scene.nodes.find(n=>n.kind==="text"&&n.text.startsWith("설명 1:"))!;const edited=patchCanvasNode(original,value,{color:"#111111"});assert.deepEqual(makeScene(edited,forest).nodes.find(n=>n.kind==="text"&&n.text.startsWith("설명 1:")),other);
});
