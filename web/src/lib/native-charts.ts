import type PptxGenJS from "pptxgenjs";
import type { DesignSystem } from "./model";
export type NativeChart = { kind: "bar" | "line" | "waterfall" | "donut" | "pie" | "horizontal"; categories: string[]; series: { name: string; values: number[] }[]; unit: string; stacked?: boolean; focusIndex?: number; compact?: boolean };
type Colors = DesignSystem["colors"];
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
export function validateNativeChart(d: NativeChart) {
 if (!d.categories.length || !d.series.length || !d.unit || d.series.some(s => s.values.length !== d.categories.length || s.values.some(v => !Number.isFinite(v)))) throw Error("차트 범주·계열·단위·값이 잘못됐습니다.");
 if ((d.kind === "donut" || d.kind === "pie") && (d.series[0].values.some(v => v < 0) || d.series[0].values.reduce((a,b) => a+b,0) <= 0)) throw Error("도넛의 구성비가 잘못됐습니다.");
 if (d.kind === "pie" && (d.series.length!==1 || (/%|퍼센트/.test(d.unit)&&Math.abs(d.series[0].values.reduce((n,v)=>n+v,0)-100)>.11))) throw Error("원 점유율은 하나의 분모·한 계열과 합계 100이 필요합니다.");
 if (d.kind === "waterfall" && Math.abs(d.series[0].values.slice(0,-1).reduce((a,b) => a+b,0) - d.series[0].values.at(-1)!) > 1e-7) throw Error("워터폴 끝값이 증감 합계와 다릅니다.");
}
export function waterfallSeries(d: NativeChart) {
 validateNativeChart(d); let running = 0;
 const columns = Array.from({length:8},()=>[] as number[]);
 d.series[0].values.forEach((value,i)=>{
  const total=i===0||i===d.categories.length-1, from=total?0:running, to=total?value:running+value;
  const low=Math.min(from,to),high=Math.max(from,to),basePos=Math.max(0,low),baseNeg=Math.min(0,high);
  const positive=Math.max(0,high)-Math.max(0,low),negative=Math.min(0,low)-Math.min(0,high);
  const row=[basePos,baseNeg,total?positive:0,total?negative:0,!total&&value>=0?positive:0,!total&&value>=0?negative:0,!total&&value<0?positive:0,!total&&value<0?negative:0];
  row.forEach((v,j)=>columns[j].push(v));running=to;
 });
 const names=["투명 양수 기준","투명 음수 기준","총계 양수","총계 음수","증가 양수","증가 음수","감소 양수","감소 음수"];
 const labels=d.categories.map((s,i)=>`${s} (${i>0&&i<d.categories.length-1&&d.series[0].values[i]>0?"+":""}${d.series[0].values[i]})`);
 return columns.map((values,i)=>({name:names[i],labels,values}));
}
export function chartPreviewDataUrl(d: NativeChart, c: Colors,aspect?:number,geometry?:{w:number;h:number}) {
 validateNativeChart(d); const colors=(d.kind==="pie"||(d.kind==="donut"&&d.categories.length===2))?[c.primary,c.tint,c.accent,c.muted,c.risk,c.darkest]:[c.primary,c.darkest,c.tint,c.muted,c.panel,c.connector];
 const W=900,H=((d.kind==="horizontal"||(d.kind==="pie"&&d.compact))&&aspect)?Math.max(150,900/aspect):430,L=95,R=28,T=42,B=80, pw=W-L-R,ph=H-T-B;
 const text=(s:string,x:number,y:number,size=15,anchor="start",color=c.darkest)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
 const unitPt=d.kind==="pie"&&d.compact&&geometry?10/72*W/geometry.w:15;
 let svg=text(`단위: ${d.unit}`,d.kind==="pie"&&d.compact?0:L,d.kind==="pie"&&d.compact?unitPt*.95:22,unitPt);
 if(d.kind==="pie") {
  const values=d.series[0].values,sum=values.reduce((a,b)=>a+b,0),cx=d.compact?W/2:250,unitHeight=geometry?H*.25/geometry.h:45,cy=d.compact?unitHeight+(H-unitHeight)/2:220,r=d.compact?Math.min(W,H-unitHeight)/2:150;let angle=-Math.PI/2;
  values.forEach((v,i)=>{const sweep=v/sum*Math.PI*2,end=angle+sweep,mid=angle+sweep/2,x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);if(v/sum>.999999)svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[i]}"/>`;else if(v>0)svg+=`<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${sweep>Math.PI?1:0} 1 ${x2} ${y2} Z" fill="${colors[i]}" stroke="white" stroke-width="3"/>`;if(v/sum>=.07)svg+=text(`${(v/sum*100).toFixed(1)}%`,cx+Math.cos(mid)*r*.65,cy+Math.sin(mid)*r*.65+6,d.compact&&geometry?11/72*W/geometry.w:d.compact?28:22,"middle",i===1?c.darkest:"#FFFFFF");if(!d.compact)svg+=`<rect x="490" y="${80+i*45}" width="18" height="18" fill="${colors[i]}"/>`+text(`${d.categories[i]} · ${(v/sum*100).toFixed(1)}%`,525,95+i*45);angle=end;});
 }else if(d.kind==="donut") {
  const values=d.series[0].values,sum=values.reduce((a,b)=>a+b,0),focus=d.focusIndex??values.indexOf(Math.max(...values)); let angle=-Math.PI/2;
  values.forEach((v,i)=>{const end=angle+v/sum*Math.PI*2; const x1=250+150*Math.cos(angle),y1=220+150*Math.sin(angle),x2=250+150*Math.cos(end),y2=220+150*Math.sin(end);if(v>0)svg+=`<path d="M250 220 L${x1} ${y1} A150 150 0 ${end-angle>Math.PI?1:0} 1 ${x2} ${y2} Z" fill="${colors[i]}"/>`;angle=end;svg+=`<rect x="490" y="${80+i*45}" width="18" height="18" fill="${colors[i]}"/>`+text(`${d.categories[i]} · ${(v/sum*100).toFixed(1)}%`,525,95+i*45);});
  svg+=`<circle cx="250" cy="220" r="91" fill="white"/>`+text(`${(values[focus]/sum*100).toFixed(1)}%`,250,218,36,"middle",c.primary)+text(d.categories[focus],250,250,17,"middle");
 } else {
  const all=d.series.flatMap(s=>s.values); let min=Math.min(0,...all),max=Math.max(0,...all);
  if(d.stacked){const sums=d.categories.map((_,i)=>d.series.reduce((a,s)=>a+Math.max(0,s.values[i]),0));max=Math.max(...sums,0);min=Math.min(0,...d.categories.map((_,i)=>d.series.reduce((a,s)=>a+Math.min(0,s.values[i]),0)));}
  if(d.kind==="waterfall"){let v=0;const points=d.series[0].values.slice(0,-1).map(x=>(v+=x));min=Math.min(0,...points);max=Math.max(0,...points);}
  if(max===min)max=min+1;
  const y=(v:number)=>T+ph-(v-min)/(max-min)*ph, step=pw/d.categories.length;
  if(d.kind==="horizontal"){
   const vals=d.series[0].values,lo=Math.min(0,...vals),hi=Math.max(0,...vals),span=hi-lo||1,
    x=(v:number)=>295+(v-lo)/span*500,zero=x(0);
   svg+=`<line x1="${zero}" x2="${zero}" y1="45" y2="${H-45}" stroke="${c.connector}"/>`;
   d.categories.forEach((cat,i)=>{const rowH=(H-100)/vals.length,yy=55+i*rowH,end=x(vals[i]);svg+=text(cat,10,yy+20,17)+`<rect x="${Math.min(zero,end)}" y="${yy}" width="${Math.abs(end-zero)}" height="${Math.max(8,Math.min(25,rowH-5))}" fill="${c.primary}"/>`+text(vals[i].toLocaleString("ko-KR",{maximumFractionDigits:2}),end+(vals[i]<0?-6:6),yy+20,17,vals[i]<0?"end":"start");});
  }else{
   svg+=`<path d="M${L} ${T} V${T+ph} H${W-R}" fill="none" stroke="${c.connector}"/>`;
   for(let tick=0;tick<=4;tick++){const val=min+(max-min)*tick/4;svg+=text(Number(val.toFixed(2)).toLocaleString(),L-10,y(val)+5,13,"end")+`<line x1="${L}" x2="${W-R}" y1="${y(val)}" y2="${y(val)}" stroke="${c.connector}"/>`;}
   d.categories.forEach((cat,i)=>{svg+=text(cat,L+(i+.5)*step,H-55,13,"middle");});
   if(d.kind==="line")d.series.forEach((s,k)=>{const pts=s.values.map((v,i)=>`${L+(i+.5)*step},${y(v)}`).join(" ");svg+=`<polyline points="${pts}" fill="none" stroke="${colors[k]}" stroke-width="3"/>`;s.values.forEach((v,i)=>{const x=L+(i+.5)*step;svg+=`<circle cx="${x}" cy="${y(v)}" r="4" fill="${colors[k]}"/>`+text(String(v),x,y(v)-10-k*5,12,"middle",colors[k]);});});
   else if(d.kind==="waterfall") {let run=0;d.series[0].values.forEach((v,i)=>{const total=!i||i===d.categories.length-1,from=total?0:run,to=total?v:run+v,x=L+(i+.2)*step;svg+=`<rect x="${x}" y="${y(Math.max(from,to))}" width="${step*.6}" height="${Math.abs(y(from)-y(to))}" fill="${total?c.darkest:v>=0?c.primary:c.muted}"/>`+text(`${!total&&v>0?"+":""}${v}`,x+step*.3,y(Math.max(from,to))-8,13,"middle");run=to;});}
   else {const pos=Array(d.categories.length).fill(0) as number[],neg=Array(d.categories.length).fill(0) as number[];d.series.forEach((s,k)=>s.values.forEach((v,i)=>{const from=d.stacked?(v>=0?pos[i]:neg[i]):0,to=from+v,x=L+i*step+step*.12+(d.stacked?0:k*step*.76/d.series.length),w=step*.76/(d.stacked?1:d.series.length);svg+=`<rect x="${x}" y="${y(Math.max(from,to))}" width="${w}" height="${Math.abs(y(from)-y(to))}" fill="${colors[k]}"/>`+text(String(v),x+w/2,y(Math.max(from,to))-5,12,"middle");if(v>=0)pos[i]=to;else neg[i]=to;}));}
  }
  if(d.kind!=="waterfall")d.series.forEach((s,k)=>{svg+=`<rect x="${L+k*210}" y="${H-20}" width="12" height="12" fill="${colors[k]}"/>`+text(s.name,L+18+k*210,H-9,12);});
 }
 return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${H}" viewBox="0 0 900 ${H}"><rect width="900" height="${H}" fill="white"/><g font-family="Pretendard">${svg}</g></svg>`);
}
export function addNativeChart(slide:PptxGenJS.Slide,d:NativeChart,c:Colors,g:{x:number;y:number;w:number;h:number}) {
 validateNativeChart(d);
 const colors=((d.kind==="pie"||(d.kind==="donut"&&d.categories.length===2))?[c.primary,c.tint,c.accent,c.muted,c.risk,c.darkest]:[c.primary,c.darkest,c.tint,c.muted,c.panel,c.connector]).map(s=>s.slice(1));
 const data=d.series.map(s=>({name:s.name,labels:d.categories,values:s.values}));
 slide.addText(`단위: ${d.unit}`,{x:g.x,y:g.y,w:g.w,h:.22,fontFace:"Pretendard",fontSize:10,color:c.muted.slice(1),margin:0});
 const options: PptxGenJS.IChartOpts = {...g,y:g.y+.25,h:Math.max(.5,g.h-.25),showTitle:false,showLegend:d.series.length>1,showValue:true,lineDataSymbol:d.kind==="line"?"circle":"none",lineDataSymbolSize:5,legendPos:"b",legendFontFace:"Pretendard",legendFontSize:11,dataLabelFontFace:"Pretendard",dataLabelFontSize:11,catAxisLabelFontFace:"Pretendard",catAxisLabelFontSize:11,valAxisLabelFontFace:"Pretendard",valAxisLabelFontSize:10,dataLabelFormatCode:d.series.every(s=>s.values.every(Number.isInteger))?"#,##0":"0.00",dataLabelColor:d.stacked?"FFFFFF":c.darkest.slice(1),dataLabelBkgrdColors:!!d.stacked,dataLabelPosition:d.kind==="line"?"t":d.stacked?"ctr":"outEnd",chartColors:colors};
 // PptxGenJS passes the OOXML orientation through unchanged, but its types
 // expose only minMax. Reverse the category axis so native bars match preview order.
 if(d.kind==="horizontal")Object.assign(options,{catAxisOrientation:"maxMin"});
 if(d.kind==="pie"){
 const values=d.series[0].values,sum=values.reduce((a,b)=>a+b,0),side=Math.min(d.compact?g.w:g.w*.60,g.h-.25),x=d.compact?g.x+(g.w-side)/2:g.x+(g.w*.60-side)/2,y=g.y+.25+(g.h-.25-side)/2;
 slide.addChart("pie",data,{...options,x,y,w:side,h:side,layout:{x:0,y:0,w:1,h:1},firstSliceAng:0,showLegend:false,showValue:false,showPercent:false});
 let angle=-Math.PI/2;values.forEach((v,i)=>{const sweep=v/sum*Math.PI*2,mid=angle+sweep/2;if(v/sum>=.07)slide.addText(`${(v/sum*100).toFixed(1)}%`,{x:x+side/2+Math.cos(mid)*side*.325-.32,y:y+side/2+Math.sin(mid)*side*.325-.12,w:.64,h:.3,align:"center",fontFace:"Pretendard",fontSize:d.compact?11:13,bold:true,color:i===1?c.darkest.slice(1):"FFFFFF",margin:0});angle+=sweep;});
 if(!d.compact){const rowH=Math.min(.52,(g.h-.5)/d.categories.length),top=g.y+(g.h-rowH*d.categories.length)/2;d.categories.forEach((label,j)=>{slide.addShape("rect",{x:g.x+g.w*.65,y:top+j*rowH+.04,w:.16,h:.16,line:{color:colors[j]},fill:{color:colors[j]}});slide.addText(`${label} · ${(values[j]/sum*100).toFixed(1)}%`,{x:g.x+g.w*.65+.26,y:top+j*rowH,w:g.w*.35-.26,h:rowH,fontFace:"Pretendard",fontSize:12,color:c.darkest.slice(1),margin:0});});}
 return;}
 if(d.kind==="donut"){
 const values=d.series[0].values,sum=values.reduce((a,b)=>a+b,0),i=d.focusIndex??values.indexOf(Math.max(...values));
 const side=Math.min(g.w*.59,g.h-.25),x=g.x+(g.w*.60-side)/2,y=g.y+.25+(g.h-.25-side)/2;
 slide.addChart("doughnut",data,{...options,x,y,w:side,h:side,layout:{x:0,y:0,w:1,h:1},holeSize:65,showLegend:false,showValue:false,showPercent:false});
 slide.addText(`${(values[i]/sum*100).toFixed(1)}%`,{x:x+side*.20,y:y+side*.43,w:side*.60,h:.46,align:"center",fontFace:"Pretendard",fontSize:26,bold:true,color:c.primary.slice(1),margin:0});
 const rowH=Math.min(.52,(g.h-.5)/d.categories.length),top=g.y+(g.h-rowH*d.categories.length)/2;
 d.categories.forEach((label,j)=>{slide.addShape("rect",{x:g.x+g.w*.65,y:top+j*rowH+.04,w:.16,h:.16,line:{color:colors[j]},fill:{color:colors[j]}});slide.addText(`${label} · ${(values[j]/sum*100).toFixed(1)}%`,{x:g.x+g.w*.65+.26,y:top+j*rowH,w:g.w*.35-.26,h:rowH,fontFace:"Pretendard",fontSize:12,color:c.darkest.slice(1),margin:0});});
 return;}

 if(d.kind==="waterfall") {slide.addChart("bar",waterfallSeries(d),{...options,barDir:"col",barGrouping:"stacked",dataLabelPosition:"ctr",showValue:false,showLegend:false,chartColors:["transparent","transparent",colors[1],colors[1],colors[0],colors[0],colors[3],colors[3]]}); return;}
 slide.addChart(d.kind==="line"?"line":"bar",data,{...options,catAxisLabelPos:"low",barDir:d.kind==="horizontal"?"bar":"col",barGrouping:d.stacked?"stacked":"clustered"});
}

