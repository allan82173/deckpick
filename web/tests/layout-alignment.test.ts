import test from "node:test";
import assert from "node:assert/strict";
import {equalTracks,sectionTabs} from "../src/lib/layout-grid";
import {makeScene} from "../src/lib/scene";
import {sampleData} from "../src/lib/demo";
import {forest} from "../src/lib/design";
import {applyCanvasEdits,sceneNodeKey} from "../src/lib/canvas-edits";
import type {LayoutId,SlideSpec} from "../src/lib/model";
const item={index:2,section:"검증",message:"자료를 비교해 전략의 적용 조건을 확인합니다",contentHint:"근거"};
function scene(id:LayoutId,data?:Record<string,unknown>){const slide:SlideSpec={layoutId:id,section:item.section,headline:item.message,data:data??sampleData(id,item),sources:[]};return makeScene(slide,forest,3,"덱",["표지","목차","문제","원인","검증","결론"]);}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.00001,`${a} != ${b}`);
test("small alignment corrections preserve an existing text edit rather than dropping its old key",()=>{
  const node=scene("c-split-insight").nodes.find(n=>n.kind==="text"&&n.x===5.85)!;const key=sceneNodeKey({...node,w:node.w-.1,y:node.y-.12},0);const next=applyCanvasEdits([node],{[key]:{text:"사용자가 직접 쓴 문장"}})[0];assert.equal(next.kind,"text");if(next.kind==="text")assert.equal(next.text,"사용자가 직접 쓴 문장");
});
test("section navigation includes the active section beyond six and never intersects the deck label",()=>{
  const tabs=sectionTabs(["표지","목차",...Array.from({length:12},(_,i)=>`파트${i}`)],"파트10");assert.equal(tabs.length,6);assert.equal(tabs.filter(t=>t.active).length,1);assert.ok(tabs.every(t=>t.start>=3.62));near(tabs.at(-1)!.start+tabs.at(-1)!.size,12.91);assert.equal(sectionTabs([],"검증")[0].active,true);
});
test("parallel evidence fills the same top and bottom as its insight panel at both supported counts",()=>{
  for(const count of [2,3]){const data=sampleData("c-split-insight",item);data.evidence=Array.from({length:count},()=>({title:"관찰",body:"내용"}));const nodes=scene("c-split-insight",data).nodes;const right=nodes.filter(n=>n.kind==="rect"&&n.x===4.85);assert.equal(right.length,count);near(right[0].y,1.9);near(right.at(-1)!.y+right.at(-1)!.h,6.65);right.forEach(n=>near(n.h,right[0].h));}
});
test("before-after comparison columns have equal gutters and all cells in a row share height",()=>{
  const nodes=scene("c-before-after").nodes;const headers=nodes.filter(n=>n.kind==="rect"&&n.y===2.16);assert.equal(headers.length,3);near(headers[1].x-headers[0].x-headers[0].w,.2);near(headers[2].x-headers[1].x-headers[1].w,.2);near(headers[1].w,headers[2].w);const rows=nodes.filter(n=>n.kind==="rect"&&n.y>=2.73&&n.y<6.2);for(const row of rows)near(row.h,rows[0].h);
});
test("cause tree child stacks align to their parent blocks despite different child counts",()=>{
  const nodes=scene("c-cause-tree").nodes;const parents=nodes.filter(n=>n.kind==="rect"&&n.x===4.02);for(const parent of parents){const children=nodes.filter(n=>n.kind==="rect"&&n.x===7.07&&n.y>=parent.y-.001&&n.y<parent.y+1.2);near(children[0].y,parent.y);near(children.at(-1)!.y+children.at(-1)!.h,parent.y+parent.h);}
});
test("equal tracks preserve both edges and identical gaps for variable counts",()=>{for(const count of [2,3,4,5,6]){const tracks=equalTracks(.42,12.49,count,.3);near(tracks[0].start,.42);near(tracks.at(-1)!.start+tracks.at(-1)!.size,12.91);for(let i=1;i<count;i++)near(tracks[i].start-tracks[i-1].start-tracks[i-1].size,.3);}});

test("structural brief and sources keep the five analysis tabs stable",()=>{const sections=["Brief","As-Is","Market","Rivals","Strategy","Execute","출처"]; const first=sectionTabs(sections,"Brief"),last=sectionTabs(sections,"출처");assert.equal(first.length,5);assert.deepEqual(first.map(({label,start,size})=>({label,start,size})),last.map(({label,start,size})=>({label,start,size})));assert.equal(last.filter(t=>t.active).length,0);});
