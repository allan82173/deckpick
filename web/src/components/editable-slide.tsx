"use client";
import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from "react";
import {Check,RotateCcw,X,Move} from "lucide-react";
import {dragGeometry,resizeDirections,type DragDirection} from "@/lib/drag-geometry";
import {makeScene,SLIDE} from "@/lib/scene";
import {clearCanvasNode,patchCanvasNode,type CanvasEdit} from "@/lib/canvas-edits";
import type {Deck,SlideSpec} from "@/lib/model";
import {SlidePreview} from "./slide-preview";
export function EditableSlide({slide,deck,index,disabled,onChange}:{slide:SlideSpec;deck:Deck;index:number;disabled:boolean;onChange:(slide:SlideSpec)=>void}){
 const [selected,setSelected]=useState<number|null>(null),[scale,setScale]=useState(.6),[editing,setEditing]=useState(false);
 const latest=useRef(slide),session=useRef(slide.canvasEdits),stage=useRef<HTMLDivElement>(null);
 const cleanupDrag=useRef<(()=>void)|null>(null),notify=useRef(onChange);
 notify.current=onChange;
 useEffect(()=>()=>cleanupDrag.current?.(),[]);
 latest.current=slide;
 const sections=deck.outline.map(o=>o.section);
 const base=makeScene({...slide,canvasEdits:undefined},deck.designSystem,index+1,deck.input.topic,sections).nodes;
 const nodes=makeScene(slide,deck.designSystem,index+1,deck.input.topic,sections).nodes;
 const node=selected===null?null:nodes[selected];
 useEffect(()=>{const element=stage.current;if(!element)return;const observer=new ResizeObserver(()=>setScale(element.getBoundingClientRect().width/(SLIDE.w*96)));observer.observe(element);return()=>observer.disconnect();},[]);
 function commit(next:SlideSpec){latest.current=next;notify.current(next);}
 function patch(edit:CanvasEdit){if(selected===null||!base[selected])return;commit(patchCanvasNode(latest.current,base[selected],edit));}
 function select(i:number){if(selected!==i){session.current=latest.current.canvasEdits;setEditing(false);}setSelected(i);}
 function beginDrag(e:ReactPointerEvent<HTMLButtonElement>,direction:DragDirection){
  if(e.button!==0||selected===null||!node||!base[selected])return;
  e.preventDefault();e.stopPropagation();cleanupDrag.current?.();setEditing(false);
  const element=stage.current,original=base[selected];if(!element)return;
  const bounds=element.getBoundingClientRect(),start={x:node.x,y:node.y,w:node.w,h:node.h},x=e.clientX,y=e.clientY,pointer=e.pointerId;
  const control=e.currentTarget;control.setPointerCapture(pointer);
  const update=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;event.preventDefault();const box=dragGeometry(start,direction,(event.clientX-x)*SLIDE.w/bounds.width,(event.clientY-y)*SLIDE.h/bounds.height);commit(patchCanvasNode(latest.current,original,box));};
  const stop=()=>{window.removeEventListener('pointermove',update);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',stop);window.removeEventListener('blur',stop);try{if(control.hasPointerCapture(pointer))control.releasePointerCapture(pointer);}catch{}cleanupDrag.current=null;};
  const finish=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;update(event);stop();};
  window.addEventListener('pointermove',update,{passive:false});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',stop);window.addEventListener('blur',stop);cleanupDrag.current=stop;
 }
 function cancelEdit(){setEditing(false);commit({...latest.current,canvasEdits:session.current});setSelected(null);}
 return <div className="editable-slide"><div className="canvas-stage" ref={stage}>
 <SlidePreview hiddenTextIndex={editing?selected??undefined:undefined} slide={slide} design={deck.designSystem} page={index+1} name={deck.input.topic} sections={sections}/>
 {!disabled&&<div className="canvas-hit-layer">{nodes.map((n,i)=>{
 const rect={left:`${n.x/SLIDE.w*100}%`,top:`${n.y/SLIDE.h*100}%`,width:`${Math.max(n.w,.08)/SLIDE.w*100}%`,height:`${Math.max(n.h,.08)/SLIDE.h*100}%`};
 if(i===selected&&n.kind==="text"&&editing)return <textarea key={i} className="canvas-inline-text" aria-label="장표 텍스트 편집" autoFocus value={n.text} maxLength={3000} style={{...rect,color:n.color,fontWeight:n.bold?700:400,fontSize:`${n.size*4/3*scale}px`}} onChange={e=>patch({text:e.target.value})} onBlur={()=>setEditing(false)} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();cancelEdit();}if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();setSelected(null);}}}/>;
 return <button type="button" key={i} style={rect} className={`canvas-hit${selected===i?" selected":""}`} aria-label={n.kind==="text"?`텍스트 수정: ${n.text.slice(0,90)}`:n.kind==="image"?`이미지 수정: ${n.alt}`:`도형 수정 ${i+1}`} onClick={()=>select(i)} onPointerDown={e=>{if(selected===i&&!editing)beginDrag(e,"move");}} onDoubleClick={()=>{select(i);if(n.kind==="text")setEditing(true);}} onKeyDown={e=>{if(e.key==="Enter"&&n.kind==="text"){e.preventDefault();select(i);setEditing(true);}}}/>;
 })}{node&&<div className="canvas-selection" style={{left:`${node.x/SLIDE.w*100}%`,top:`${node.y/SLIDE.h*100}%`,width:`${node.w/SLIDE.w*100}%`,height:`${node.h/SLIDE.h*100}%`}}>
 {['top','right','bottom','left'].map(edge=><button type="button" key={edge} className={`canvas-selection-edge ${edge}`} aria-label={`선택한 요소 이동 ${edge}`} onPointerDown={e=>beginDrag(e,"move")}/>)}
 {resizeDirections.map(direction=><button type="button" key={direction} className={`canvas-box-handle ${direction}`} aria-label={`크기 조절 ${direction}`} title="끌어서 크기 조절" onPointerDown={e=>beginDrag(e,direction)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const box=dragGeometry(node,direction,e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0,e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0);patch(box);}}}/>)}
 <button type="button" className="canvas-move-handle" aria-label="선택한 요소 이동" title="끌어서 이동" onPointerDown={e=>beginDrag(e,"move")}><Move size={13}/></button>
 </div>}</div>}
 </div>
 {node&&!disabled&&<div className="canvas-toolbar" aria-label="선택한 요소 편집"><strong>{node.kind==="text"?"텍스트":node.kind==="image"?"이미지":"도형"}</strong><small>테두리로 이동 · 8개 손잡이로 크기 조절</small>{node.kind==="text"&&<button type="button" onClick={()=>setEditing(true)}>문구 편집</button>}
 {node.kind==="text"?<><label>글자색<input type="color" aria-label="글자색" value={node.color} onChange={e=>patch({color:e.target.value})}/></label><label>크기<input type="number" aria-label="글자 크기" min={6} max={96} value={node.size} onChange={e=>{const v=Number(e.target.value);if(v>=6&&v<=96)patch({size:v});}}/></label><button type="button" aria-pressed={!!node.bold} onClick={()=>patch({bold:!node.bold})}><b>굵게</b></button></>:node.kind!=="image"?<label>도형 색<input type="color" aria-label="도형 색" value={node.fill} onChange={e=>patch({fill:e.target.value})}/></label>:null}
 <details className="canvas-precision"><summary>정밀 조절</summary><div> {([['x','가로 위치',13.28],['y','세로 위치',7.45],['w','너비',SLIDE.w],['h','높이',SLIDE.h]] as const).map(([field,label,max])=><label key={field}>{label}<input type="number" aria-label={label} step={.1} min={field==='x'||field==='y'?0:.15} max={max} value={Number(node[field].toFixed(2))} onChange={e=>{const v=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(v)&&v>=(field==='x'||field==='y'?0:.15)&&v<=max)patch({[field]:v});}}/></label>)}</div></details>
 <button type="button" onClick={()=>{if(selected===null)return;commit(clearCanvasNode(latest.current,base[selected]));setSelected(null);}}><RotateCcw size={13}/>원래대로</button><button type="button" className="canvas-done" onClick={()=>{setEditing(false);setSelected(null);}}><Check size={14}/>완료</button><button type="button" aria-label="요소 편집 닫기" onClick={()=>setSelected(null)}><X size={14}/></button></div>}
 </div>;
}
