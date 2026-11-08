import { expandedSchemas as S, expandedRegistry, expandedKind, dateRange, dayNumber, scenarioDays, type ExpandedKind } from "./expanded-layouts";
import { chartPreviewDataUrl, type NativeChart } from "./native-charts";
import { drawVisual } from "./visual-scene";
import { richLines, type SceneNode, type TextNode, type ShapeNode } from "./scene";
import type { SlideSpec, DesignSystem } from "./model";
type G = { nodes: SceneNode[]; box:(x:number,y:number,w:number,h:number,fill:string,stroke?:string)=>unknown; txt:(text:string,x:number,y:number,w:number,h:number,size?:number,color?:string,bold?:boolean,align?:"left"|"center"|"right")=>unknown; line:(x:number,y:number,w:number,color:string,width?:number)=>unknown };
export function drawExpanded(slide: SlideSpec,c:DesignSystem["colors"],g:G): boolean {
 const kind=expandedKind(slide.layoutId); if(!kind)return false;
 const {box,txt,line,nodes}=g, X=.42,Y=1.94,W=12.49,H=4.16;
 const tag=(s:string,x:number,y:number,w=1.13)=>{box(x,y,w,.25,c.tint);txt(s,x+.04,y+.025,w-.08,.22,10,c.primary,true);};
 const conclusion=(s:string)=>{box(X,6.3,W,.55,c.darkest);txt(s,X+.14,6.4,W-.28,.35,12,"#FFFFFF",true);};
 const header=(s:string,x:number,y:number,w:number,focus=false)=>{box(x,y,w,.4,focus?c.darkest:c.primary);txt(s,x+.1,y+.075,w-.2,.28,12,"#FFFFFF",true);};
 const cell=(s:string,x:number,y:number,w:number,h:number,focus=false,bold=false)=>{box(x,y,w,h,focus?c.tint:c.panel,c.connector);const p=h<.55?.015:.04;txt(s,x+.08,y+p,w-.16,h-2*p,12,c.darkest,bold);};
 const arrow=(x:number,y:number)=>nodes.push({kind:"triangle",x,y,w:.25,h:.2,fill:c.connector,rotate:90});
 const diamond=(x:number,y:number)=>nodes.push({kind:"rect",x,y,w:.11,h:.11,fill:c.darkest,rotate:45});
 const panel=(title:string,items:string[],x:number,y:number,w:number,h:number)=>{header(title,x,y,w);box(x,y+.4,w,h-.4,c.panel);items.forEach((s,i)=>txt(s,x+.14,y+.55+i*(h-.7)/items.length,w-.28,(h-.7)/items.length-.08,12,c.darkest));};
 const chart=(d:NativeChart,x:number,y:number,w:number,h:number)=>nodes.push({kind:"image",x,y,w,h,src:chartPreviewDataUrl(d,c),alt:`${d.kind} · 단위 ${d.unit}`,chart:d});
 const common=S[kind].parse(slide.data);if(common.tag)tag(common.tag,11.7,1.55);
 // 판단·근거 계열(stage 1) 표·칸: 글자를 칸 가운데(가로·세로)에 두고, 칸을 고르게 채우는 하나의 글자 크기로 통일한다.
 const balance=(start:number)=>{
  if(expandedRegistry[kind].stage!==1)return;
  const added=nodes.slice(start),rects=added.filter((n):n is ShapeNode=>n.kind==="rect"&&!n.rotate),texts=added.filter((n):n is TextNode=>n.kind==="text"&&!!n.text.trim());
  const inside=(t:TextNode,r:ShapeNode)=>t.x>=r.x-.02&&t.x+Math.min(t.w,.3)<=r.x+r.w+.02&&t.y>=r.y-.02&&t.y<r.y+r.h;
  const header=(r:ShapeNode)=>r.fill===c.primary||r.fill===c.darkest,small=(r:ShapeNode)=>r.h<.3||r.w<.5;
  const groups=new Map<ShapeNode,TextNode[]>();
  for(const t of texts){const owner=rects.filter(r=>inside(t,r)).sort((a,b)=>a.w*a.h-b.w*b.h)[0];if(!owner||small(owner))continue;groups.set(owner,[...(groups.get(owner)??[]),t]);}
  const height=(t:TextNode,size:number,w:number)=>richLines(t.text,size,w).length*size*1.25/72;
  const inner=(r:ShapeNode)=>{const tag=rects.find(o=>o!==r&&small(o)&&o.x>=r.x&&o.x+o.w<=r.x+r.w+.01&&o.y>=r.y&&o.y<r.y+r.h);const side=tag?tag.w+.2:.12;return {x:r.x+side,w:Math.max(.4,r.w-2*side),pad:.08};};
  const cells=[...groups].filter(([r])=>!header(r));
  let size=11;for(let s=16;s>=11;s-=.5){if(cells.every(([r,ts])=>{const b=inner(r);return ts.reduce((n,t)=>n+height(t,s,b.w),0)+(ts.length-1)*.06<=r.h-2*b.pad;})){size=s;break;}}
  for(const [r,ts] of groups){
   const b=inner(r),s=header(r)?ts[0].size:size,hs=ts.map(t=>Math.min(r.h-2*b.pad,height(t,header(r)?t.size:s,b.w)+.02)),total=hs.reduce((n,h)=>n+h,0)+(ts.length-1)*.06;
   let y=r.y+Math.max(b.pad,(r.h-total)/2);
   ts.forEach((t,i)=>{const node:TextNode={...t,x:b.x,w:b.w,y,h:hs[i],size:header(r)?t.size:s,align:"center"};nodes[nodes.indexOf(t)]=node;y+=hs[i]+.06;});
  }
 };
 const start=nodes.length;
 switch(kind){
 case "evaluation-matrix": {const d=S[kind].parse(slide.data),nameW=2.6,judgeW=2,cw=(W-nameW-judgeW)/d.criteria.length,rh=3.6/d.rows.length;
 header("대상·설명",X,Y,nameW);d.criteria.forEach((s,i)=>header(s,X+nameW+i*cw,Y,cw));header("판단",X+W-judgeW,Y,judgeW,true);
 d.rows.forEach((r,i)=>{const yy=Y+.4+i*rh,hi=i===d.highlight;cell(r.name+"\n"+r.subtitle,X,yy,nameW,rh,hi,true);r.grades.forEach((v,j)=>{const xx=X+nameW+j*cw;box(xx,yy,cw,rh,hi?c.tint:"#FFFFFF",c.connector);nodes.push({kind:"ellipse",x:xx+cw/2-.075,y:yy+rh/2-.075,w:.15,h:.15,fill:v==="높음"?c.primary:v==="부분"?c.tint:"#FFFFFF",stroke:c.primary,strokeWidth:1});});cell(r.judgment,X+W-judgeW,yy,judgeW,rh,hi,true);});
 txt("● 높음     ◐ 부분     ○ 낮음 · 동일한 기준에서의 평가",X,6.08,W,.2,10,c.muted);break;}
 case "cross-matrix":{const d=S[kind].parse(slide.data),hasNote=d.rows.some(r=>r.note),labelW=1.75,noteW=hasNote?2:0,cw=(W-labelW-noteW)/d.columns.length,rh=3.7/d.rows.length;
 header("분류",X,Y,labelW);d.columns.forEach((s,i)=>header(s,X+labelW+i*cw,Y,cw));if(hasNote)header("비고·질문",X+W-noteW,Y,noteW);
 d.rows.forEach((r,i)=>{const yy=Y+.4+i*rh;cell(r.label,X,yy,labelW,rh,false,true);r.cells.forEach((s,j)=>{const focus=d.highlights?.some(p=>p.row===i&&p.col===j)??false;cell(s,X+labelW+j*cw,yy,cw,rh,focus,focus);});if(hasNote)cell(r.note??"—",X+W-noteW,yy,noteW,rh);});break;}
 case "judgment-reversal":{const d=S[kind].parse(slide.data),w=(W-.2*(d.priorities.length-1))/d.priorities.length;
 d.priorities.forEach((p,i)=>{const x=X+i*(w+.2);header(`${i+1}순위 · ${p.name}`,x,Y,w,i===0);[p.why,p.reversal,p.method].forEach((s,j)=>{const y=Y+.4+j*1.22;box(x,y,w,1.2,j===0&&i===0?c.tint:c.panel,c.connector);txt(["왜 먼저","순서를 바꿀 조건","확인 방법"][j],x+.12,y+.1,w-.24,.3,12,c.primary,true);txt(s,x+.12,y+.45,w-.24,.62,12,c.darkest);});});break;}
 case "question-summary":{const d=S[kind].parse(slide.data),rh=H/d.answers.length;
 d.answers.forEach((a,i)=>{const y=Y+i*rh;cell(a.question,X,y,2.6,rh-.08,true,true);box(X+2.75,y,W-2.75,rh-.08,c.panel);txt(a.answer,X+2.9,y+.12,W-4.4,.42,14,c.darkest,true);txt(a.evidence,X+2.9,y+.59,W-3.15,rh-.76,12,c.muted);tag(a.tag,X+W-1.3,y+.12);});balance(start);conclusion(d.agreement);return true;}
 case "validation-plan":{const d=S[kind].parse(slide.data),widths=[3,3,2.1,4.39],xs=[X,X+3,X+6,X+8.1],rh=3.72/d.rows.length;
 ["검증 질문","방법","대상·규모","이 결과가 나오면 바꿀 판단"].forEach((s,i)=>header(s,xs[i],Y,widths[i],i===3));d.rows.forEach((r,i)=>[r.question,r.method,r.sample,r.change].forEach((s,j)=>cell(s,xs[j],Y+.4+i*rh,widths[j],rh,j===3)));break;}
 case "evidence-scope":{const d=S[kind].parse(slide.data),widths=[.75,3.1,4.05,4.59],xs=[X,X+.75,X+3.85,X+7.9],rh=3.76/d.rows.length;
 ["코드","자료","판단할 수 있는 것","판단할 수 없는 것"].forEach((s,i)=>header(s,xs[i],Y,widths[i]));d.rows.forEach((r,i)=>[r.code,r.material,r.supports,r.limits].forEach((s,j)=>cell(s,xs[j],Y+.4+i*rh,widths[j],rh)));break;}
 case "survey-findings":{const d=S[kind].parse(slide.data);txt(`표본 n=${d.sampleSize}${d.sampleSize<30?" (소표본)":""} · 조사 기간 ${d.period}`,X,Y,W,.3,12,c.primary,true);chart({kind:"horizontal",categories:d.responses.map(r=>r.label),series:[{name:"응답 비율",values:d.responses.map(r=>r.percent)}],unit:"%"},X,2.5,7.45,3.45);
 d.quotes.forEach((q,i)=>{const h=3.45/d.quotes.length,y=2.5+i*h;box(8.1,y,4.8,h-.12,c.panel,c.connector);txt("“"+q.text+"”",8.25,y+.14,4.5,h-.62,13,c.darkest);txt(q.speaker,8.25,y+h-.43,4.5,.25,10,c.muted);});break;}
 case "multi-bar":case "line-chart":{const d=kind==="multi-bar"?S["multi-bar"].parse(slide.data):S["line-chart"].parse(slide.data);const w=d.interpretation?8.65:W;
 chart({kind:kind==="line-chart"?"line":"bar",categories:d.categories,series:d.series,unit:d.unit,stacked:"mode" in d&&d.mode==="누적"},X,Y,w,H);if(d.interpretation)panel("해석과 판단 범위",[d.interpretation],9.3,Y,3.6,H);break;}
 case "waterfall":{const d=S[kind].parse(slide.data),end=d.start.value+d.changes.reduce((s,r)=>s+r.value,0),w=d.interpretation?8.65:W;chart({kind:"waterfall",categories:[d.start.label,...d.changes.map(r=>r.label),d.endLabel],series:[{name:"증감",values:[d.start.value,...d.changes.map(r=>r.value),end]}],unit:d.unit},X,Y,w,H);if(d.interpretation)panel("증감의 의미",[d.interpretation],9.3,Y,3.6,H);break;}
 case "composition-donut":{const d=S[kind].parse(slide.data);chart({kind:"donut",categories:d.items.map(r=>r.label),series:[{name:"구성비",values:d.items.map(r=>r.value)}],unit:d.unit,focusIndex:d.focusIndex},X,Y,W,H);break;}
 case "horizontal-formula":{const d=S[kind].parse(slide.data),w=d.interpretation?8.65:W;chart({kind:"horizontal",categories:d.items.map(r=>r.label),series:[{name:"산출 예시",values:d.items.map(r=>r.value)}],unit:d.unit},X,Y,w,2.65);
 const rw=w/d.items.length;d.items.forEach((r,i)=>txt(r.basis,X+i*rw,4.75,rw-.14,.48,10,c.muted));txt(`[가정] ${d.assumption}  ·  [산식] ${d.formula}`,X,5.55,w,.55,12,c.primary,true);if(d.interpretation)panel("계산의 해석",[d.interpretation],9.3,Y,3.6,H);break;}
 case "calculation-flow":{
  // 가정·산식·결과 세 열을 같은 높이로 채우고, 산식은 단계별, 결과는 값별 칸으로 나눠 가운데 정렬한다.
  const d=S[kind].parse(slide.data),w=3.88,top=Y+.4,bottom=5.62,height=bottom-top,gap=.12;
  const lines=(t:string,size:number,width:number)=>Math.max(1,Math.ceil([...t].reduce((n,ch)=>n+(/[\u1100-\uFFFF]/.test(ch)?1:.55),0)*size/72/width));
  const center=(t:string,x:number,y:number,ww:number,h:number,size:number,color:string,bold:boolean,align:"left"|"center"|"right"="center")=>{const th=Math.min(h-.06,lines(t,size,ww)*size*1.25/72+.04);txt(t,x,y+(h-th)/2,ww,th,size,color,bold,align);};
  header("가정",X,Y,w);const ah=(height-(d.assumptions.length-1)*gap)/d.assumptions.length;
  d.assumptions.forEach((a,i)=>{const y=top+i*(ah+gap);box(X,y,w,ah,c.panel);center(a.label,X+.15,y,w*.6-.2,ah,12,c.darkest,false,"left");center(a.value,X+w*.6,y,w*.4-.15,ah,15,c.primary,true,"right");});
  const middle=top+height/2;arrow(4.37,middle-.1);
  header("산식",4.72,Y,w);const steps=d.formula.split(/\s*(?:→|->|⇒|\n)\s*/).map(s=>s.trim()).filter(Boolean),sh=(height-(steps.length-1)*gap)/steps.length;
  steps.forEach((s,i)=>{const y=top+i*(sh+gap);box(4.72,y,w,sh,c.panel,c.connector);center(s,4.87,y,w-.3,sh,15,c.darkest,true);});
  arrow(8.67,middle-.1);header("결과",9.02,Y,3.89,true);
  const values=d.result.split(/\s+\/\s+/),captions=d.unit.split(/\s+\/\s+/),pairs=values.length>1&&values.length===captions.length?values.map((v,i)=>[v,captions[i]] as const):[[d.result,d.unit] as const],rh=(height-(pairs.length-1)*gap)/pairs.length;
  pairs.forEach(([v,caption],i)=>{const y=top+i*(rh+gap),size=pairs.length>1?26:30,vh=size*1.25/72+.06,ch=lines(caption,12,3.49)*12*1.25/72+.04,start=y+(rh-vh-.08-ch)/2;box(9.02,y,3.89,rh,c.tint,c.primary);txt(v,9.22,start,3.49,vh,size,c.primary,true,"center");txt(caption,9.22,start+vh+.08,3.49,ch,12,c.darkest,false,"center");});
  txt(d.limitation,X,5.74,W,.38,12,c.muted);break;}
 case "date-timeline":case "scenario-gantt":{
 const timeline=kind==="date-timeline"?S["date-timeline"].parse(slide.data):undefined, scenario=kind==="scenario-gantt"?S["scenario-gantt"].parse(slide.data):undefined;
 const range=timeline?dateRange(timeline):{start:scenario!.start,end:scenario!.end},start=dayNumber(range.start),end=dayNumber(range.end)+1,days=Math.max(1,end-start),left=2.5,gw=scenario?7.1:10.4;
 const pos=(s:string)=>left+(dayNumber(s)-start)/days*gw,rows=timeline?.rows??scenario!.scenarios.map(s=>({label:s.name,periods:s.periods})),rh=3.55/rows.length;
 for(let i=0;i<=4;i++){const date=new Date((start+days*i/4)*86400000).toISOString().slice(0,10);txt(date,Math.min(left+gw-.95,left+i*gw/4-.45),2,.95,.3,10,c.muted,false,"center");line(left+i*gw/4,2.38,0,c.connector);nodes.push({kind:"line",x:left+i*gw/4,y:2.38,w:0,h:3.6,fill:c.connector,stroke:c.connector});}
 if(timeline?.highlight){const hi=timeline.highlight;box(pos(hi.start),2.38,Math.max(.03,pos(hi.end)-pos(hi.start)+gw/days),3.55,c.tint);txt(hi.label,pos(hi.start),1.66,Math.min(3,12.91-pos(hi.start)),.25,10,c.primary,true);}
 rows.forEach((row,i)=>{const y=2.5+i*rh;txt(row.label,X,y+.12,1.9,.45,12,c.primary,true);
 row.periods.forEach((p,j)=>{const x=pos(p.start),w=Math.max(.03,(dayNumber(p.end)-dayNumber(p.start)+1)/days*gw),barY=y+rh*.55;box(x,barY,w,.14,p.tone==="진함"?c.primary:c.tint);const lw=Math.max(1.1,w);const lx=Math.max(left,Math.min(x, left+gw-lw));txt(p.label,lx,y+(j%2)*.22,Math.min(lw,gw),.22,10,c.darkest);});
 if(scenario){const result=scenarioDays(range.start,range.end,row.periods),s=scenario.scenarios[i];box(9.85,y,3.06,rh-.08,c.panel,c.connector);txt(`${result.occupied}일 / ${result.total}일`,10,y+.05,2.76,.35,18,c.primary,true);txt(`빈 기간 ${result.vacant}일 · ${s.resultDescription}`,10,y+.4,2.76,Math.max(.25,rh-.55),10,c.muted);}});
 if(timeline)timeline.milestones.forEach((m,i)=>{const x=pos(m.date);diamond(x,2.28);txt(m.label,Math.min(11.3,Math.max(left,x-.45)),2.05+(i%2)*.2,1.55,.22,10,c.primary,true);});
 if(scenario)txt(`[계산] ${scenario.formula} · 종료일 포함, 기간 중복 제외`,X,6.03,W,.23,10,c.muted);break;}
 case "vertical-events":{const d=S[kind].parse(slide.data),w=d.deliverables?8.1:W,rh=H/d.events.length;
 for(let y=Y;y<Y+H;y+=.12)nodes.push({kind:"line",x:2.03,y,w:0,h:.055,fill:c.connector,stroke:c.connector});
 d.events.forEach((e,i)=>{const y=Y+i*rh;txt(e.date,X,y+.08,1.35,.45,12,c.primary,true);nodes.push({kind:"ellipse",x:1.96,y:y+.15,w:.14,h:.14,fill:c.primary});txt(e.title,2.4,y+.05,w-2.2,.3,13,c.primary,true);txt(e.description,2.4,y+.4,w-2.2,rh-.45,12,c.darkest);});if(d.deliverables)panel("산출물",d.deliverables,9.05,Y,3.86,H);break;}
 case "journey-lanes":{const d=S[kind].parse(slide.data);if(d.lanes.length===1&&!d.exitPoints){return drawVisual({...slide,layoutId:slide.layoutId.startsWith("c-")?"c-journey":"m-journey",data:{stages:d.stages.map((title,i)=>({title,...d.lanes[0].cells[i]})),focus:d.focus??0,takeaway:d.takeaway}},c,g);}
 const lw=1.35,cw=(W-lw)/d.stages.length,rh=(H-.4-(d.exitPoints?.length ? .48 : 0))/d.lanes.length;d.stages.forEach((s,i)=>header(s,X+lw+i*cw,Y,cw));
 d.lanes.forEach((lane,i)=>{const y=Y+.4+i*rh;cell(lane.name,X,y,lw,rh,true,true);lane.cells.forEach((v,j)=>{const x=X+lw+j*cw;box(x,y,cw,rh,c.panel,c.connector);txt(v.action,x+.08,y+.1,cw-.16,rh*.36,12,c.darkest,true);txt(v.touchpoint+"\n"+v.friction,x+.08,y+rh*.48,cw-.16,rh*.44,11,c.muted);if(v.tag)tag(v.tag,x+.08,y+rh-.3,Math.min(1.13,cw-.16));});});if(d.exitPoints)d.exitPoints.forEach((s,i)=>cell(s,X+lw+i*cw,5.58,cw,.5));break;}
 case "business-structure":{const d=S[kind].parse(slide.data),gap=.48,w=(W-gap*(d.actors.length-1))/d.actors.length;
 d.actors.forEach((a,i)=>{const x=X+i*(w+gap);header(a.name,x,2.55,w,i===d.actors.length-1);a.responsibility.forEach((s,j)=>cell(s,x,3.2+j*1.15,w,1.05,j===0));if(i<d.actors.length-1){txt(d.transactions[i],x+w-.15,2.05,gap+.3,.45,10,c.primary,true,"center");arrow(x+w+.1,2.72);}});break;}
 case "metrics-panel":{const d=S[kind].parse(slide.data),rh=H/d.metrics.length;d.metrics.forEach((m,i)=>{const y=Y+i*rh;cell(m.label,X,y,2,rh-.1,true,true);box(2.57,y,5.5,rh-.1,"#FFFFFF",c.connector);txt(m.value,2.75,y+.12,2,.5,25,c.primary,true);txt(m.meaning,4.9,y+.1,2.95,rh-.25,12,c.darkest);});panel(d.panelTitle,d.panel,8.65,Y,4.26,H);break;}
 case "agreement-next":{const d=S[kind].parse(slide.data);header("합의할 것",X,Y,5.8,true);d.agreements.forEach((s,i)=>{const h=3.7/d.agreements.length,y=Y+.4+i*h;cell(`${i+1}  ${s}`,X,y,5.8,h-.08,false,true);});header("다음 단계",6.65,Y,6.26);const h=3.7/d.steps.length;d.steps.forEach((s,i)=>{const y=Y+.5+i*h;diamond(6.83,y+.08);txt(s.date,7.1,y,1.55,.3,11,c.primary,true);txt(s.action,8.7,y,3.97,h-.08,12,c.darkest);});break;}
 case "section-divider":{const d=S[kind].parse(slide.data);txt(d.number,X,2.5,2,1.2,64,c.primary,true);txt(d.name,2.65,2.5,6.5,1.25,32,c.darkest,true);if(d.description)txt(d.description,2.65,4,6.4,1,14,c.muted);d.sections.forEach((s,i)=>txt(`${i+1}. ${s}`,9.5,2.12+i*.45,3.3,.35,12,s===d.name?c.primary:c.connector,s===d.name));break;}
 case "persona-cards":{const d=S[kind].parse(slide.data),w=(W-.2*(d.personas.length-1))/d.personas.length;
 d.personas.forEach((p,i)=>{const x=X+i*(w+.2);header(p.name,x,Y,w);box(x,2.34,w,3.78,c.panel,c.connector);tag(d.basis==="가상"?"가상 페르소나":"실제 조사",x+.12,2.47,1.6);txt(p.attributes,x+.12,2.88,w-.24,.38,12,c.muted);txt("목표 · "+p.goal,x+.12,3.44,w-.24,.6,12,c.darkest,true);txt("불편 · "+p.pain,x+.12,4.2,w-.24,.65,12,c.darkest);txt("“"+p.quote+"”",x+.12,5.18,w-.24,.67,12,c.primary);});break;}
 case "screenshot-notes":{const d=S[kind].parse(slide.data),scale=Math.min(8.1/d.imageWidth,H/d.imageHeight),iw=d.imageWidth*scale,ih=d.imageHeight*scale,ix=X+(8.1-iw)/2,iy=Y+(H-ih)/2;nodes.push({kind:"image",x:ix,y:iy,w:iw,h:ih,src:d.imageSrc,alt:d.imageAlt});d.annotations.forEach((a,i)=>{const x=ix+a.x*(iw-.3),y=iy+a.y*(ih-.3);nodes.push({kind:"ellipse",x,y,w:.3,h:.3,fill:c.primary});txt(String(i+1),x,y+.025,.3,.25,11,"#FFFFFF",true,"center");const yy=Y+i*H/d.annotations.length;txt(`${i+1}  ${a.title}`,8.85,yy,4.06,.3,12,c.primary,true);txt(a.description,8.85,yy+.38,4.06,H/d.annotations.length-.45,12,c.darkest);});break;}
 }
 balance(start);conclusion(common.takeaway);return true;
}
