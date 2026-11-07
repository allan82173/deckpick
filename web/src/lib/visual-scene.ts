import { placePositionLabels } from "./positioning-labels";
import {equalTracks} from "./layout-grid";
import type { DesignSystem, SlideSpec } from "./model";
import type { SceneNode } from "./scene";
import { visualKind, visualDataSchemas as schema } from "./visual-model";
type Draw = {
  nodes: SceneNode[];
  box: (x:number,y:number,w:number,h:number,fill:string,stroke?:string)=>unknown;
  txt: (text:string,x:number,y:number,w:number,h:number,size?:number,color?:string,bold?:boolean,align?:"left"|"center"|"right")=>unknown;
  line: (x:number,y:number,w:number,color:string,width?:number)=>unknown;
};
export function drawVisual(slide:SlideSpec,c:DesignSystem["colors"],g:Draw):boolean {
  const kind=visualKind(slide.layoutId); if(!kind) return false;
  const {box,txt,line,nodes}=g;
  const arrow=(x:number,y:number,w=.3)=>nodes.push({kind:"triangle",x,y,w,h:.24,fill:c.connector,rotate:90});
  const vertical=(x:number,y:number,h:number)=>nodes.push({kind:"line",x,y,w:0,h,fill:c.connector,stroke:c.connector,strokeWidth:1});
  const bar=(text:string)=>{box(.42,6.28,12.49,.51,c.darkest);txt(text,.63,6.4,12.06,.3,11,"#FFFFFF",true);};
  const header=(title:string,x:number,y:number,w:number)=>{box(x,y,w,.43,c.primary);txt(title,x+.12,y+.09,w-.24,.27,12,"#FFFFFF",true);};
  switch(kind){
    case "journey": {
      const d=schema.journey.parse(slide.data), w=(12.49-(d.stages.length-1)*.2)/d.stages.length;
      d.stages.forEach((s,i)=>{const x=.42+i*(w+.2); header(`${i+1} ${s.title}`,x,1.92,w);box(x,2.35,w,3.53,"#FFFFFF",i===d.focus?c.primary:c.tint);txt("고객 행동",x+.14,2.6,w-.28,.3,10,c.muted,true);txt(s.action,x+.14,3,w-.28,.8,12);txt(s.touchpoint,x+.14,4,w-.28,.5,11,c.primary,true);box(x+.1,4.8,w-.2,.85,i===d.focus?c.tint:c.panel);txt(s.friction,x+.2,4.98,w-.4,.5,11);if(i<d.stages.length-1)arrow(x+w,3.5,.2);});bar(d.takeaway);break;
    }
    case "cause-tree": {
      const d=schema["cause-tree"].parse(slide.data);txt(d.status==="hypothesis"?"검증 전 원인 가설":"제공 근거를 정리한 원인 구조",.42,1.75,12,.3,11,c.muted);
      box(.42,3.3,2.6,1.5,c.primary);txt(d.problem,.65,3.63,2.14,.9,15,"#FFFFFF",true);line(3.02,4.05,.5,c.connector);vertical(3.52,2.6,2.9);
      d.branches.forEach((b,i)=>{const y=2+i*1.45;line(3.52,y+.6,.5,c.connector);box(4.02,y,2.55,1.2,c.tint);txt(b.title,4.2,y+.35,2.19,.5,13,c.darkest,true);line(6.57,y+.6,.5,c.connector);b.causes.forEach((cause,j)=>{const track=equalTracks(y,1.2,b.causes.length,.08)[j];box(7.07,track.start,5.84,track.size,c.panel);txt(cause,7.2,track.start+(track.size-.24)/2,5.57,.24,10);});});bar(d.takeaway);break;
    }
    case "cause-chain": {
      const d=schema["cause-chain"].parse(slide.data);const xs=[.42,4.68,8.94],w=3.97;
      xs.forEach((x,i)=>{header(["문제 상황","원인 가설","검증 질문"][i],x,1.94,w);box(x,2.37,w,3.56,"#FFFFFF",c.tint);if(i<2)arrow(x+w,3.8,.28);});box(.63,2.65,3.55,1.13,c.panel);txt(d.situation,.83,2.87,3.15,.75,14,c.darkest,true);d.observations.forEach((v,i)=>txt(`${i+1}  ${v}`,.7,4.05+i*.48,3.4,.4,11));
      [d.causes,d.tests].forEach((rows,k)=>rows.forEach((v,i)=>{const x=xs[k+1]+.18,y=2.65+i*1.02;box(x,y,3.61,.87,k?c.tint:c.panel);txt(v.title,x+.12,y+.1,3.37,.25,12,c.primary,true);txt(v.body,x+.12,y+.4,3.37,.4,10);}));bar(d.takeaway);break;
    }
    case "positioning": {
      const d=schema.positioning.parse(slide.data);box(.8,2.05,7.15,3.62,"#FFFFFF",c.tint);line(.8,3.86,7.15,c.tint);vertical(4.375,2.05,3.62);txt(d.xAxis,.8,5.83,7.15,.3,11,c.primary,true,"center");txt(d.yAxis,.8,1.69,7.15,.3,11,c.primary,true);txt("낮음 → 높음",.8,6.16,7.15,.25,10,c.muted,false,"center");
      const positions = Object.keys(slide.canvasEdits ?? {}).length ? d.items.map(v => ({ x: 1.02 + v.x * 5.05, y: 5.03 - v.y * 2.78, w: 1.68, h: .5, anchorX: 1.86 + v.x * 5.05, anchorY: 5.28 - v.y * 2.78 })) : placePositionLabels(d.items);
      positions.forEach(p => {
        if (Math.abs(p.x + .84 - p.anchorX) + Math.abs(p.y + .25 - p.anchorY) < .01) return;
        const centerX = p.x + .84, centerY = p.y + .25;
        line(Math.min(p.anchorX, centerX), p.anchorY, Math.abs(p.anchorX - centerX), c.muted, .6);
        vertical(centerX, Math.min(p.anchorY, centerY), Math.abs(p.anchorY - centerY));
        nodes.push({ kind: "ellipse", x: p.anchorX - .035, y: p.anchorY - .035, w: .07, h: .07, fill: c.primary });
      });
      d.items.forEach((v, i)=>{const {x,y}=positions[i];box(x,y,1.68,.5,v.highlight?c.primary:c.panel,c.primary);txt(v.name,x+.08,y+.1,1.52,.31,10,v.highlight?"#FFFFFF":c.darkest,v.highlight,"center");});header("축과 위치를 정한 이유",8.5,2.05,4.4);box(8.5,2.48,4.4,3.19,c.panel);txt(d.rationale,8.73,2.9,3.94,1.8,14);txt(d.status==="hypothesis"?"가설 위치 · 검증 필요":"제공 근거에 따른 상대 위치",8.73,5.14,3.94,.3,11,c.primary,true);break;
    }
    case "system-flow": {
      const d=schema["system-flow"].parse(slide.data);header("입력·근거",.42,1.94,3.55);d.inputs.forEach((s,i)=>{box(.42,2.65+i*.58,3.55,.45,c.panel);txt(s,.6,2.76+i*.58,3.19,.25,11);});arrow(4.12,3.61,.48);box(4.82,2.95,3.65,2,c.primary);txt(d.layer,5.08,3.25,3.13,.7,17,"#FFFFFF",true,"center");txt(d.layerBody,5.08,4.08,3.13,.58,11,"#FFFFFF",false,"center");arrow(8.65,3.61,.48);header("결과·판단",9.35,1.94,3.55);d.outputs.forEach((s,i)=>{box(9.35,3+i*.83,3.55,.64,c.tint);txt(s,9.55,3.18+i*.83,3.15,.3,12,c.darkest,true);});bar(d.principle);break;
    }
    case "system-compare": {
      const d=schema["system-compare"].parse(slide.data);d.panels.forEach((p,i)=>{const x=.42+i*6.55,w=5.94;header(p.title,x,1.94,w);box(x,2.37,w,3.56,"#FFFFFF",c.tint);p.inputs.forEach((v,j)=>{box(x+.18,2.8+j*.49,1.65,.4,c.panel);txt(v,x+.25,2.88+j*.49,1.51,.25,10);});arrow(x+1.94,3.49,.25);box(x+2.28,3.05,1.66,1.28,i?c.primary:c.muted);txt(p.layer,x+2.4,3.35,1.42,.7,12,"#FFFFFF",true,"center");arrow(x+4.04,3.49,.25);box(x+4.38,3.05,1.38,1.28,c.panel,c.primary);txt(p.output,x+4.5,3.35,1.14,.7,11,c.darkest,true,"center");line(x+.18,5.16,5.58,c.tint);txt(p.note,x+.18,5.38,5.58,.4,11,c.primary);});bar(d.takeaway);break;
    }
    case "swimlane": {
      const d=schema.swimlane.parse(slide.data), w=(12.49-(d.steps.length-1)*.18)/d.steps.length;
      d.steps.forEach((s,i)=>{const x=.42+i*(w+.18);box(x,1.8,w,.32,c.tint);txt(s.owner,x+.1,1.86,w-.2,.21,10,c.primary,true,"center");header(`${i+1} ${s.title}`,x,2.26,w);box(x,2.69,w,2.12,"#FFFFFF",c.primary);txt(s.body,x+.14,3.13,w-.28,1.24,12);box(x,5.12,w,.65,c.panel);txt(s.record,x+.12,5.31,w-.24,.37,10,c.muted);if(i<d.steps.length-1)arrow(x+w,3.58,.18);});bar(d.principle);break;
    }
    case "before-after": {
      const d=schema["before-after"].parse(slide.data);txt(d.status==="proposal"?"현재와 제안 비교 · 개선 효과 미검증":"제공한 측정 결과 비교",.42,1.73,12,.3,11,c.muted);
      const labelX=.42,labelW=2.05,columns=equalTracks(labelX+labelW+.2,10.24,2,.2);
      header("비교 기준",labelX,2.16,labelW);header(d.beforeTitle,columns[0].start,2.16,columns[0].size);header(d.afterTitle,columns[1].start,2.16,columns[1].size);
      const rows=equalTracks(2.73,3.38,d.rows.length,.12);
      d.rows.forEach((r,i)=>{const {start:y,size:h}=rows[i];box(labelX,y,labelW,h,c.tint);txt(r.label,labelX+.14,y+.18,labelW-.28,h-.28,11,c.primary,true);[r.before,r.after].forEach((text,j)=>{const {start:x,size:w}=columns[j];box(x,y,w,h,c.panel);txt(text,x+.18,y+.16,w-.36,h-.26,11);});});bar(d.takeaway);break;
    }
    case "trend": {
      const d=schema.trend.parse(slide.data);txt(`${d.seriesName} · 단위: ${d.unit}`, .7,1.77,11.9,.3,12,c.primary,true);txt(d.mode==="illustrative"?"합성 데이터 · 실제 성과 아님":"제공 자료의 실측 값",.7,2.15,11.9,.3,11,c.muted);const max=Math.max(...d.points.map(p=>p.value),1),step=11.8/d.points.length;
      line(.8,5.7,11.8,c.muted);d.points.forEach((p,i)=>{const x=.8+(i+.225)*step,h=p.value/max*2.65;box(x,5.7-h,step*.55,h,c.primary);txt(String(p.value),x-.1*step,5.32-h,step*.75,.28,11,c.primary,true,"center");txt(p.period,x-.15*step,5.86,step*.85,.3,10,c.muted,false,"center");});bar(d.takeaway);break;
    }
  }
  return true;
}
