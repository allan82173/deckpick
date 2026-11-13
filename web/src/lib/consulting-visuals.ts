import { z } from "zod";
import type { DesignSystem, SlideSpec } from "./model";
import type { SceneNode } from "./scene";
import { chartPreviewDataUrl, type NativeChart } from "./native-charts";

const short=z.string().min(1).max(34), phrase=z.string().min(1).max(84);
const takeaway=z.string().min(1).max(110);
const nature=z.enum(["공개 사실","내부 전제","추론","가설","계산"]);
const common={takeaway,tag:nature.optional()};
const pie=z.object({title:short,denominator:phrase,period:short,items:z.array(z.object({label:z.string().min(1).max(24),value:z.number().finite().nonnegative()})).min(2).max(6),unit:short,insight:phrase}).refine(v=>v.items.reduce((n,x)=>n+x.value,0)>0,"구성비 분모가 0입니다.").refine(v=>!/%|퍼센트/.test(v.unit)||Math.abs(v.items.reduce((n,x)=>n+x.value,0)-100)<.11,"점유율은 같은 분모에서 합계 100이어야 합니다.");
export const consultingVisualSchemas={
 "numbered-agenda":z.object({steps:z.array(z.object({title:short,question:phrase})).min(3).max(5),...common}),
 "priority-path":z.object({first:z.object({action:short,reason:phrase,result:phrase}),parallel:z.object({action:short,reason:phrase,result:phrase}),later:z.object({action:short,trigger:phrase,result:phrase}),...common}),
 "share-comparison":z.object({panels:z.array(pie).min(1).max(3),trend:z.object({title:short,unit:short,categories:z.array(short).min(2).max(5),series:z.array(z.object({name:short,values:z.array(z.number().finite()).min(2).max(5)})).min(1).max(2)}).refine(v=>v.series.every(s=>s.values.length===v.categories.length),"추세 기간과 계열 수가 다릅니다.").optional(),...common}),
 "service-ecosystem":z.object({sources:z.array(z.object({name:short,entry:phrase})).min(3).max(5),hub:z.object({name:short,job:phrase}),services:z.array(short).min(2).max(4),value:phrase,relation:z.enum(["확인된 연결","제안 구조"]),...common}),
 "spotlight-comparison":z.object({options:z.array(z.object({name:short,finding:phrase,implication:phrase})).min(2).max(4),focus:z.number().int().min(0).max(3),verdict:z.string().min(1).max(64),...common}).refine(v=>v.focus<v.options.length,"강조할 대안을 확인하세요."),
 "end-divider":z.object({label:z.enum(["E.O.D.","Appendix"]),subtitle:phrase,...common}),
};
export const consultingVisualRegistry={
 "numbered-agenda":{name:"번호형 가로 목차",stage:1,reference:64,roles:["흐름","합의 사항"],use:"분석의 3~5단계와 각 단계가 답할 질문을 한 줄 흐름으로 안내",avoid:"분석 결과나 실행 순위를 목차로 대체할 때",minimum:"단계3~5, 짧은 이름과 각 단계의 질문"},
 "priority-path":{name:"먼저·병행·조건 후 우선순위",stage:1,reference:65,roles:["판단","우선순위","마무리"],use:"지금 먼저 실행할 일, 병행할 일, 조건 충족 후 확대할 일을 구별",avoid:"세 항목이 시간·우선순위 관계가 없을 때",minimum:"먼저·병행·조건후 각각의 행동과 이유·결과"},
 "share-comparison":{name:"분모별 원 점유율 비교",stage:2,reference:66,roles:["사실 제시","비교","판단"],use:"100% 구성비를 서로 다른 연도·집단별 원으로 비교, 필요시 금액 추세와 결합",avoid:"분모가 다른 비율을 한 원에 합칠 때, 합계100이 아닌 점유율을 만들 때",minimum:"같은 분모 내 항목2~6개, 패널1~3개, 분모·기간·단위·수치"},
 "service-ecosystem":{name:"외부 접점의 자사 서비스 유입",stage:3,reference:67,roles:["흐름","판단","비교"],use:"여러 외부 플레이어·유입 경로가 하나의 자사 과업·서비스에 연결되는 구조",avoid:"확인하지 않은 제휴·서비스 연동을 현재 사실처럼 그릴 때",minimum:"유입3~5, 중심 과업1, 연결 서비스2~4, 확인/제안 구분"},
 "spotlight-comparison":{name:"대안 비교와 선택 강조막",stage:3,reference:68,roles:["판단","비교","우선순위"],use:"동일 비교 틀을 유지하고 선택된 대안 하나에 시선을 모을 때",avoid:"기각 대안의 불리한 정보를 숨기거나 전체 내용을 읽어야 하는 장",minimum:"대안2~4, 각 대안의 발견·의미, 선택1, 결론"},
 "end-divider":{name:"E.O.D.·Appendix 구분",stage:4,reference:69,roles:["마무리","합의 사항","근거"],use:"본 발표 종료와 참고자료 시작을 분리",avoid:"분석·근거를 이 구분 장으로 대체할 때",minimum:"E.O.D. 또는 Appendix, 짧은 안내"},
};
type G={nodes:SceneNode[];box:(x:number,y:number,w:number,h:number,fill:string,stroke?:string)=>unknown;txt:(t:string,x:number,y:number,w:number,h:number,size?:number,color?:string,bold?:boolean,align?:"left"|"center"|"right")=>unknown;line:(x:number,y:number,w:number,color:string,width?:number)=>unknown};
export function drawConsultingVisual(slide:SlideSpec,c:DesignSystem["colors"],g:G):boolean{
 const k=slide.layoutId.slice(2) as keyof typeof consultingVisualSchemas;if(!(k in consultingVisualSchemas))return false;
 const {box,txt,line,nodes}=g,X=.42,Y=1.94,W=12.49;
 const end=(t:string)=>{box(X,6.3,W,.55,c.darkest);txt(t,X+.16,6.4,W-.32,.34,12,"#FFFFFF",true);};
 const circle=(x:number,y:number,d:number,color:string)=>nodes.push({kind:"ellipse",x,y,w:d,h:d,fill:color});
 const arrow=(x:number,y:number,w=.3,h=.24)=>nodes.push({kind:"triangle",x,y,w,h,fill:c.connector,rotate:90});
 const chart=(d:NativeChart,x:number,y:number,w:number,h:number)=>nodes.push({kind:"image",x,y,w,h,src:chartPreviewDataUrl(d,c,w/h,{w,h}),alt:d.series.map(s=>s.name).join(" / "),chart:d});
 switch(k){
 case "numbered-agenda":{
  const d=consultingVisualSchemas[k].parse(slide.data),step=W/d.steps.length,y=2.95;
  line(X+.3,y+.24,W-.6,c.primary,2);
  d.steps.forEach((s,i)=>{const x=X+step*i;circle(x+.1,y,.5,c.primary);txt(String(i+1),x+.1,y+.09,.5,.3,16,"#FFFFFF",true,"center");txt(s.title,x+.05,y+.72,step-.22,.7,19,c.primary,true);txt(s.question,x+.05,y+1.6,step-.3,1.05,14,c.darkest);});end(d.takeaway);break;
 }
 case "priority-path":{
  const d=consultingVisualSchemas[k].parse(slide.data),widths=[5.1,3.3,3.3],xx=[X,X+5.5,X+9.1];
  box(xx[0],Y,widths[0],3.85,c.primary);txt("01  먼저",xx[0]+.25,Y+.22,4.6,.35,15,"#FFFFFF",true);txt(d.first.action,xx[0]+.25,Y+.94,4.5,.85,27,"#FFFFFF",true);txt(d.first.reason,xx[0]+.25,Y+2.05,4.5,.7,15,"#FFFFFF");txt(d.first.result,xx[0]+.25,Y+3.03,4.5,.5,16,"#FFFFFF",true);
  [d.parallel,d.later].forEach((v,i)=>{const x=xx[i+1];line(x,Y+.35,widths[i+1],c.primary,2);txt(i?"03  조건 충족 후":"02  병행",x,Y+.58,widths[i+1],.42,15,c.primary,true);txt(v.action,x,Y+1.25,widths[i+1]-.12,.75,21,c.darkest,true);txt("reason" in v?v.reason:v.trigger,x,Y+2.18,widths[i+1]-.12,.76,14,c.muted);txt(v.result,x,Y+3.15,widths[i+1]-.12,.6,15,c.primary,true);});arrow(X+5.16,Y+1.65);arrow(X+8.82,Y+1.65);end(d.takeaway);break;
 }
 case "share-comparison":{
  const d=consultingVisualSchemas[k].parse(slide.data),hasTrend=!!d.trend,start=hasTrend?6.95:X,available=hasTrend?5.96:W,gap=.2,pw=(available-gap*(d.panels.length-1))/d.panels.length;
  if(d.panels.length===1&&!hasTrend){const p=d.panels[0],x=X+7.1;chart({kind:"pie",categories:p.items.map(v=>v.label),series:[{name:p.title,values:p.items.map(v=>v.value)}],unit:p.unit,compact:true},X,Y+.1,6.35,3.95);txt(p.title,x,Y+.2,4.9,.55,23,c.primary,true);txt(`${p.period} · ${p.denominator}`,x,Y+.94,4.9,.7,14,c.muted);const sum=p.items.reduce((n,v)=>n+v.value,0),colors=[c.primary,c.tint,c.accent,c.muted,c.risk,c.darkest];p.items.forEach((v,j)=>{box(x,Y+1.91+j*.3,.16,.16,colors[j]);txt(`${v.label} ${(v.value/sum*100).toFixed(1)}%`,x+.3,Y+1.86+j*.3,4.5,.3,15,c.darkest);});txt(p.insight,x,Y+3.67,4.9,.45,17,c.primary,true);end(d.takeaway);break;}
  if(d.trend){txt(d.trend.title,X,Y,6.0,.4,15,c.primary,true);chart({kind:"line",categories:d.trend.categories,series:d.trend.series,unit:d.trend.unit},X,Y+.5,6.05,3.52);}
  d.panels.forEach((p,i)=>{const x=start+i*(pw+gap);txt(p.title,x,Y,pw,.4,hasTrend?13:17,c.primary,true,"center");txt(`${p.period} · ${p.denominator}`,x,Y+.44,pw,.6,hasTrend?10:12,c.muted,false,"center");
   const datum:NativeChart={kind:"pie",categories:p.items.map(v=>v.label),series:[{name:p.title,values:p.items.map(v=>v.value)}],unit:p.unit,compact:true};
   if(!hasTrend)txt(p.insight,x+.1,Y+.92,pw-.2,.34,13,c.primary,true,"center");
   chart(datum,x,Y+(hasTrend?1.05:1.32),pw,hasTrend?2.05:2.2);
   if(hasTrend){const sum=p.items.reduce((n,r)=>n+r.value,0),colors=[c.primary,c.tint,c.accent,c.muted,c.risk,c.darkest];p.items.forEach((v,j)=>{box(x,Y+3.12+j*.25,.12,.12,colors[j]);txt(`${v.label} ${(v.value/sum*100).toFixed(1)}%`,x+.18,Y+3.08+j*.25,pw-.2,.24,10,c.darkest);});}else {const sum=p.items.reduce((n,r)=>n+r.value,0),colors=[c.primary,c.tint,c.accent,c.muted,c.risk,c.darkest],cols=p.items.length>3?2:1,cw=pw/cols; p.items.forEach((v,j)=>{const lx=x+(j%cols)*cw,ly=Y+3.58+Math.floor(j/cols)*.23;box(lx+.12,ly+.04,.13,.13,colors[j]);txt(`${v.label} ${(v.value/sum*100).toFixed(1)}%`,lx+.33,ly,cw-.4,.23,cols===2?10:12,c.darkest);});}
  });end(d.takeaway);break;
 }
 case "service-ecosystem":{
  const d=consultingVisualSchemas[k].parse(slide.data),rh=3.8/d.sources.length;
  d.sources.forEach((s,i)=>{const y=Y+.05+rh*i;circle(X+.08,y+.07,.16,c.primary);txt(s.name,X+.4,y,2.6,.34,16,c.darkest,true);txt(s.entry,X+.4,y+.39,2.6,.45,12,c.muted);nodes.push({kind:"line",x:X+3.12,y:Math.min(y+.3,Y+1.9),w:1.36,h:Math.abs(Y+1.9-(y+.3)),flipV:y+.3>Y+1.9,fill:c.connector,strokeWidth:1.2});});arrow(X+4.32,Y+1.77,.38,.3);
  circle(X+4.8,Y+.6,2.7,c.primary);txt(d.hub.name,X+5.04,Y+1.12,2.22,.7,23,"#FFFFFF",true,"center");txt(d.hub.job,X+5.03,Y+2.03,2.24,.67,13,"#FFFFFF",false,"center");
  const sx=X+8.15;line(sx,Y+.27,4.0,c.primary,2);txt(d.relation,sx,Y+.48,4.0,.32,11,c.muted);d.services.forEach((s,i)=>{circle(sx,Y+1.07+i*.58,.17,c.primary);txt(s,sx+.33,Y+1.01+i*.58,3.58,.45,18,c.primary,true);});txt(d.value,sx,Y+3.47,4.02,.57,14,c.darkest,true);arrow(X+7.72,Y+1.77,.3,.3);end(d.takeaway);break;
 }
 case "spotlight-comparison":{
  const d=consultingVisualSchemas[k].parse(slide.data),gap=.18,pw=(W-gap*(d.options.length-1))/d.options.length;
  d.options.forEach((v,i)=>{const x=X+i*(pw+gap);box(x,Y,pw,3.7,c.panel,c.connector);box(x,Y,pw,.52,c.primary);txt(v.name,x+.15,Y+.1,pw-.3,.36,16,"#FFFFFF",true);txt(v.finding,x+.18,Y+.99,pw-.36,1.03,18,c.darkest,true);line(x+.18,Y+2.22,pw-.36,c.connector,1);txt(v.implication,x+.18,Y+2.51,pw-.36,.92,14,c.muted);if(i!==d.focus)nodes.push({kind:"rect",x,y:Y,w:pw,h:3.7,fill:c.darkest,opacity:.67});});
  const x=X+d.focus*(pw+gap);box(x,Y+3.75,pw,.07,c.primary);txt(d.verdict,X,Y+3.98,W,.28,14,c.primary,true,"center");end(d.takeaway);break;
 }
 case "end-divider":{const d=consultingVisualSchemas[k].parse(slide.data);txt(d.label,X+1,Y+.6,W-2,1.3,58,c.primary,true,"center");line(X+3.1,Y+2.2,W-6.2,c.primary,2);txt(d.subtitle,X+1.5,Y+2.7,W-3,1,20,c.darkest,false,"center");break;}
 }
 return true;
}
