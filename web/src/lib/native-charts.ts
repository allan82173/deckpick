import type PptxGenJS from "pptxgenjs";
import type { DesignSystem } from "./model";
export type NativeChart = { kind: "bar" | "line" | "waterfall" | "donut" | "horizontal"; categories: string[]; series: { name: string; values: number[] }[]; unit: string; stacked?: boolean; focusIndex?: number };
type Colors = DesignSystem["colors"];
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
export function validateNativeChart(d: NativeChart) {
 if (!d.categories.length || !d.series.length || !d.unit || d.series.some(s => s.values.length !== d.categories.length || s.values.some(v => !Number.isFinite(v)))) throw Error("차트 범주·계열·단위·값이 잘못됐습니다.");
 if (d.kind === "donut" && (d.series[0].values.some(v => v < 0) || d.series[0].values.reduce((a,b) => a+b,0) <= 0)) throw Error("도넛의 구성비가 잘못됐습니다.");
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
export function chartPreviewDataUrl(d: NativeChart, c: Colors) {
 validateNativeChart(d); const colors=[c.primary,c.darkest,c.tint,c.muted,c.panel,c.connector];
 const W=900,H=430,L=95,R=28,T=42,B=80, pw=W-L-R,ph=H-T-B;
 const text=(s:string,x:number,y:number,size=15,anchor="start",color=c.darkest)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
 let svg=text(`단위: ${d.unit}`,L,22);
 if(d.kind==="donut") {
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
   const vals=d.series[0].values, mx=Math.max(1,...vals); d.categories.forEach((cat,i)=>{const yy=55+i*(310/vals.length);svg+=text(cat,10,yy+20)+`<rect x="230" y="${yy}" width="${560*Math.max(0,vals[i])/mx}" height="25" fill="${c.primary}"/>`+text(String(vals[i]),240+560*Math.max(0,vals[i])/mx,yy+20);});
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
 return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="430" viewBox="0 0 900 430"><rect width="900" height="430" fill="white"/><g font-family="Pretendard">${svg}</g></svg>`);
}
export function addNativeChart(slide:PptxGenJS.Slide,d:NativeChart,c:Colors,g:{x:number;y:number;w:number;h:number}) {
 validateNativeChart(d);
 const colors=[c.primary,c.darkest,c.tint,c.muted,c.panel,c.connector].map(s=>s.slice(1));
 const data=d.series.map(s=>({name:s.name,labels:d.categories,values:s.values}));
 slide.addText(`단위: ${d.unit}`,{x:g.x,y:g.y,w:g.w,h:.22,fontFace:"Pretendard",fontSize:10,color:c.muted.slice(1),margin:0});
 const options: PptxGenJS.IChartOpts = {...g,y:g.y+.25,h:Math.max(.5,g.h-.25),showTitle:false,showLegend:d.series.length>1,showValue:true,lineDataSymbol:d.kind==="line"?"circle":"none",lineDataSymbolSize:5,legendPos:"b",legendFontFace:"Pretendard",legendFontSize:10,dataLabelFontFace:"Pretendard",dataLabelFontSize:10,catAxisLabelFontFace:"Pretendard",catAxisLabelFontSize:10,valAxisLabelFontFace:"Pretendard",valAxisLabelFontSize:10,dataLabelFormatCode:"0.##",dataLabelColor:c.darkest.slice(1),dataLabelPosition:d.kind==="line"?"t":d.stacked?"ctr":"outEnd",chartColors:colors};
 if(d.kind==="donut"){
 const values=d.series[0].values,sum=values.reduce((a,b)=>a+b,0),i=d.focusIndex??values.indexOf(Math.max(...values));
 const side=Math.min(g.w*.59,g.h-.25),x=g.x+(g.w*.60-side)/2,y=g.y+.25+(g.h-.25-side)/2;
 slide.addChart("doughnut",data,{...options,x,y,w:side,h:side,layout:{x:0,y:0,w:1,h:1},holeSize:65,showLegend:false,showValue:false,showPercent:false});
 slide.addText(`${(values[i]/sum*100).toFixed(1)}%`,{x:x+side*.20,y:y+side*.43,w:side*.60,h:.46,align:"center",fontFace:"Pretendard",fontSize:26,bold:true,color:c.primary.slice(1),margin:0});
 const rowH=Math.min(.52,(g.h-.5)/d.categories.length),top=g.y+(g.h-rowH*d.categories.length)/2;
 d.categories.forEach((label,j)=>{slide.addShape("rect",{x:g.x+g.w*.65,y:top+j*rowH+.04,w:.16,h:.16,line:{color:colors[j]},fill:{color:colors[j]}});slide.addText(`${label} · ${(values[j]/sum*100).toFixed(1)}%`,{x:g.x+g.w*.65+.26,y:top+j*rowH,w:g.w*.35-.26,h:rowH,fontFace:"Pretendard",fontSize:12,color:c.darkest.slice(1),margin:0});});
 return;}

 if(d.kind==="waterfall") {slide.addChart("bar",waterfallSeries(d),{...options,barDir:"col",barGrouping:"stacked",dataLabelPosition:"ctr",showValue:false,showLegend:false,chartColors:["transparent","transparent",colors[1],colors[1],colors[0],colors[0],colors[3],colors[3]]}); return;}
 slide.addChart(d.kind==="line"?"line":"bar",data,{...options,barDir:d.kind==="horizontal"?"bar":"col",barGrouping:d.stacked?"stacked":"clustered"});
}
