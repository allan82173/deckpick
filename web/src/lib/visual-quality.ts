import { makeScene, richLines, SLIDE, type Scene, type SceneNode, type TextNode } from "./scene";
import { GENERATION_CONFIG } from "./generation-config";
import type { DeckInput, OutlineItem, SlideSpec } from "./model";
type Box={x:number;y:number;w:number;h:number};
const intersection=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const units=(s:string)=>[...s].reduce((n,c)=>n+(/[\u1100-\uFFFF]/.test(c)?1:/[MW@]/.test(c)?.85:/[il\s.,:!|]/.test(c)?.3:.55),0);
function ink(n:TextNode):Box {const lines=richLines(n.text,n.size,n.w,n.oneLine);const w=Math.min(n.w,Math.max(...lines.map(l=>units(l.map(r=>r.text).join(""))*n.size/72),0));return {x:n.x+(n.align==="center"?(n.w-w)/2:n.align==="right"?n.w-w:0),y:n.y,w,h:Math.min(n.h,lines.length*n.size*n.lineHeight/72)};}
export function inspectSceneGeometry(scene:Scene, exemptBody=false):string[]{
 const c=GENERATION_CONFIG.visual,t=c.toleranceInches,warnings:string[]=[];
 const texts=scene.nodes.filter((n):n is TextNode=>n.kind==="text"&&!!n.text.trim());
 for(const n of texts){
  const lines=richLines(n.text,n.size,n.w,n.oneLine),height=lines.length*n.size*n.lineHeight/72;
  if(n.x < -t||n.y < -t||n.x+n.w>SLIDE.w+t||n.y+height>SLIDE.h+t)warnings.push(`텍스트가 슬라이드 밖으로 넘칩니다: ${n.text.slice(0,28)}`);
  if(height>n.h+t)warnings.push(`텍스트가 박스 높이를 넘칩니다: ${n.text.slice(0,28)}`);
  if(n.oneLine&&units(n.text)*n.size/72>n.w+t)warnings.push(`한 줄 텍스트가 박스 너비를 넘칩니다: ${n.text.slice(0,28)}`);
  if(n.size<c.minFontPt&&n.y>=c.bodyTop&&n.y<c.bodyBottom)warnings.push(`본문 글자 크기가 작습니다: ${n.size}pt · ${n.text.slice(0,20)}`);
 }
 for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
  const a=ink(texts[i]),b=ink(texts[j]),area=intersection(a,b);if(area>t*t&&area/Math.max(t,Math.min(a.w*a.h,b.w*b.h))>c.overlapAreaFraction)warnings.push(`텍스트끼리 겹칩니다: ${texts[i].text.slice(0,18)} / ${texts[j].text.slice(0,18)}`);
 }
 const shapes=scene.nodes.filter(n=>n.kind!=="text"&&n.kind!=="image"&&n.w*n.h>t&&n.w*n.h<SLIDE.w*SLIDE.h*.5);
 const nodeIndex=new Map(scene.nodes.map((n,i)=>[n,i]));
 // 글자가 나중에 그린 칸 안에 완전히 들어 있으면 그 아래 도형(고리·연결선 등)은 가려지므로 경계 겹침으로 보지 않는다. 작은 번호 라벨은 면적 하한을 t²로 둔다.
 for(const n of texts){const a=ink(n);const covers=shapes.filter(s=>s.kind==="rect"&&intersection(a,s)>=a.w*a.h-t*t);for(const b of shapes){if(covers.some(s=>s!==b&&(nodeIndex.get(s)??0)>(nodeIndex.get(b)??0)))continue;const overlap=intersection(a,b),fraction=overlap/Math.max(t*t,a.w*a.h);if(fraction>c.overlapAreaFraction&&fraction<1-c.overlapAreaFraction)warnings.push(`라벨이 도형 경계와 겹칩니다: ${n.text.slice(0,24)}`);}}
 if(!exemptBody){const content=scene.nodes.filter(n=>(n.kind==="text"&&!!n.text.trim()||n.kind==="image")&&n.y>=c.bodyTop&&n.y<c.bodyBottom);const last=Math.max(c.bodyTop,...content.map(n=>n.y+(n.kind==="text"?ink(n).h:n.h)));if((c.bodyBottom-last)/(c.bodyBottom-c.bodyTop)>=c.emptyBottomFraction)warnings.push(`본문 하단 ${Math.round((c.bodyBottom-last)/(c.bodyBottom-c.bodyTop)*100)}%가 빈 공간입니다.`);}
 return [...new Set(warnings)];
}
