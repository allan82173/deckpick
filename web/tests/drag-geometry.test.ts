import test from 'node:test';
import assert from 'node:assert/strict';
import {dragGeometry,resizeDirections} from '../src/lib/drag-geometry';
import {applyCanvasEdits,patchCanvasNode} from '../src/lib/canvas-edits';
import {richLines} from '../src/lib/scene';
import type {SlideSpec} from '../src/lib/model';
test('all eight handles shrink inward while anchoring the opposite edge',()=>{
 const box={x:2,y:2,w:5,h:3};
 for(const direction of resizeDirections){
  const next=dragGeometry(box,direction,direction.includes('w')?1:-1,direction.includes('n')?1:-1);
  assert.equal(next.w,direction==='n'||direction==='s'?5:4);
  assert.equal(next.h,direction==='e'||direction==='w'?3:2);
  if(direction.includes('w'))assert.equal(next.x+next.w,7);else assert.equal(next.x,2);
  if(direction.includes('n'))assert.equal(next.y+next.h,5);else assert.equal(next.y,2);
 }
});
test('pointer resizing cannot invert a box or move it outside the slide',()=>{
 const box={x:2,y:2,w:5,h:3};
 assert.ok(dragGeometry(box,'nw',100,100).w>=.119);
 const expanded=dragGeometry(box,'se',100,100);assert.equal(expanded.x+expanded.w,13.333333);assert.equal(expanded.y+expanded.h,7.5);
 assert.deepEqual(dragGeometry(box,'move',-100,-100),{...box,x:0,y:0});
});
test('manually narrowed cover text wraps, preserving font and saved dimensions',()=>{
 const node={kind:'text' as const,x:1,y:1,w:10,h:2,text:'고객 경험 개선을 위한 브랜드 커뮤니케이션 전략',size:34,lineHeight:1.2,color:'#000000',bold:true,oneLine:true};
 const slide={canvasEdits:undefined} as unknown as SlideSpec;
 const edited=patchCanvasNode(slide,node,dragGeometry(node,'se',-5,-1));
 const saved=JSON.parse(JSON.stringify(edited));
 const result=applyCanvasEdits([node],saved.canvasEdits)[0];
 assert.equal(result.w,5);assert.equal(result.h,1);
 assert.equal(result.kind,'text');if(result.kind!=='text')return;
 assert.equal(result.text,node.text);assert.equal(result.size,34);assert.equal(result.bold,true);assert.equal(result.oneLine,false);
 assert.ok(richLines(result.text,result.size,result.w,result.oneLine).length>1);
});

