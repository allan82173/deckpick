import { expandedSchemas as S, expandedRegistry, expandedKind, dateRange, dayNumber, scenarioDays, type ExpandedKind } from "./expanded-layouts";
import { chartPreviewDataUrl, type NativeChart } from "./native-charts";
import { drawVisual } from "./visual-scene";
import { richLines, fitStack, textHeight, type SceneNode, type TextNode, type ShapeNode } from "./scene";
import type { SlideSpec, DesignSystem } from "./model";
type G = { nodes: SceneNode[]; box:(x:number,y:number,w:number,h:number,fill:string,stroke?:string)=>unknown; txt:(text:string,x:number,y:number,w:number,h:number,size?:number,color?:string,bold?:boolean,align?:"left"|"center"|"right")=>unknown; line:(x:number,y:number,w:number,color:string,width?:number)=>unknown };
export function drawExpanded(slide: SlideSpec,c:DesignSystem["colors"],g:G): boolean {
 const kind=expandedKind(slide.layoutId); if(!kind)return false;
 const {box,txt,line,nodes}=g, X=.42,Y=1.94,W=12.49,H=4.16;
 const tag=(s:string,x:number,y:number,w=1.13)=>{box(x,y,w,.25,c.tint);txt(s,x+.04,y+.025,w-.08,.22,10,c.primary,true);};
 const conclusion=(s:string)=>{box(X,6.3,W,.55,c.darkest);txt(s,X+.14,6.4,W-.28,.35,12,"#FFFFFF",true);};
 const header=(s:string,x:number,y:number,w:number,focus=false)=>{box(x,y,w,.4,focus?c.darkest:c.primary);txt(s,x+.1,y+.075,w-.2,.28,12,"#FFFFFF",true);};
 const cell=(s:string,x:number,y:number,w:number,h:number,focus=false,bold=false)=>{box(x,y,w,h,focus?c.tint:c.panel,c.connector);const p=h<.55?.015:.04;txt(s,x+.08,y+p,w-.16,h-2*p,12,c.darkest,bold);};
 const darkCell=(t:string,x:number,y:number,w:number,h:number,fill:string,size=13)=>{box(x,y,w,h,fill);const th=Math.min(h-.08,textHeight(t,size,w-.24));txt(t,x+.12,y+(h-th)/2,w-.24,th+.03,size,"#FFFFFF",true,"center");};
 const arrow=(x:number,y:number)=>nodes.push({kind:"triangle",x,y,w:.25,h:.2,fill:c.connector,rotate:90});
 const diamond=(x:number,y:number)=>nodes.push({kind:"rect",x,y,w:.11,h:.11,fill:c.darkest,rotate:45});
 // 패널: 한 문장 묶음은 문장 단위 항목으로 나누고, 항목을 패널 높이에 고르게 배치해 채우는 크기(12~16pt)로 맞춘다.
 const sentences=(t:string)=>{const parts=t.split(/(?<=[.!?])\s+|\n+/).map(v=>v.trim()).filter(Boolean);return parts.length>4?[parts.slice(0,parts.length-3).join(" "),...parts.slice(-3)]:parts;};
 const panel=(title:string,items:string[],x:number,y:number,w:number,h:number,alignTop=false)=>{header(title,x,y,w);box(x,y+.4,w,h-.4,c.panel);const parts=items.length===1?sentences(items[0]):items,tw=w-.28,inner=h-.4-.32,size=fitStack(parts,tw,inner-.32*(parts.length-1),16,12),used=parts.reduce((n,t)=>n+textHeight(t,size,tw),0),gap=parts.length>1?Math.min(alignTop?.32:.5,(inner-used)/(parts.length-1)):0;let yy=y+.4+.16+(alignTop?.06:Math.max(0,(inner-used-gap*(parts.length-1))/2));
  parts.forEach((t,i)=>{const th=textHeight(t,size,tw);txt(t,x+.14,yy,tw,th+.04,size,c.darkest,i===0&&parts.length>1);if(i<parts.length-1)line(x+.14,yy+th+gap/2,tw,c.connector,1);yy+=th+gap;});};
 const chart=(d:NativeChart,x:number,y:number,w:number,h:number)=>nodes.push({kind:"image",x,y,w,h,src:chartPreviewDataUrl(d,c,w/h),alt:`${d.kind} · 단위 ${d.unit}`,chart:d});
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
 case "cross-matrix":{
 // 색 범주: 분류 열은 주색, 강조 칸은 가장 진한 색, 강조가 많은 열 머리는 진하게, 나머지 칸은 행마다 번갈아 연한 톤, 비고는 연녹색 띠.
 const d=S[kind].parse(slide.data),hasNote=d.rows.some(r=>r.note),labelW=1.75,noteW=hasNote?2:0,cw=(W-labelW-noteW)/d.columns.length,rh=(3.62-.3)/d.rows.length,hl=(i:number,j:number)=>d.highlights?.some(p=>p.row===i&&p.col===j)??false;
 const colHits=d.columns.map((_,j)=>d.rows.filter((_,i)=>hl(i,j)).length),focusCol=Math.max(...colHits)>0?colHits.indexOf(Math.max(...colHits)):-1;
 header("분류",X,Y,labelW,true);d.columns.forEach((s,i)=>header(s,X+labelW+i*cw,Y,cw,i===focusCol));if(hasNote)header("비고·질문",X+W-noteW,Y,noteW);
 d.rows.forEach((r,i)=>{const yy=Y+.4+i*rh;darkCell(r.label,X,yy,labelW,rh,c.primary,14);r.cells.forEach((t,j)=>{if(hl(i,j))darkCell(t,X+labelW+j*cw,yy,cw,rh,c.darkest,14);else{box(X+labelW+j*cw,yy,cw,rh,j===focusCol?c.tint:i%2?"#FFFFFF":c.panel,c.connector);txt(t,X+labelW+j*cw+.1,yy+.08,cw-.2,rh-.16,12,c.darkest);}});if(hasNote){box(X+W-noteW,yy,noteW,rh,c.panel,c.connector);txt(r.note??"—",X+W-noteW+.1,yy+.08,noteW-.2,rh-.16,12,c.primary,true);}});
 const ly=Y+.4+d.rows.length*rh+.1;box(X,ly+.04,.26,.16,c.darkest);txt("주목할 칸",X+.34,ly,1.3,.24,11,c.muted);box(X+1.6,ly+.04,.26,.16,c.tint,c.connector);txt("핵심 비교 열",X+1.94,ly,1.5,.24,11,c.muted);box(X+3.5,ly+.04,.26,.16,c.primary);txt("분류",X+3.84,ly,1,.24,11,c.muted);break;}
 case "judgment-reversal":{const d=S[kind].parse(slide.data),w=(W-.2*(d.priorities.length-1))/d.priorities.length;
 d.priorities.forEach((p,i)=>{const x=X+i*(w+.2);header(`${i+1}순위 · ${p.name}`,x,Y,w,i===0);[p.why,p.reversal,p.method].forEach((s,j)=>{const y=Y+.4+j*1.22;box(x,y,w,1.2,j===0&&i===0?c.tint:c.panel,c.connector);txt(["왜 먼저","순서를 바꿀 조건","확인 방법"][j],x+.12,y+.1,w-.24,.3,12,c.primary,true);txt(s,x+.12,y+.45,w-.24,.62,12,c.darkest);});});break;}
 case "question-summary":{const d=S[kind].parse(slide.data),rh=H/d.answers.length;
 d.answers.forEach((a,i)=>{const y=Y+i*rh;cell(a.question,X,y,2.6,rh-.08,true,true);box(X+2.75,y,W-2.75,rh-.08,c.panel);txt(a.answer,X+2.9,y+.12,W-4.4,.42,14,c.darkest,true);txt(a.evidence,X+2.9,y+.59,W-3.15,rh-.76,12,c.muted);tag(a.tag,X+W-1.3,y+.12);});balance(start);conclusion(d.agreement);return true;}
 case "validation-plan":{const d=S[kind].parse(slide.data),widths=[3,3,2.1,4.39],xs=[X,X+3,X+6,X+8.1],rh=3.72/d.rows.length;
 ["검증 질문","방법","대상·규모","이 결과가 나오면 바꿀 판단"].forEach((s,i)=>header(s,xs[i],Y,widths[i],i===3));d.rows.forEach((r,i)=>[r.question,r.method,r.sample,r.change].forEach((s,j)=>cell(s,xs[j],Y+.4+i*rh,widths[j],rh,j===3)));break;}
 case "evidence-scope":{
  const bibliography=S[kind].parse(slide.data);
  if(bibliography.mode==="bibliography"){
   const columns=bibliography.rows.length>6?2:1,gap=.46,w=(W-gap*(columns-1))/columns,per=Math.ceil(bibliography.rows.length/columns);
   // Only the displayed title is shortened. Full metadata stays in slide.data and notes.
   const compact=(raw:string,size:number,width:number,maximumLines:number)=>{
    const value=raw.replace(/\s+/g," ").trim();if(richLines(value,size,width).length<=maximumLines)return value;
    const chars=Array.from(value);let low=0,high=chars.length;
    while(low<high){const middle=Math.ceil((low+high)/2);if(richLines(chars.slice(0,middle).join("").trimEnd()+"…",size,width).length<=maximumLines)low=middle;else high=middle-1;}
    return chars.slice(0,low).join("").trimEnd()+"…";
   };
   const tw=w-.66,metaSize=10,metaHeight=metaSize*1.25/72;
   let titleSize=12;
   const rowHeight=(material:string,size:number)=>textHeight(compact(material,size,tw-.12,2),size,tw)+metaHeight+.07;
   for(;titleSize>10;titleSize-=.5){
    if(Array.from({length:columns},(_,col)=>bibliography.rows.slice(col*per,(col+1)*per)).every(rows=>rows.reduce((height,row)=>height+rowHeight(row.material,titleSize),0)<=H))break;
   }
   for(let col=0;col<columns;col++){
    const rows=bibliography.rows.slice(col*per,(col+1)*per),x=X+col*(w+gap),heights=rows.map(r=>rowHeight(r.material,titleSize)),spare=Math.max(0,H-heights.reduce((a,b)=>a+b,0))/Math.max(1,rows.length);let y=Y;
    rows.forEach((r,i)=>{
     const title=compact(r.material,titleSize,tw-.12,2),th=textHeight(title,titleSize,tw),date=r.dateLabel?.match(/\d{4}-\d{2}-\d{2}/)?.[0],dateLabel=date?`${r.dateLabel?.startsWith("발행")?"발행":"확인"} ${date}`:r.dateLabel??"";
     txt(compact(r.code,10,.48,1),x,y+.01,.48,.20,10,c.primary,true);
     txt(title,x+.64,y,tw,th+.008,titleSize,c.darkest,true);
     txt(compact(dateLabel,metaSize,tw-1,1),x+.64,y+th+.025,tw-1,metaHeight+.008,metaSize,c.muted);
     txt(r.url?`[원문 보기](${r.url})`:"URL 없음",x+w-.82,y+th+.025,.82,metaHeight+.008,metaSize,c.muted,false,"right");
     line(x,y+heights[i]+spare-.015,w,c.connector,.7);y+=heights[i]+spare;
    });
   }
   conclusion(bibliography.takeaway);return true;
  }
 // 판단할 수 있는 것은 연녹색 칸·주색 굵은 글자(✓), 판단할 수 없는 것은 흰 칸·위험색 글자(✕), 코드는 진한 표식으로 강조한다.
 const d=S[kind].parse(slide.data),widths=[.75,3.1,4.05,4.59],xs=[X,X+.75,X+3.85,X+7.9],rh=3.76/d.rows.length;
 header("코드",xs[0],Y,widths[0],true);header("자료",xs[1],Y,widths[1]);header("✓ 판단할 수 있는 것",xs[2],Y,widths[2]);box(xs[3],Y,widths[3],.4,c.risk);txt("✕ 판단할 수 없는 것",xs[3]+.1,Y+.075,widths[3]-.2,.28,12,"#FFFFFF",true);
 d.rows.forEach((r,i)=>{const yy=Y+.4+i*rh;darkCell(r.code,xs[0],yy,widths[0],rh,c.darkest,13);cell(r.material,xs[1],yy,widths[1],rh);box(xs[2],yy,widths[2],rh,c.tint,c.connector);txt(r.supports,xs[2]+.12,yy+.04,widths[2]-.24,rh-.08,12,c.primary,true);box(xs[3],yy,widths[3],rh,"#FFFFFF",c.connector);txt(r.limits,xs[3]+.12,yy+.04,widths[3]-.24,rh-.08,12,c.risk,true);});break;}
 case "survey-findings":{const d=S[kind].parse(slide.data);txt(`표본 n=${d.sampleSize}${d.sampleSize<30?" (소표본)":""} · 조사 기간 ${d.period}`,X,Y,W,.3,12,c.primary,true);chart({kind:"horizontal",categories:d.responses.map(r=>r.label),series:[{name:"응답 비율",values:d.responses.map(r=>r.percent)}],unit:"%"},X,2.5,7.45,3.45);
 d.quotes.forEach((q,i)=>{const h=3.45/d.quotes.length,y=2.5+i*h;box(8.1,y,4.8,h-.12,c.panel,c.connector);txt("“"+q.text+"”",8.25,y+.14,4.5,h-.62,13,c.darkest);txt(q.speaker,8.25,y+h-.43,4.5,.25,10,c.muted);});break;}
 case "multi-bar":case "line-chart":{const d=kind==="multi-bar"?S["multi-bar"].parse(slide.data):S["line-chart"].parse(slide.data);const w=d.interpretation?8.65:W;
 chart({kind:kind==="line-chart"?"line":"bar",categories:d.categories,series:d.series,unit:d.unit,stacked:"mode" in d&&d.mode==="누적"},X,Y,w,H);if(d.interpretation)panel("해석과 판단 범위",[d.interpretation],9.3,Y,3.6,H);break;}
 case "waterfall":{const d=S[kind].parse(slide.data),end=d.start.value+d.changes.reduce((s,r)=>s+r.value,0),w=d.interpretation?8.65:W;chart({kind:"waterfall",categories:[d.start.label,...d.changes.map(r=>r.label),d.endLabel],series:[{name:"증감",values:[d.start.value,...d.changes.map(r=>r.value),end]}],unit:d.unit},X,Y,w,H);if(d.interpretation)panel("증감의 의미",[d.interpretation],9.3,Y,3.6,H);break;}
 case "composition-donut":{const d=S[kind].parse(slide.data);chart({kind:"donut",categories:d.items.map(r=>r.label),series:[{name:"구성비",values:d.items.map(r=>r.value)}],unit:d.unit,focusIndex:d.focusIndex},X,Y,W,H);break;}
 case "horizontal-formula":{const d=S[kind].parse(slide.data),w=d.interpretation?8.65:W;chart({kind:"horizontal",categories:d.items.map(r=>r.label),series:[{name:"산출 예시",values:d.items.map(r=>r.value)}],unit:d.unit},X,Y,w,2.65);
 // 근거 문구는 막대 아래 겹치지 않도록 항목별 한 줄 목록으로, 가정·산식은 남은 높이에 맞춰 둔다.
 const fl=`가정: ${d.assumption}\n산식: ${d.formula}`,bRows=d.items.map(r=>`${r.label} · ${r.basis}`),bSize=12,
 rowHeights=bRows.map(t=>textHeight(t,bSize,w)+.045),fSize=12,fh=textHeight(fl,fSize,w)+.04,
 total=rowHeights.reduce((a,b)=>a+b,0)+fh+.12,chartH=Math.min(2.65,Math.max(1.45,H-total)),bTop=Y+chartH+.12;
 const chartNode=nodes.at(-1);if(chartNode?.kind==="image"){chartNode.h=chartH;if(chartNode.chart)chartNode.src=chartPreviewDataUrl(chartNode.chart,c,chartNode.w/chartH);}
 let by=bTop;bRows.forEach((t,i)=>{txt(t,X,by,w,rowHeights[i],bSize,c.muted);by+=rowHeights[i];});txt(fl,X,by+.08,w,fh,fSize,c.primary,true);if(d.interpretation)panel("계산의 해석",[d.interpretation],9.3,Y,3.6,H);break;}
 case "calculation-flow":{
  // 가정·산식·결과 세 열을 같은 높이로 채우고, 산식은 단계별, 결과는 값별 칸으로 나눠 가운데 정렬한다.
  const d=S[kind].parse(slide.data),w=3.88,top=Y+.4,bottom=5.62,height=bottom-top,gap=.12;
  const lines=(t:string,size:number,width:number)=>Math.max(1,Math.ceil([...t].reduce((n,ch)=>n+(/[\u1100-\uFFFF]/.test(ch)?1:.55),0)*size/72/width));
  const center=(t:string,x:number,y:number,ww:number,h:number,size:number,color:string,bold:boolean,align:"left"|"center"|"right"="center")=>{const th=Math.min(h-.06,lines(t,size,ww)*size*1.25/72+.04);txt(t,x,y+(h-th)/2,ww,th,size,color,bold,align);};
  // 숫자만 덩그러니 놓이지 않게: 가정 값은 작은 원, 결과는 큰 진한 원으로 크기 대비를 준다.
  header("가정",X,Y,w);const ah=(height-(d.assumptions.length-1)*gap)/d.assumptions.length;
  d.assumptions.forEach((a,i)=>{const y=top+i*(ah+gap),dd=Math.min(ah-.12,1.05);box(X,y,w,ah,c.panel);nodes.push({kind:"ellipse",x:X+.16,y:y+(ah-dd)/2,w:dd,h:dd,fill:c.tint});const vs=fitStack([a.value],dd-.12,.4,16,11);txt(a.value,X+.2,y+ah/2-vs*1.25/72/2,dd-.08,vs*1.25/72+.04,vs,c.primary,true,"center");center(a.label,X+dd+.36,y,w-dd-.5,ah,13,c.darkest,true,"left");});
  const middle=top+height/2;arrow(4.37,middle-.1);
  header("산식",4.72,Y,w);const steps=d.formula.split(/\s*(?:→|->|⇒|\n)\s*/).map(s=>s.trim()).filter(Boolean),sh=(height-(steps.length-1)*gap)/steps.length;
  steps.forEach((s,i)=>{const y=top+i*(sh+gap);box(4.72,y,w,sh,"#FFFFFF",c.primary);nodes.push({kind:"rect",x:4.72,y,w:.08,h:sh,fill:c.primary});center(s,4.95,y,w-.4,sh,16,c.darkest,true);if(i<steps.length-1)nodes.push({kind:"triangle",x:4.72+w/2-.12,y:y+sh+.01,w:.24,h:gap-.02,fill:c.connector,rotate:180});});
  arrow(8.67,middle-.1);header("결과",9.02,Y,3.89,true);
  const values=d.result.split(/\s+\/\s+/),captions=d.unit.split(/\s+\/\s+/),pairs=values.length>1&&values.length===captions.length?values.map((v,i)=>[v,captions[i]] as const):[[d.result,d.unit] as const],rh=(height-(pairs.length-1)*gap)/pairs.length;
  pairs.forEach(([v,caption],i)=>{const y=top+i*(rh+gap),dd=Math.min(rh-.55,3.2),cx=9.02+3.89/2,cy=y+(rh-.45)/2;box(9.02,y,3.89,rh,c.panel);nodes.push({kind:"ellipse",x:cx-dd/2-.06,y:cy-dd/2-.06,w:dd+.12,h:dd+.12,fill:c.tint});nodes.push({kind:"ellipse",x:cx-dd/2,y:cy-dd/2,w:dd,h:dd,fill:c.darkest});const vs=fitStack([v],dd*.8,dd*.5,pairs.length>1?28:40,14);txt(v,cx-dd*.4,cy-vs*1.25/72/2,dd*.8,vs*1.25/72+.04,vs,"#FFFFFF",true,"center");center(caption,9.12,y+rh-.47,3.69,.42,12,c.primary,true);});
  txt(d.limitation,X,5.74,W,.38,12,c.muted);break;}
 case "date-timeline":case "scenario-gantt":{
 const timeline=kind==="date-timeline"?S["date-timeline"].parse(slide.data):undefined, scenario=kind==="scenario-gantt"?S["scenario-gantt"].parse(slide.data):undefined;
 const range=timeline?dateRange(timeline):{start:scenario!.start,end:scenario!.end},start=dayNumber(range.start),end=dayNumber(range.end)+1,days=Math.max(1,end-start),left=2.5,gw=scenario?7.1:10.4;
 const pos=(s:string)=>left+(dayNumber(s)-start)/days*gw,rows=timeline?.rows??scenario!.scenarios.map(s=>({label:s.name,periods:s.periods})),rh=3.55/rows.length;
 for(let i=0;i<=4;i++){const date=new Date((start+days*i/4)*86400000).toISOString().slice(0,10);txt(date,Math.min(left+gw-1.05,left+i*gw/4-.5),2,1.05,.3,11,c.muted,false,"center");line(left+i*gw/4,2.38,0,c.connector);nodes.push({kind:"line",x:left+i*gw/4,y:2.38,w:0,h:3.6,fill:c.connector,stroke:c.connector});}
 if(timeline?.highlight){const hi=timeline.highlight;box(pos(hi.start),2.38,Math.max(.03,pos(hi.end)-pos(hi.start)+gw/days),3.55,c.tint);txt(hi.label,pos(hi.start),1.64,Math.min(3,12.91-pos(hi.start)),.27,12,c.primary,true);}
 rows.forEach((row,i)=>{const y=2.5+i*rh;txt(row.label,X,y+.12,1.9,.45,12,c.primary,true);
 row.periods.forEach((p,j)=>{const x=pos(p.start),w=Math.max(.03,(dayNumber(p.end)-dayNumber(p.start)+1)/days*gw),barY=y+rh*.55;box(x,barY,w,.14,p.tone==="진함"?c.primary:c.tint);const lw=Math.max(1.5,w);const lx=Math.max(left,Math.min(x, left+gw-lw));txt(p.label,lx,barY-.34-(j%2)*.26,Math.min(lw,gw),.27,12,c.darkest,j%2===0);});
 if(scenario){const result=scenarioDays(range.start,range.end,row.periods),s=scenario.scenarios[i];box(9.85,y,3.06,rh-.08,c.panel,c.connector);txt(`${result.occupied}일 / ${result.total}일`,10,y+.05,2.76,.35,18,c.primary,true);txt(`빈 기간 ${result.vacant}일 · ${s.resultDescription}`,10,y+.42,2.76,Math.max(.25,rh-.55),11,c.muted);}});
 if(timeline)timeline.milestones.forEach((m,i)=>{const x=pos(m.date);diamond(x,2.28);txt(m.label,Math.min(11.2,Math.max(left,x-.5)),2.04+(i%2)*.22,1.7,.24,11,c.primary,true);});
 if(scenario)txt(`[계산] ${scenario.formula} · 종료일 포함, 기간 중복 제외`,X,6.0,W,.26,11,c.muted);break;}
 case "vertical-events":{const d=S[kind].parse(slide.data),w=d.deliverables?8.1:W,rh=H/d.events.length;
 for(let y=Y;y<Y+H;y+=.12)nodes.push({kind:"line",x:2.03,y,w:0,h:.055,fill:c.connector,stroke:c.connector});
 d.events.forEach((e,i)=>{const y=Y+i*rh;txt(e.date,X,y+.08,1.35,.45,12,c.primary,true);nodes.push({kind:"ellipse",x:1.96,y:y+.15,w:.14,h:.14,fill:c.primary});txt(e.title,2.4,y+.05,w-2.2,.3,13,c.primary,true);txt(e.description,2.4,y+.4,w-2.2,rh-.45,12,c.darkest);});if(d.deliverables)panel("산출물",d.deliverables,9.05,Y,3.86,H,true);break;}
 case "journey-lanes":{const d=S[kind].parse(slide.data);if(d.lanes.length===1&&!d.exitPoints){return drawVisual({...slide,layoutId:slide.layoutId.startsWith("c-")?"c-journey":"m-journey",data:{stages:d.stages.map((title,i)=>({title,...d.lanes[0].cells[i]})),focus:d.focus??0,takeaway:d.takeaway}},c,g);}
 // 이탈 줄은 레인 바로 아래 붙이고(고정 위치로 겹치던 문제), 칸 안 글자는 칸을 채우는 크기(최소 11pt)로 맞춘다.
 const lw=1.35,cw=(W-lw)/d.stages.length,exitH=d.exitPoints?.length?.62:0,rh=(H-.4-exitH-(exitH?.08:0))/d.lanes.length,tw=cw-.16;d.stages.forEach((s,i)=>header(s,X+lw+i*cw,Y,cw));
 const cells=d.lanes.flatMap(l=>l.cells),aSize=Math.min(...cells.map(v=>fitStack([v.action],tw,rh*.34,14,11))),hasTag=rh>1.3&&cells.some(v=>v.tag),bodyH=rh-rh*.34-.22-(hasTag?.34:0),bSize=Math.min(...cells.map(v=>fitStack([v.touchpoint+" · "+v.friction],tw,bodyH,13,11)));
 d.lanes.forEach((lane,i)=>{const y=Y+.4+i*rh;cell(lane.name,X,y,lw,rh,true,true);lane.cells.forEach((v,j)=>{const x=X+lw+j*cw;box(x,y,cw,rh,c.panel,c.connector);txt(v.action,x+.08,y+.1,tw,rh*.34,aSize,c.darkest,true);txt(v.touchpoint+" · "+v.friction,x+.08,y+.12+rh*.34,tw,bodyH,bSize,c.muted);if(v.tag&&hasTag)tag(v.tag,x+.08,y+rh-.31,Math.min(1.13,tw));});});
 if(d.exitPoints){const ey=Y+.4+d.lanes.length*rh+.08,eSize=Math.min(...d.exitPoints.map(t=>fitStack([t],cw-.2,exitH-.12,13,11)));txt("이탈 지점",X+.08,ey+(exitH-.26)/2,lw-.16,.26,11,c.primary,true);d.exitPoints.forEach((t,i)=>{const x=X+lw+i*cw;box(x,ey,cw,exitH,c.tint,c.connector);const eh=textHeight(t,eSize,cw-.2);txt(t,x+.1,ey+(exitH-eh)/2,cw-.2,eh+.03,eSize,c.darkest,true,"center");});}break;}
 case "business-structure":{const d=S[kind].parse(slide.data),gap=.48,w=(W-gap*(d.actors.length-1))/d.actors.length;
 const most=Math.max(...d.actors.map(a=>a.responsibility.length)),rh=(6.1-3.05-(most-1)*.22)/most,rSize=Math.min(...d.actors.flatMap(a=>a.responsibility.map(t=>fitStack([t],w-.3,rh-.2,16,12))));
 d.actors.forEach((a,i)=>{const x=X+i*(w+gap);header(a.name,x,2.55,w,i===d.actors.length-1);a.responsibility.forEach((t,j)=>{const y=3.05+j*(rh+.22),th=textHeight(t,rSize,w-.3);box(x,y,w,rh,j===0?c.tint:c.panel,c.connector);txt(t,x+.15,y+(rh-th)/2,w-.3,th+.04,rSize,c.darkest,j===0);});if(i<d.actors.length-1){txt(d.transactions[i],x+w-.35,2.0,gap+.7,.5,11,c.primary,true,"center");arrow(x+w+.1,2.72);}});break;}
 case "metrics-panel":{const d=S[kind].parse(slide.data),rh=(H+.2)/d.metrics.length;d.metrics.forEach((m,i)=>{const y=Y+i*rh;cell(m.label,X,y,2,rh-.2,true,true);box(2.62,y,5.45,rh-.2,"#FFFFFF",c.connector);txt(m.value,2.8,y+.12,2,.5,25,c.primary,true);txt(m.meaning,4.9,y+.1,2.95,rh-.35,12,c.darkest);});panel(d.panelTitle,d.panel,8.65,Y,4.26,H);break;}
 case "agreement-next":{const d=S[kind].parse(slide.data);header("합의할 것",X,Y,5.8,true);const ah=(6.1-Y-.5-.2*(d.agreements.length-1))/d.agreements.length,aSize=Math.min(...d.agreements.map(t=>fitStack([t],5.2,ah-.2,16,12)));d.agreements.forEach((t,i)=>{const y=Y+.5+i*(ah+.2),th=textHeight(t,aSize,5.2);box(X,y,5.8,ah,c.panel,c.connector);txt(String(i+1),X+.14,y+(ah-.3)/2,.3,.3,15,c.primary,true);txt(t,X+.5,y+(ah-th)/2,5.2,th+.04,aSize,c.darkest,true);});
 header("다음 단계",6.65,Y,6.26);const sh=(6.1-Y-.5-.2*(d.steps.length-1))/d.steps.length,sSize=Math.min(...d.steps.map(t=>fitStack([t.action],3.9,sh-.16,15,12)));nodes.push({kind:"line",x:6.88,y:Y+.5+sh/2,w:0,h:(d.steps.length-1)*(sh+.2),fill:c.connector,stroke:c.connector,strokeWidth:1.5});
 d.steps.forEach((t,i)=>{const y=Y+.5+i*(sh+.2),th=textHeight(t.action,sSize,3.9);diamond(6.83,y+sh/2-.055);box(7.1,y,5.81,sh,i===0?c.tint:c.panel,c.connector);txt(t.date,7.24,y+(sh-.28)/2,1.5,.3,13,c.primary,true);txt(t.action,8.85,y+(sh-th)/2,3.9,th+.04,sSize,c.darkest);});break;}
 case "section-divider":{const d=S[kind].parse(slide.data);txt(d.number,X,2.5,2,1.2,64,c.primary,true);txt(d.name,2.65,2.5,6.5,1.25,32,c.darkest,true);if(d.description)txt(d.description,2.65,4,6.4,1,14,c.muted);d.sections.forEach((s,i)=>txt(`${i+1}. ${s}`,9.5,2.12+i*.45,3.3,.35,12,s===d.name?c.primary:c.connector,s===d.name));break;}
 case "persona-cards":{const d=S[kind].parse(slide.data),w=(W-.3*(d.personas.length-1))/d.personas.length;
 // 머리·속성 줄·목표·불편·한마디를 각각 칸으로 나누고 칸 사이를 0.12in 띄운다.
 d.personas.forEach((p,i)=>{const x=X+i*(w+.3),g=.12,tw=w-.28;header(p.name,x,Y,w);const ay=Y+.4+g;box(x,ay,w,.42,c.panel,c.connector);tag(d.basis==="가상"?"가상 페르소나":"실제 조사",x+.12,ay+.085,1.6);txt(p.attributes,x+1.85,ay+.09,w-1.97,.26,12,c.muted);
  const top=ay+.42+g,parts=[["목표",p.goal],["불편",p.pain],["한마디","“"+p.quote+"”"]] as const,slot=(6.1-top-g*2)/3,size=Math.min(...d.personas.flatMap(q=>[q.goal,q.pain,"“"+q.quote+"”"].map(t=>fitStack([t],tw,slot-.46,16,12))));
  parts.forEach(([label,t],k)=>{const y=top+k*(slot+g),th=textHeight(t,size,tw);box(x,y,w,slot,k===2?c.tint:c.panel,c.connector);txt(label,x+.14,y+.08,tw,.24,11,c.primary,true);txt(t,x+.14,y+.36+(slot-.42-th)/2,tw,th+.04,size,k===2?c.primary:c.darkest,k===0);});});break;}
 case "screenshot-notes":{
 // 번호 표식은 각 주석 좌표(영역의 왼쪽 위 모서리)에 맞춰 같은 크기·같은 오프셋으로 놓는다. 오른쪽 설명도 같은 번호 표식으로 짝을 맞춘다.
 const d=S[kind].parse(slide.data),scale=Math.min(8.1/d.imageWidth,H/d.imageHeight),iw=d.imageWidth*scale,ih=d.imageHeight*scale,ix=X+(8.1-iw)/2,iy=Y+(H-ih)/2,b=.38;nodes.push({kind:"image",x:ix,y:iy,w:iw,h:ih,src:d.imageSrc,alt:d.imageAlt});
 const badge=(n:number,x:number,y:number)=>{nodes.push({kind:"ellipse",x:x-.04,y:y-.04,w:b+.08,h:b+.08,fill:"#FFFFFF"});nodes.push({kind:"ellipse",x,y,w:b,h:b,fill:c.darkest});txt(String(n),x,y+.07,b,.26,13,"#FFFFFF",true,"center");};
 const rowH=H/d.annotations.length,dSize=Math.min(...d.annotations.map(a=>fitStack([a.description],3.5,rowH-.62,14,12)));
 d.annotations.forEach((a,i)=>{const x=Math.min(ix+iw-b,Math.max(ix,ix+a.x*iw-b*.35)),y=Math.min(iy+ih-b,Math.max(iy,iy+a.y*ih-b*.35));badge(i+1,x,y);
  const yy=Y+i*rowH;badge(i+1,8.85,yy+.02);txt(a.title,9.35,yy+.07,3.56,.32,14,c.primary,true);txt(a.description,9.35,yy+.5,3.56,rowH-.62,dSize,c.darkest);if(i<d.annotations.length-1)line(8.85,yy+rowH-.08,4.06,c.connector,1);});break;}
 case "interview-quotes":{const d=S[kind].parse(slide.data),n=d.quotes.length,cols=n,rows=1,gw=.2,cw=(W-gw*(cols-1))/cols,top=2.36,ch=(6.1-top-(rows-1)*.16)/rows;
 tag(d.basis==="실제 조사"?"실제 인터뷰":"조사 예정 예시",X,Y,1.6);txt(d.method,X+1.75,Y+.02,W-1.75,.26,11,c.muted);
 d.quotes.forEach((q,i)=>{const x=X+(i%cols)*(cw+gw),y=top+Math.floor(i/cols)*(ch+.16);box(x,y,cw,ch,c.panel,c.connector);nodes.push({kind:"ellipse",x:x+.16,y:y+.16,w:.5,h:.5,fill:c.tint});txt(q.speaker.slice(0,1),x+.16,y+.27,.5,.3,12,c.primary,true,"center");txt(q.speaker,x+.78,y+.2,cw-1.6,.5,11,c.muted);const qMax=rows===1?17:14,qTop=rows===1?.95:.8,qs=Math.min(...d.quotes.map(o=>fitStack(["“"+o.text+"”"],cw-.32,ch-qTop-.9,qMax,11)));txt("“",x+cw-.85,y+.02,.7,.9,54,c.tint,true,"right");const qy=rows===1?y+.95+Math.max(0,(ch-2.4)/2-.35):y+.8;txt("“"+q.text+"”",x+.16,qy,cw-.32,y+ch-.86-qy,qs,c.darkest,true);const ih=Math.min(.62,textHeight("→ "+q.insight,11,cw-.48)+.1);box(x+.16,y+ch-ih-.14,cw-.32,ih,c.tint);txt("→ "+q.insight,x+.24,y+ch-ih-.1,cw-.48,ih-.06,11,c.primary,true);});break;}
 case "photo-evidence":{const d=S[kind].parse(slide.data),n=d.photos.length,gw=.24,cw=(W-gw*(n-1))/n,ih=6.1-Y-1.05;
 d.photos.forEach((p,i)=>{const x=X+i*(cw+gw);if(p.imageSrc)nodes.push({kind:"image",x,y:Y,w:cw,h:ih,src:p.imageSrc,alt:p.caption});else{box(x,Y,cw,ih,c.tint,c.connector);txt("사진 삽입 · "+p.caption,x+.2,Y+ih/2-.15,cw-.4,.3,12,c.muted,false,"center");}
 txt(p.caption,x,Y+ih+.1,cw,.3,13,c.primary,true);txt(p.observation,x,Y+ih+.45,cw,6.1-(Y+ih+.45),12,c.darkest);});break;}
 case "benchmark-cards":{const d=S[kind].parse(slide.data),n=d.cases.length,gw=.22,cw=(W-gw*(n-1))/n,bottom=5.48,rows=[["무엇을 했나","what"],["성과","result"],["배울 점","lesson"]] as const,rh=(bottom-(Y+.7))/3;
 // 머리·세 칸·적용 방향 사이를 0.12in씩 띄운다.
 d.cases.forEach((v,i)=>{const x=X+i*(cw+gw);box(x,Y,cw,.58,c.darkest);txt(v.company,x+.14,Y+.06,cw-.28,.3,15,"#FFFFFF",true);txt(v.region,x+.14,Y+.33,cw-.28,.22,10,"#FFFFFF");
 rows.forEach(([label,key],j)=>{const y=Y+.7+j*rh;box(x,y,cw,rh-.12,j===2?c.tint:c.panel,c.connector);txt(label,x+.12,y+.06,cw-.24,.24,10,c.primary,true);txt(v[key],x+.12,y+.34,cw-.24,rh-.52,n===2?14:13,c.darkest,j===1);});});
 box(X,5.5,W,.62,"#FFFFFF",c.primary);txt("적용 방향",X+.14,5.66,1.2,.3,12,c.primary,true);txt(d.application,X+1.4,5.6,W-1.55,.44,12,c.darkest,true);break;}
 case "value-chain":{const d=S[kind].parse(slide.data),gw=1.78,aw=.34,MW=W-gw-aw,gx=X+MW+aw,sh=.46,sg=.08,lw=1.75;
 d.support.forEach((v,i)=>{const y=Y+i*(sh+sg);box(X,y,lw,sh,c.tint,c.connector);txt(v.name,X+.06,y+.1,lw-.12,sh-.2,12,c.primary,true,"center");box(X+lw+.06,y,MW-lw-.06,sh,c.panel,c.connector);txt(v.detail,X+lw+.2,y+.1,MW-lw-.34,sh-.2,12,c.darkest);});
 const n=d.primary.length,gap=.3,tip=.22,bw=(MW-gap*(n-1))/n,py=Y+d.support.length*(sh+sg)+.12,hh=.62,cy=py+hh+.08,ch=6.1-cy;
 d.primary.forEach((p,i)=>{const x=X+i*(bw+gap),fill=p.focus?c.darkest:c.primary;box(x,py,bw,hh,fill);if(i<n-1)nodes.push({kind:"triangle",x:x+bw,y:py,w:tip,h:hh,fill,rotate:90});
  txt(p.name,x+.08,py+.17,bw-.16,.3,n>5?12:14,"#FFFFFF",true,"center");
  box(x,cy,bw,ch,p.focus?c.tint:c.panel,p.focus?c.primary:c.connector);if(p.focus)tag("집중",x+.1,cy+.1,.62);
  const size=n>5?12:n>4?13:14,top=cy+(p.focus?.42:.1),room=6.1-.1-top,th=Math.min(room,richLines(p.detail,size,bw-.24).length*size*1.3/72+.08);
  txt(p.detail,x+.12,top+(room-th)/2,bw-.24,th,size,c.darkest,p.focus);});
 nodes.push({kind:"triangle",x:X+MW+.08,y:(Y+6.1)/2-.3,w:aw-.14,h:.6,fill:c.connector,rotate:90});
 box(gx,Y,gw,6.1-Y,c.darkest);const tw=gw-.28,nh=richLines(d.goal.name,17,tw).length*17*1.3/72+.06,dh=Math.min(2.6,richLines(d.goal.detail,13,tw).length*13*1.3/72+.08),gy=Y+Math.max(.15,(6.1-Y-(.34+nh+.24+dh))/2);
 txt("목표",gx+.14,gy,tw,.24,10,c.onDarkSub,true);txt(d.goal.name,gx+.14,gy+.34,tw,nh,17,"#FFFFFF",true);line(gx+.14,gy+.34+nh+.1,tw,c.onDarkSub,1);txt(d.goal.detail,gx+.14,gy+.34+nh+.24,tw,dh,13,"#FFFFFF");break;}
 case "hub-spoke":{const d=S[kind].parse(slide.data),n=d.spokes.length,left=d.spokes.slice(0,Math.ceil(n/2)),right=d.spokes.slice(Math.ceil(n/2)),cx=X+W/2,cyy=(Y+6.1)/2,r=1.2,bw=4.15,vline=(x:number,y:number,h:number)=>nodes.push({kind:"line",x,y,w:0,h,fill:c.connector,stroke:c.connector,strokeWidth:1.5});
 const side=(items:typeof d.spokes,x:number,isLeft:boolean,offset:number)=>{const k=items.length,gap=.18,bh=(6.1-Y-gap*(k-1))/k,trunk=isLeft?cx-r-.42:cx+r+.42,ys=items.map((_,i)=>Y+i*(bh+gap)+bh/2);
  items.forEach((v,i)=>{const y=Y+i*(bh+gap);box(x,y,bw,bh,c.panel,c.connector);box(isLeft?x+bw-.08:x,y,.08,bh,c.primary);const tx=isLeft?x+.18:x+.26;
   nodes.push({kind:"ellipse",x:tx,y:y+.16,w:.36,h:.36,fill:c.primary});txt(String(offset+i+1),tx,y+.21,.36,.26,11,"#FFFFFF",true,"center");
   txt(v.name,tx+.48,y+.18,bw-.9,.32,14,c.primary,true);const dh=Math.min(bh-.66,richLines(v.detail,13,bw-.5).length*13*1.3/72+.06);txt(v.detail,tx,y+.6+(bh-.66-dh)/2,bw-.5,dh,13,c.darkest);
   const ex=isLeft?x+bw:x;line(Math.min(ex,trunk),ys[i],Math.abs(trunk-ex),c.connector,1.5);});
  if(k>1)vline(trunk,ys[0],ys[k-1]-ys[0]);line(Math.min(trunk,isLeft?cx-r:cx+r),cyy,Math.abs(trunk-(isLeft?cx-r:cx+r)),c.connector,1.5);};
 side(left,X,true,0);side(right,X+W-bw,false,left.length);
 nodes.push({kind:"ellipse",x:cx-r-.08,y:cyy-r-.08,w:2*r+.16,h:2*r+.16,fill:c.tint});nodes.push({kind:"ellipse",x:cx-r,y:cyy-r,w:2*r,h:2*r,fill:c.darkest});
 txt(d.hub.name,cx-r+.2,cyy-.62,2*r-.4,.42,17,"#FFFFFF",true,"center");txt(d.hub.detail,cx-r+.28,cyy-.1,2*r-.56,.8,11,c.onDarkSub,false,"center");break;}
 case "maturity-steps":{const d=S[kind].parse(slide.data),n=d.levels.length,gap=.14,sw=(W-gap*(n-1))/n,minH=1.75,maxH=6.1-Y-.5;
 d.levels.forEach((v,i)=>{const h=minH+(maxH-minH)*i/(n-1),x=X+i*(sw+gap),y=6.1-h,cur=i===d.current,tgt=i===d.target,head=tgt?c.darkest:cur?c.primary:c.connector;
  box(x,y,sw,h,tgt?c.tint:cur?c.tint:c.panel,tgt||cur?c.primary:c.connector);box(x,y,sw,.62,head);txt(`LEVEL ${i+1}`,x+.14,y+.05,sw-.28,.2,10,tgt||cur?c.onDarkSub:c.darkest,true);txt(v.name,x+.14,y+.25,sw-.28,.32,14,tgt||cur?"#FFFFFF":c.darkest,true);
  const room=h-.62-.2,size=n>4?13:14,th=Math.min(room,richLines(v.state,size,sw-.28).length*size*1.3/72+.06);txt(v.state,x+.14,y+.72,sw-.28,th,size,c.darkest,tgt);
  if(cur||tgt){const label=cur?"현재 위치":"목표",tw=1.1;box(x+(sw-tw)/2,y-.42,tw,.3,cur?c.primary:c.darkest);txt(label,x+(sw-tw)/2,y-.38,tw,.24,11,"#FFFFFF",true,"center");}});
break;}
 case "org-chart":{const d=S[kind].parse(slide.data),tw=3.6,topRoleH=Math.max(.36,textHeight(d.top.role,11,tw-.3)),th=Math.max(.92,.48+topRoleH+.08),tx=X+(W-tw)/2,n=d.units.length,gap=.22,uw=(W-gap*(n-1))/n,bus=Y+th+.36,uy=bus+.32,vline=(x:number,y:number,h:number)=>nodes.push({kind:"line",x,y,w:0,h,fill:c.connector,stroke:c.connector,strokeWidth:1.5});
 box(tx,Y,tw,th,c.darkest);txt(d.top.name,tx+.15,Y+.1,tw-.3,.34,16,"#FFFFFF",true,"center");txt(d.top.role,tx+.15,Y+.48,tw-.3,topRoleH,11,c.onDarkSub,false,"center");
 d.advisors.forEach(a=>{const aw=2.8,ax=tx+tw+.9;line(tx+tw,Y+th/2,.9,c.connector,1.5);box(ax,Y+.06,aw,th-.12,c.tint,c.primary);txt(a.name,ax+.12,Y+.12,aw-.24,.28,13,c.primary,true,"center");txt(a.role,ax+.12,Y+.44,aw-.24,.34,11,c.darkest,false,"center");});
 vline(X+W/2,Y+th,bus-Y-th);const cxs=d.units.map((_,i)=>X+i*(uw+gap)+uw/2);line(cxs[0],bus,cxs[n-1]-cxs[0],c.connector,1.5);
 d.units.forEach((u,i)=>{const x=X+i*(uw+gap),h=6.1-uy;vline(cxs[i],bus,uy-bus);header(u.name,x,uy,uw);box(x,uy+.4,uw,h-.4,c.panel,c.connector);
  const size=n>4?12:13,rh=Math.min(h-1.1,richLines(u.role,size,uw-.28).length*size*1.3/72+.06);txt(u.role,x+.14,uy+.4+(h-.4-.6-rh)/2,uw-.28,rh,size,c.darkest);
  box(x+.12,uy+h-.5,uw-.24,.38,"#FFFFFF",c.connector);txt(u.members,x+.2,uy+h-.45,uw-.4,.28,11,c.primary,true,"center");});break;}
 case "flywheel":{const d=S[kind].parse(slide.data),n=d.steps.length,cx=X+W/2,cyy=(Y+6.1)/2,rx=4.25,ry=1.5,cw=3.4,ch=1.12,pt=(a:number)=>[cx+rx*Math.sin(a),cyy-ry*Math.cos(a)] as const;
 nodes.push({kind:"ellipse",x:cx-rx-.035,y:cyy-ry-.035,w:2*rx+.07,h:2*ry+.07,fill:c.connector});nodes.push({kind:"ellipse",x:cx-rx+.035,y:cyy-ry+.035,w:2*rx-.07,h:2*ry-.07,fill:"#FFFFFF"});
 for(let i=0;i<n;i++){const a=2*Math.PI*(i+.5)/n,[ax,ay]=pt(a),deg=Math.atan2(rx*Math.cos(a),-ry*Math.sin(a))*180/Math.PI;nodes.push({kind:"triangle",x:ax-.17,y:ay-.15,w:.34,h:.3,fill:c.primary,rotate:deg});}
 nodes.push({kind:"ellipse",x:cx-1.25,y:cyy-.62,w:2.5,h:1.24,fill:c.darkest});txt(d.center,cx-1.05,cyy-.17,2.1,.36,15,"#FFFFFF",true,"center");
 d.steps.forEach((v,i)=>{const [px,py]=pt(2*Math.PI*i/n),x=px-cw/2,y=Math.min(6.1-ch,Math.max(Y,py-ch/2));box(x,y,cw,ch,c.panel,c.connector);nodes.push({kind:"ellipse",x:x+.14,y:y+.13,w:.34,h:.34,fill:c.primary});txt(String(i+1),x+.14,y+.17,.34,.26,11,"#FFFFFF",true,"center");
  txt(v.name,x+.58,y+.14,cw-.7,.3,14,c.primary,true);txt(v.detail,x+.14,y+.54,cw-.28,ch-.6,12,c.darkest);});break;}
 case "evidence-convergence":{const d=S[kind].parse(slide.data),n=d.evidences.length,ew=5.9,gap=.14,eh=(6.1-Y-gap*(n-1))/n,lw=Math.min(2.4,Math.max(1.45,...d.evidences.map(v=>[...v.label].reduce((sum,ch)=>sum+(/[\u1100-\uFFFF]/.test(ch)?1:.55),0)*14/72/2+.2))),fx=X+ew+.18,fw=1.5,kx=fx+fw+.12,kw=X+W-kx,kh=Math.min(6.1-Y,Math.max(2.5,1.44+textHeight(d.conclusion.detail,13,kw-.4)+.22)),ky=(Y+6.1)/2-kh/2;
 nodes.push({kind:"triangle",x:fx,y:Y,w:fw,h:6.1-Y,fill:c.tint,rotate:90});
 d.evidences.forEach((v,i)=>{const y=Y+i*(eh+gap),pt=fitStack([v.label],lw-.2,eh-.42,14,12),lh=textHeight(v.label,pt,lw-.2),ly=y+(eh-lh-.25)/2;box(X,y,lw,eh,c.tint,c.connector);txt(v.label,X+.1,ly,lw-.2,lh+.02,pt,c.primary,true,"center");txt(v.tag,X+.1,ly+lh+.06,lw-.2,.22,10,c.muted,true,"center");
  box(X+lw+.06,y,ew-lw-.06,eh,c.panel,c.connector);const factPt=fitStack([v.fact],ew-lw-.36,eh-.16,13,10),th=eh-.16;txt(v.fact,X+lw+.21,y+.08,ew-lw-.36,th,factPt,c.darkest);});
 box(kx,ky,kw,kh,c.darkest);txt("결론",kx+.2,ky+.2,kw-.4,.24,10,c.onDarkSub,true);txt(d.conclusion.title,kx+.2,ky+.48,kw-.4,.7,18,"#FFFFFF",true);line(kx+.2,ky+1.22,kw-.4,c.onDarkSub,1);txt(d.conclusion.detail,kx+.2,ky+1.34,kw-.4,kh-1.44,fitStack([d.conclusion.detail],kw-.4,kh-1.44,13,10),"#FFFFFF");break;}
 case "kpi-tree":{const d=S[kind].parse(slide.data),total=d.drivers.reduce((s,v)=>s+v.kpis.length,0),gw=2.55,dx=X+gw+.55,dw=2.9,kx=dx+dw+.55,kw=X+W-kx,gap=.1,dgap=.18,rh=(6.1-Y-gap*(total-d.drivers.length)-dgap*(d.drivers.length-1))/total,vline=(x:number,y:number,h:number)=>nodes.push({kind:"line",x,y,w:0,h,fill:c.connector,stroke:c.connector,strokeWidth:1.5});
 const gh=2.1,gy=(Y+6.1)/2-gh/2;box(X,gy,gw,gh,c.darkest);txt("최종 목표",X+.16,gy+.18,gw-.32,.24,10,c.onDarkSub,true);txt(d.goal.name,X+.16,gy+.46,gw-.32,.66,16,"#FFFFFF",true);line(X+.16,gy+1.2,gw-.32,c.onDarkSub,1);txt(d.goal.target,X+.16,gy+1.32,gw-.32,.6,18,"#FFFFFF",true);
 let y=Y;const dc:number[]=[];const t1=X+gw+.27,t2=dx+dw+.27;
 d.drivers.forEach(v=>{const h=v.kpis.length*rh+(v.kpis.length-1)*gap;box(dx,y,dw,h,c.primary);txt(v.name,dx+.14,y+h/2-.17,dw-.28,.34,14,"#FFFFFF",true,"center");dc.push(y+h/2);
  const kc:number[]=[];v.kpis.forEach((k,j)=>{const ky=y+j*(rh+gap);box(kx,ky,kw,rh,c.panel,c.connector);txt(k.name,kx+.16,ky+rh/2-.15,kw*.58,.3,13,c.darkest);txt(k.target,kx+kw*.6,ky+rh/2-.16,kw*.4-.16,.32,14,c.primary,true,"right");kc.push(ky+rh/2);line(t2,ky+rh/2,kx-t2,c.connector,1.5);});
  line(dx+dw,y+h/2,t2-dx-dw,c.connector,1.5);if(kc.length>1)vline(t2,kc[0],kc[kc.length-1]-kc[0]);y+=h+dgap;});
 line(X+gw,(Y+6.1)/2,t1-X-gw,c.connector,1.5);dc.forEach(cy0=>line(t1,cy0,dx-t1,c.connector,1.5));vline(t1,Math.min(dc[0],(Y+6.1)/2),Math.max(dc[dc.length-1],(Y+6.1)/2)-Math.min(dc[0],(Y+6.1)/2));break;}
 case "tam-sam-som":{const d=S[kind].parse(slide.data),fills=[c.tint,c.accent,c.darkest],ink=[c.primary,"#FFFFFF","#FFFFFF"],D=[4.1,2.85,1.6],bottom=6.06,cx=X+2.35;
 // 포함 관계: 바깥(연함)→안(진함)으로 겹친 원. 이름·규모는 각 원의 위쪽 띠(가장 안쪽은 원 가운데)에 둔다.
 D.forEach((dd,i)=>nodes.push({kind:"ellipse",x:cx-dd/2,y:bottom-dd,w:dd,h:dd,fill:fills[i]}));
 d.levels.forEach((v,i)=>{const top=bottom-D[i],mid=i<2?(top+bottom-D[i+1])/2:top+D[2]/2,yy=mid-.31;txt(v.name,cx-1,yy,2,.26,11,i?c.onDarkSub:c.primary,true,"center");txt(v.value,cx-1.3,yy+.25,2.6,.38,17,ink[i],true,"center");});
 const rx=X+5.05,rw=X+W-rx,gap=.14,rh=(6.1-Y-gap*2)/3,tw=rw-.48;
 d.levels.forEach((v,i)=>{const y=Y+i*(rh+gap),basis=`산출 근거 · ${v.basis}`;box(rx,y,rw,rh,c.panel,c.connector);box(rx,y,.14,rh,fills[i],i?undefined:c.primary);
  txt(`${v.name}  ${v.value}`,rx+.32,y+.12,tw,.3,14,c.primary,true);
  const size=fitStack([v.definition,basis],tw,rh-.56-.1,13,11,.06),h1=textHeight(v.definition,size,tw);
  txt(v.definition,rx+.32,y+.5,tw,h1+.03,size,c.darkest);txt(basis,rx+.32,y+.5+h1+.06,tw,textHeight(basis,size-1,tw)+.03,size-1,c.muted);});break;}
 case "risk-matrix":{const d=S[kind].parse(slide.data),lv=["낮음","중간","높음"] as const,cs=1.1,gx=X+.62,gy=Y+.32,score=(r:{impact:string;likelihood:string})=>lv.indexOf(r.impact as never)+lv.indexOf(r.likelihood as never);
 // 영향도(세로, 위가 높음)×발생 가능성(가로, 오른쪽이 높음). 위험할수록 진한 칸, 리스크는 ID 배지로 칸에 놓는다.
 const sev=(n:number)=>n>=4?c.darkest:n===3?c.primary:n===2?c.tint:c.panel;
 for(let ii=0;ii<3;ii++)for(let li=0;li<3;li++){const x=gx+li*cs,y=gy+(2-ii)*cs,n=ii+li;box(x+.03,y+.03,cs-.06,cs-.06,sev(n));
  const here=d.risks.filter(r=>lv.indexOf(r.impact)===ii&&lv.indexOf(r.likelihood)===li),k=here.length;if(!k)continue;
  const bs=k<=2?.44:.34,per=k<=4?2:3,rows=Math.ceil(k/per),g=.06;
  here.forEach((r,j)=>{const row=Math.floor(j/per),inRow=Math.min(per,k-row*per),col=j%per,bx=x+cs/2-(inRow*bs+(inRow-1)*g)/2+col*(bs+g),by=y+cs/2-(rows*bs+(rows-1)*g)/2+row*(bs+g);
   nodes.push({kind:"ellipse",x:bx,y:by,w:bs,h:bs,fill:n>=3?"#FFFFFF":c.darkest});txt(r.id,bx,by+bs/2-.11,bs,.22,bs>.4?11:9,n>=3?c.darkest:"#FFFFFF",true,"center");});}
 txt("영향도 ↑",X,Y,1.6,.26,11,c.primary,true);txt("발생 가능성 →",gx+3*cs-1.6,gy+3*cs+.28,1.6,.24,11,c.primary,true,"right");
 lv.forEach((v,i)=>{txt(v,X,gy+(2-i)*cs+cs/2-.12,gx-X-.08,.24,11,c.muted,true,"right");txt(v,gx+i*cs,gy+3*cs+.05,cs,.24,11,c.muted,true,"center");});
 const lx=gx+3*cs+.35,lw=X+W-lx,n=d.risks.length,gap=.1,rh=(6.1-Y-gap*(n-1))/n,nw=2.35,rw=lw-.62-nw-.3,sorted=[...d.risks].sort((a,b)=>score(b)-score(a));
 let rs=13;while(rs>10.5&&sorted.some(r=>textHeight(r.response,rs,rw)>rh-.1))rs-=.5;
 sorted.forEach((r,i)=>{const y=Y+i*(rh+gap),n2=score(r);box(lx,y,lw,rh,c.panel,c.connector);nodes.push({kind:"ellipse",x:lx+.12,y:y+rh/2-.19,w:.38,h:.38,fill:n2>=4?c.darkest:n2===3?c.primary:c.accent});txt(r.id,lx+.12,y+rh/2-.1,.38,.22,10,"#FFFFFF",true,"center");
  let ns=13;while(ns>11&&textHeight(r.name,ns,nw)+.24>rh-.08)ns-=.5;const nh=textHeight(r.name,ns,nw),top=y+(rh-nh-.22)/2;
  txt(r.name,lx+.62,top,nw,nh+.02,ns,c.primary,true);txt(`영향 ${r.impact} · 가능성 ${r.likelihood}`,lx+.62,top+nh+.02,nw,.2,10,c.muted);
  const th=textHeight(r.response,rs,rw);txt(r.response,lx+.62+nw+.3,y+(rh-th)/2,rw,th+.03,rs,c.darkest);});break;}
 case "key-number":{const d=S[kind].parse(slide.data),lw=5.2,ph=6.1-Y,iw=lw-.7;box(X,Y,lw,ph,c.darkest);
 // 판단을 이끄는 숫자 하나를 크게, 무엇을 잰 값인지와 비교 기준을 아래에 둔다. 오른쪽은 시사점 카드.
 let ns=88;while(ns>40&&richLines(d.number,ns,iw*0.8).length>1)ns-=4;const nh=ns*1.25/72,lh=textHeight(d.numberLabel,16,iw),cs=fitStack([d.context],iw,1.3,13,11),ch=textHeight(d.context,cs,iw),total=.3+nh+.2+lh+.36+ch;
 let y=Y+Math.max(.25,(ph-total)/2);txt("핵심 수치",X+.35,y,iw,.26,11,c.onDarkSub,true);y+=.3;txt(d.number,X+.35,y,iw,nh,ns,"#FFFFFF",true);y+=nh+.2;
 txt(d.numberLabel,X+.35,y,iw,lh+.03,16,"#FFFFFF",true);y+=lh+.18;line(X+.35,y,iw,c.onDarkSub,1);y+=.18;txt(d.context,X+.35,y,iw,ch+.03,cs,c.onDarkSub);
 const px=X+lw+.25,pw=X+W-px,n=d.points.length,gap=.14,hh=(ph-gap*(n-1))/n,tw=pw-1.1;
 d.points.forEach((p,i)=>{const yy=Y+i*(hh+gap);box(px,yy,pw,hh,c.panel,c.connector);box(px,yy,.1,hh,c.primary);
  const ds=fitStack([p.detail],tw,hh-.3-.5,15,12),th=textHeight(p.title,16,tw),dh=textHeight(p.detail,ds,tw),top=yy+(hh-th-.12-dh)/2;
  nodes.push({kind:"ellipse",x:px+.32,y:top-.03,w:.42,h:.42,fill:c.primary});txt(String(i+1),px+.32,top+.06,.42,.26,12,"#FFFFFF",true,"center");
  txt(p.title,px+.92,top,tw,th+.02,16,c.primary,true);txt(p.detail,px+.92,top+th+.12,tw,dh+.03,ds,c.darkest);});break;}
 case "executive-summary":{const d=S[kind].parse(slide.data),w1=2.1,w2=6.2,w3=W-w1-w2,top=Y+.42,rh=(6.1-top)/d.rows.length;
 header("구분",X,Y,w1,true);header("핵심 내용",X+w1,Y,w2);header("시사점",X+w1+w2,Y,w3);
 d.rows.forEach((r,i)=>{const y=top+i*rh;cell(r.section,X,y,w1,rh,true,true);cell(r.finding,X+w1,y,w2,rh);cell(r.implication,X+w1+w2,y,w3,rh,false,true);});break;}
 }
 balance(start);conclusion(common.takeaway);return true;
}

