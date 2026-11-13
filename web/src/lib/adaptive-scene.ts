import {analyticalSchemas} from "./analytical-layouts";
import {expandedSchemas} from "./expanded-layouts";
import {GENERATION_CONFIG} from "./generation-config";
import {richLines,type SceneNode} from "./scene";
import type {DesignSystem,SlideSpec} from "./model";
type G={nodes:SceneNode[];box:(x:number,y:number,w:number,h:number,fill:string,stroke?:string)=>unknown;txt:(text:string,x:number,y:number,w:number,h:number,size?:number,color?:string,bold?:boolean,align?:"left"|"center"|"right")=>unknown};
export function needsAdaptiveBody(slide:SlideSpec,nodes:SceneNode[],warnings:string[]){return GENERATION_CONFIG.rendererRepair.layouts.includes(slide.layoutId)&&(!Object.keys(slide.canvasEdits??{}).length||(slide.rendererVersion==="adaptive-v3"||slide.rendererVersion==="adaptive-v4"))&&((slide.rendererVersion!=="adaptive-v3"&&slide.layoutId==="c-comparison-table"&&Array.isArray(slide.data.alternatives)&&slide.data.alternatives.some((a:any)=>Array.isArray(a.values)&&a.values.some((v:string)=>richLines(v,12,(12.49-2.2)/(slide.data.alternatives as unknown[]).length-.2).length>2)))||warnings.some(w=>/텍스트가 길어/.test(w))||nodes.some(n=>n.kind==="text"&&richLines(n.text,n.size,n.w,n.oneLine).length*n.size*n.lineHeight/72>n.h+GENERATION_CONFIG.visual.toleranceInches));}
/** Adjust coordinates from the actual text. Never shorten claims or change numbers. */
export function drawAdaptiveBody(slide:SlideSpec,c:DesignSystem["colors"],g:G){
 const baseConfig=GENERATION_CONFIG.rendererRepair,q=slide.rendererVersion==="adaptive-v3"?{...baseConfig,safety:baseConfig.compactSafety}:baseConfig,{box,txt}=g,X=.42,W=12.49;
 const height=(s:string,w:number,pt=q.bodyPt)=>richLines(s,pt,w).length*pt*1.25/72+q.safety;
 const text=(s:string,x:number,y:number,w:number,pt=q.bodyPt,color=c.darkest,bold=false)=>{const h=height(s,w,pt);txt(s,x,y,w,h,pt,color,bold);return h;};
 const cell=(s:string,x:number,y:number,w:number,h:number,heading=false,pt=q.bodyPt)=>{box(x,y,w,h,heading?c.primary:c.panel,c.connector);text(s,x+q.padding,y+q.padding,w-2*q.padding,pt,heading?"#FFFFFF":c.darkest,heading);};
 const conclusion=(s:string)=>{const h=Math.max(.55,height(s,W-2*q.padding)+2*q.padding),y=q.bottom-h;box(X,y,W,h,c.darkest);text(s,X+q.padding,y+q.padding,W-2*q.padding,q.bodyPt,"#FFFFFF",true);return y;};
 if(slide.layoutId==="c-comparison-table"){
  const d=analyticalSchemas["comparison-table"].parse(slide.data),bar=conclusion(d.takeaway),labelW=2.2,cw=(W-labelW)/d.alternatives.length;
  let pt=q.bodyPt;const hh=Math.max(.55,...d.alternatives.map(a=>height(a.name,cw-2*q.padding)+2*q.padding));const top=q.top+hh,available=bar-q.gap-top;
  let needs=d.criteria.map((s,i)=>Math.max(height(s,labelW-2*q.padding,pt),...d.alternatives.map(a=>height(a.values[i],cw-2*q.padding,pt)))+2*q.padding);
  if(needs.reduce((a,b)=>a+b,0)>available){pt=q.minBodyPt;needs=d.criteria.map((s,i)=>Math.max(height(s,labelW-2*q.padding,pt),...d.alternatives.map(a=>height(a.values[i],cw-2*q.padding,pt)))+2*q.padding);}
  if(slide.rendererVersion!=="adaptive-v3"&&needs.reduce((a,b)=>a+b,0)>available){pt=q.denseBodyPt;needs=d.criteria.map((s,i)=>Math.max(height(s,labelW-2*q.padding,pt),...d.alternatives.map(a=>height(a.values[i],cw-2*q.padding,pt)))+2*q.padding);}
  cell("비교 기준",X,q.top,labelW,hh,true);d.alternatives.forEach((a,i)=>cell(a.name,X+labelW+i*cw,q.top,cw,hh,true));let y=top;const spare=Math.max(0,available-needs.reduce((a,b)=>a+b,0))/needs.length;
  d.criteria.forEach((s,r)=>{const h=needs[r]+spare;cell(s,X,y,labelW,h,false,pt);d.alternatives.forEach((a,i)=>cell(a.values[r],X+labelW+i*cw,y,cw,h,false,pt));y+=h;});return true;
 }
 if(slide.layoutId==="c-argument-board"){
  const d=analyticalSchemas["argument-board"].parse(slide.data),bar=conclusion(d.takeaway),insightH=text(d.insight,X,1.65,W,q.bodyPt,c.primary,true),top=Math.max(2.1,1.65+insightH+q.gap),w=(W-q.gap*(d.panels.length-1))/d.panels.length,hh=Math.max(.5,...d.panels.map(p=>height(p.title,w-2*q.padding)+2*q.padding));
  const inner=w-2*q.padding;
  const compact=slide.rendererVersion!=="adaptive-v3"&&d.panels.some(p=>{
   const available=bar-q.gap-(p.assumption?height(p.assumption,inner,q.denseBodyPt)+q.padding:0)-(top+hh+q.padding);
   return p.rows.reduce((sum,r)=>sum+Math.max(height(r.label,inner*.55,q.denseBodyPt),height(r.value,inner*.40,q.denseBodyPt))+height(r.detail,inner,q.denseBodyPt)+2*q.denseGap,0)>available;
  });
  if(compact){
   const pt=q.denseBodyPt,ch=(s:string)=>richLines(s,pt,inner).length*pt*1.25/72+q.compactSafety;
   d.panels.forEach((p,i)=>{const x=X+i*(w+q.gap),ah=p.assumption?ch(p.assumption)+q.padding:0,bottom=bar-q.gap-ah;
    cell(p.title,x,top,w,hh,true);box(x,top+hh,w,bar-q.gap-top-hh,"#FFFFFF",c.connector);
    const rows=p.rows.map(r=>({header:[r.label,r.value].filter(Boolean).join(" · "),detail:r.detail.replace(/\n+/g," · ")}));
    let y=top+hh+q.padding;const needed=rows.map(r=>ch(r.header)+q.denseGap+ch(r.detail)+q.denseGap),spare=Math.max(0,bottom-y-needed.reduce((a,b)=>a+b,0))/rows.length;
    rows.forEach((r,j)=>{const hh=ch(r.header),dh=ch(r.detail);txt(r.header,x+q.padding,y,inner,hh,pt,c.primary,true);txt(r.detail,x+q.padding,y+hh+q.denseGap,inner,dh,pt,c.darkest);y+=needed[j]+spare;});
    if(p.assumption)txt(p.assumption,x+q.padding,bottom,inner,ch(p.assumption),pt,c.muted);
   });return true;
  }
  d.panels.forEach((p,i)=>{const x=X+i*(w+q.gap),inner=w-2*q.padding;cell(p.title,x,top,w,hh,true);box(x,top+hh,w,bar-q.gap-top-hh,"#FFFFFF",c.connector);const ah=p.assumption?height(p.assumption,inner,q.denseBodyPt)+q.padding:0;const bottom=bar-q.gap-ah;let y=top+hh+q.padding;
   let pt=q.minBodyPt,gap=q.gap;
   const measure=()=>p.rows.map(r=>{const header=Math.max(height(r.label,inner*.55,pt),height(r.value,inner*.40,pt));return {r,header,need:header+gap+height(r.detail,inner,pt)+gap};});
   let rows=measure();if(rows.reduce((n,r)=>n+r.need,0)>bottom-y){pt=q.denseBodyPt;gap=q.denseGap;rows=measure();}
   const spare=Math.max(0,bottom-y-rows.reduce((n,r)=>n+r.need,0))/rows.length;
   rows.forEach(({r,header,need})=>{text(r.label,x+q.padding,y,inner*.55,pt,c.primary,true);text(r.value,x+q.padding+inner*.60,y,inner*.40,pt,c.primary,true);text(r.detail,x+q.padding,y+header+gap,inner,pt);y+=need+spare;});
   if(p.assumption)text(p.assumption,x+q.padding,bar-q.gap-ah,inner,q.denseBodyPt,c.muted);
  });return true;
 }
 if(slide.layoutId==="c-metrics-panel"){
  const d=expandedSchemas["metrics-panel"].parse(slide.data),bar=conclusion(d.takeaway),left=7.65,labelW=1.95,valueW=left-labelW-3*q.padding,available=bar-q.gap-q.top;
  const rows=d.metrics.map(m=>{let pt=q.metricValuePt;while(pt>q.minMetricValuePt&&height(m.value,valueW,pt)>.48)pt--;const vh=height(m.value,valueW,pt),mh=height(m.meaning,valueW,q.minBodyPt);return {m,pt,vh,need:Math.max(height(m.label,labelW-2*q.padding),vh+q.gap+mh)+2*q.padding};});
  const spare=Math.max(0,available-rows.reduce((n,r)=>n+r.need,0))/rows.length;let y=q.top;
  rows.forEach(({m,pt,vh,need})=>{const h=need+spare;cell(m.label,X,y,labelW,h-q.gap,false);box(X+labelW+q.gap,y,left-labelW-q.gap,h-q.gap,"#FFFFFF",c.connector);text(m.value,X+labelW+2*q.padding,y+q.padding,valueW,pt,c.primary,true);text(m.meaning,X+labelW+2*q.padding,y+q.padding+vh+q.gap,valueW,q.minBodyPt);y+=h;});
  const px=8.65,pw=4.26,ph=Math.max(.4,height(d.panelTitle,pw-2*q.padding)+2*q.padding);cell(d.panelTitle,px,q.top,pw,ph,true);box(px,q.top+ph,pw,available-ph,c.panel);let py=q.top+ph+q.padding;const needed=d.panel.map(s=>height(s,pw-2*q.padding,q.minBodyPt));const space=Math.max(q.gap,(available-ph-2*q.padding-needed.reduce((a,b)=>a+b,0))/Math.max(1,d.panel.length));d.panel.forEach((s,i)=>{text(s,px+q.padding,py,pw-2*q.padding,q.minBodyPt);py+=needed[i]+space;});
  if(d.tag){box(11.7,1.55,1.13,.25,c.tint);txt(d.tag,11.74,1.575,1.05,.22,10,c.primary,true);}return true;
 }
 return false;
}
