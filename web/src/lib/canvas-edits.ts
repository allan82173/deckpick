import {z} from "zod";
import type {SceneNode} from "./scene";
import type {SlideSpec} from "./model";
export const canvasEditSchema=z.object({
  text:z.string().max(3000).optional(),
  color:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  fill:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  bold:z.boolean().optional(),size:z.number().min(6).max(96).optional(),
  x:z.number().min(0).max(13.333333).optional(),y:z.number().min(0).max(7.5).optional(),
  w:z.number().min(.05).max(13.333333).optional(),h:z.number().min(.05).max(7.5).optional(),
});
export const canvasEditsSchema=z.record(z.string().max(3500),canvasEditSchema).optional();
export type CanvasEdit=z.infer<typeof canvasEditSchema>;
export function sceneNodeKey(node:SceneNode,_index:number){
  return JSON.stringify([node.kind,node.x,node.y,node.w,node.h,node.kind==="text"?node.text:node.kind==="image"?node.src:""]);
}
export function applyCanvasEdits(nodes:SceneNode[],edits:Record<string,CanvasEdit>|undefined):SceneNode[]{
  if(!edits)return nodes;
  const old=Object.entries(edits).flatMap(([key,value])=>{try{const parts:unknown=JSON.parse(key);return Array.isArray(parts)&&parts.length===6?[{parts,value}]:[];}catch{return [];}});
  return nodes.map((node,index)=>{
    const exact=edits[sceneNodeKey(node,index)];
    const identity=node.kind==="text"?node.text:node.kind==="image"?node.src:"";
    const compatible=old.filter(({parts})=>parts[0]===node.kind&&String(parts[5]).replace(/\s+/g," ").trim()===identity.replace(/\s+/g," ").trim()&&Math.abs(Number(parts[1])-node.x)<.25&&Math.abs(Number(parts[2])-node.y)<.25).sort((a,b)=>(Math.abs(Number(a.parts[1])-node.x)+Math.abs(Number(a.parts[2])-node.y))-(Math.abs(Number(b.parts[1])-node.x)+Math.abs(Number(b.parts[2])-node.y)));
    const edit=exact??compatible[0]?.value;if(!edit)return node;
    const {x=node.x,y=node.y,w=node.w,h=node.h}=edit;
    const left=Math.min(x,13.333333-.05),top=Math.min(y,7.5-.05);
    const geometry={x:left,y:top,w:Math.min(w,13.333333-left),h:Math.min(h,7.5-top)};
    if(node.kind==="text")return {...node,...geometry,oneLine:node.oneLine&&Math.abs(geometry.w-node.w)<.001,text:edit.text??node.text,color:edit.color??node.color,size:edit.size??node.size,bold:edit.bold??node.bold};
    if(node.kind==="image")return {...node,...geometry};
    return {...node,...geometry,fill:edit.fill??node.fill,stroke:node.stroke?edit.fill??node.stroke:undefined};
  });
}
export function canvasTextChanges(slide:SlideSpec){
  return Object.entries(slide.canvasEdits??{}).flatMap(([key,edit])=>{
    if(edit.text===undefined)return [];
    try{const parts:unknown=JSON.parse(key);if(Array.isArray(parts)&&parts[0]==="text")return [{before:String(parts.at(-1)),after:edit.text}];}catch{/* Ignore malformed stale keys. */}
    return [];
  });
}
export function canvasHeadline(slide:SlideSpec){const title=String(slide.layoutId==="c-cover"?slide.data.title:slide.layoutId==="m-cover"?slide.data.product:slide.headline);const normalize=(s:string)=>s.replace(/\s+/g," ").trim();return canvasTextChanges(slide).find(e=>normalize(e.before)===normalize(title))?.after??normalize(title);}
export function clearCanvasNode(slide:SlideSpec,original:SceneNode):SlideSpec{
  const edits={...slide.canvasEdits};const identity=original.kind==="text"?original.text:original.kind==="image"?original.src:"";
  for(const key of Object.keys(edits)){try{const p:unknown=JSON.parse(key);if(Array.isArray(p)&&p[0]===original.kind&&String(p[5]).replace(/\s+/g," ").trim()===identity.replace(/\s+/g," ").trim()&&Math.abs(Number(p[1])-original.x)<.25&&Math.abs(Number(p[2])-original.y)<.25)delete edits[key];}catch{}}
  return {...slide,canvasEdits:edits};
}
/** Merge into the latest saved element, never an older render's geometry/text. */
export function patchCanvasNode(slide:SlideSpec,original:SceneNode,edit:CanvasEdit):SlideSpec{
  const current=applyCanvasEdits([original],slide.canvasEdits)[0],cleared=clearCanvasNode(slide,original),key=sceneNodeKey(original,0);
  return {...cleared,...(!Object.keys(slide.canvasEdits??{}).length?{rendererVersion:"adaptive-v3" as const}:{}),canvasEdits:{...cleared.canvasEdits,[key]:{x:current.x,y:current.y,w:current.w,h:current.h,...(current.kind==="text"?{text:current.text,color:current.color,size:current.size,bold:current.bold}:current.kind!=="image"?{fill:current.fill}:{}),...canvasEditSchema.parse(edit)}}};
}
