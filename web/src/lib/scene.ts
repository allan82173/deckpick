import { GENERATION_CONFIG } from "./generation-config";
import {drawAdaptiveBody,needsAdaptiveBody} from "./adaptive-scene";
import { drawExpanded } from "./expanded-scene";
import { expandedKind } from "./expanded-layouts";
import type { NativeChart } from "./native-charts";
import {equalTracks,sectionTabs} from "./layout-grid";
import {applyCanvasEdits} from "./canvas-edits";
import { dataSchemas, type DesignSystem, type SlideSpec } from "./model";
import { coverPhotoSrc } from "./covers";
import { drawVisual } from "./visual-scene";
import { drawAnalytical } from "./analytical-scene";
export const SLIDE = { w: 13.333333, h: 7.5, margin: 0.42, px: 96 };
export type TextNode = {
  kind: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  size: number;
  color: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  lineHeight: number;
  oneLine?: boolean;
};
export type ShapeNode = {
  kind: "rect" | "ellipse" | "trapezoid" | "line" | "triangle";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  rotate?: number;
  opacity?: number;
  flipV?: boolean;
};
export type ImageNode = { kind: "image"; x: number; y: number; w: number; h: number; src: string; alt: string; chart?: NativeChart };
export type SceneNode = TextNode | ShapeNode | ImageNode;
export type Scene = { nodes: SceneNode[]; warnings: string[] };
function weight(c: string) {
  return /[\u1100-\uFFFF]/.test(c)
    ? 1
    : /[MW@]/.test(c)
      ? 0.85
      : /[il\s.,:!|]/.test(c)
        ? 0.3
        : 0.55;
}
export type RichRun = { text: string; bold: boolean; link?:string };
/** 글 높이(인치). 장면 텍스트 기본 줄 간격 1.25 기준. */
export const textHeight = (text: string, size: number, width: number) => richLines(text, size, width).length * size * 1.25 / 72;
/** 여러 글을 세로로 쌓을 때(간격 gap) 높이 h 안에 들어가는 가장 큰 글자 크기. 칸을 비워 두지 않도록 max부터 줄여 본다. */
export function fitStack(texts: string[], width: number, height: number, max: number, min = 12, gap = 0): number {
  for (let size = max; size >= min; size -= .5) if (texts.reduce((sum, t) => sum + textHeight(t, size, width), 0) + gap * Math.max(0, texts.length - 1) <= height) return size;
  return min;
}
export function richLines(text: string, size: number, width: number, oneLine=false) {
  const max=oneLine?Infinity:Math.max(.1,(width*72)/size),lines:RichRun[][]=[[]];
  if(oneLine)text=text.replace(/\n/g," ");
  const units:{char:string;bold:boolean;link?:string}[]=[];let bold=false;
  for(let i=0;i<text.length;i++){
    const link=text[i]==="["?text.slice(i).match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/):null;
    if(link){for(const char of link[1])units.push({char,bold,link:link[2]});i+=link[0].length-1;}
    else if(text.slice(i,i+2)==="**"){bold=!bold;i++;}else units.push({char:text[i],bold});
  }
  let n=0;
  for(let i=0;i<units.length;i++){
    const unit=units[i],char=unit.char;
    if(char==="\n"){lines.push([]);n=0;continue;}
    if(!/\s/.test(char)&&(i===0||/\s/.test(units[i-1].char))){
      let word=0;for(let j=i;j<units.length&&!/\s/.test(units[j].char);j++)word+=weight(units[j].char);
      if(word<=max&&n>0&&n+word>max){lines.push([]);n=0;}
    }
    const cw=weight(char);
    if(n+cw>max&&lines.at(-1)!.length){lines.push([]);n=0;if(/\s/.test(char))continue;}
    const line=lines.at(-1)!;
    if(line.at(-1)?.bold===unit.bold&&line.at(-1)?.link===unit.link)line.at(-1)!.text+=char;else line.push({text:char,bold:unit.bold,...(unit.link?{link:unit.link}:{})});
    n+=cw;
  }
  return lines;
}
export function wrap(text: string, size: number, width: number) {
  return richLines(text, size, width).map((line) =>
    line.map((r) => r.text).join(""),
  );
}
/**
 * 글자가 박스를 넘으면 글자 크기를 줄여 박스 안에 넣는다. 같은 크기·같은 박스 규격의 형제 텍스트(카드·표 칸 등)는
 * 함께 같은 크기로 맞춰 통일감을 유지하고, 그중 모두가 들어가는 가장 큰(가장 잘 읽히는) 크기를 쓴다.
 * 가독성 하한(본문 최소 글자 크기, 원래 크기의 75%)보다 줄여야 하면 크기는 하한에서 멈추고 문구 축약을 요청한다.
 */
export function fitTextNodes(nodes: SceneNode[], warnings: string[]): SceneNode[] {
  const tolerance = GENERATION_CONFIG.visual.toleranceInches, step = .5;
  const fits = (n: TextNode, size: number) => {
    const lines = richLines(n.text, size, n.w, n.oneLine);
    if (lines.length * size * n.lineHeight / 72 > n.h + tolerance) return false;
    if (n.oneLine && [...n.text.replace(/\*\*/g, "")].reduce((sum, char) => sum + weight(char), 0) * size / 72 > n.w + tolerance) return false;
    return true;
  };
  const floorOf = (n: TextNode) => n.size <= GENERATION_CONFIG.visual.minFontPt ? n.size : Math.max(GENERATION_CONFIG.visual.minFontPt, Math.ceil(n.size * .75 / step) * step);
  const texts = nodes.map((node, index) => ({ node, index })).filter((entry): entry is { node: TextNode; index: number } => entry.node.kind === "text" && !!entry.node.text.trim());
  const fitted = new Map<number, { size: number; resolved: boolean }>();
  for (const { node, index } of texts) {
    if (fits(node, node.size)) continue;
    let size = node.size, resolved = false;
    for (let candidate = node.size - step; candidate >= floorOf(node) - 1e-9; candidate -= step) { size = candidate; if (fits(node, candidate)) { resolved = true; break; } }
    fitted.set(index, { size: Math.max(size, floorOf(node)), resolved });
  }
  if (!fitted.size) return nodes;
  const same = (a: TextNode, b: TextNode) => a.size === b.size && !!a.bold === !!b.bold && Math.abs(a.w - b.w) < .02 && Math.abs(a.h - b.h) < .02 && (Math.abs(a.y - b.y) < .02 || Math.abs(a.x - b.x) < .02);
  const result = [...nodes];
  const unified = new Map<number, number>();
  for (const [index, fit] of fitted) {
    const node = nodes[index] as TextNode;
    const group = texts.filter(entry => same(entry.node, node));
    const size = Math.min(...group.map(entry => fitted.get(entry.index)?.size ?? entry.node.size));
    for (const entry of group) unified.set(entry.index, Math.min(unified.get(entry.index) ?? Infinity, size));
    if (!fit.resolved) warnings.push(`문구 축약 필요: 글자를 줄여도 박스에 들어가지 않습니다 · ${node.text.replace(/\*\*/g, "").slice(0, 24)}`);
  }
  for (const [index, size] of unified) result[index] = { ...(nodes[index] as TextNode), size };
  return result;
}
/** 위→아래로 이어지는 단계 블록의 색: 위는 연한 톤, 아래로 갈수록 진하게(마지막은 가장 진한 색). 글자색은 배경 밝기로 고른다. */
export function stepShade(index: number, count: number, light: string, dark: string, mid?: string) {
  // 주색(mid)을 가운데 정지점으로 두어 연한 톤 → 주색 → 가장 진한 색으로 같은 색상 계열을 유지한다.
  const t = count <= 1 ? 1 : index / (count - 1), hex = (v: string) => v.replace("#", ""), ch = (v: string, k: number) => parseInt(hex(v).slice(k, k + 2), 16);
  const [a, b, u] = mid ? (t <= .5 ? [light, mid, t * 2] : [mid, dark, (t - .5) * 2]) : [light, dark, t];
  const rgb = [0, 2, 4].map(k => Math.round(ch(a as string, k) + (ch(b as string, k) - ch(a as string, k)) * (u as number)));
  const fill = "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return { fill, text: luminance < 0.55 ? "#FFFFFF" : dark, sub: luminance < 0.55 ? "#FFFFFF" : dark };
}
/** 화면 하단 출처는 발행처·자료명만 짧게 보이고, 전체 제목은 근거표·노트에 남긴다. */
export function shortSources(titles: string[], max = 3): string {
  const short = [...new Set(titles.map(title => title.split(/\s[—–-]\s|\s*[(|｜]\s*/)[0].trim()).map(title => title.length > 26 ? title.slice(0, 25) + "…" : title).filter(Boolean))];
  return short.slice(0, max).join(" · ") + (short.length > max ? ` 외 ${short.length - max}건` : "");
}
export function makeScene(
  slide: SlideSpec,
  ds: DesignSystem,
  page = 1,
  deckName = "DeckPick",
  sections: string[] = [],
): Scene {
  const c = ds.colors,
    nodes: SceneNode[] = [],
    warnings: string[] = [];
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke?: string,
  ) => nodes.push({ kind: "rect", x, y, w, h, fill, stroke, strokeWidth: 1 });
  const line = (x: number, y: number, w: number, color: string, width = 1) =>
    nodes.push({
      kind: "line",
      x,
      y,
      w,
      h: 0,
      fill: color,
      stroke: color,
      strokeWidth: width,
    });
  const txt = (
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    size = 14,
    color = c.darkest,
    bold = false,
    align: "left" | "center" | "right" = "left",
  ) => {
    // 넘침은 fitTextNodes가 같은 규격의 형제 텍스트와 함께 한 번에 맞춘다(개별 축소로 크기가 제각각이 되지 않게).
    const s = size;
    nodes.push({
      kind: "text",
      x,
      y,
      w,
      h,
      text,
      size: s,
      color,
      bold,
      align,
      lineHeight: 1.25,
    });
  };
  const coverTitle=(value:string,x:number,y:number,w:number,h:number,size:number,color:string)=>{
    const title=value.replace(/\s+/g," ").trim(),units=Array.from(title).reduce((n,char)=>n+weight(char),0);
    const fitted=Math.min(size,w*72/Math.max(1,units)*.96);
    if(fitted>=16){txt(title,x,y,w,h,Math.floor(fitted*10)/10,color,true);const last=nodes.at(-1);if(last?.kind==="text")last.oneLine=true;}
    else {txt(title,x,y,w,h,Math.min(size,22),color,true);warnings.push("표지 제목이 길어 두 줄 이상입니다. 제목을 줄이거나 제목 상자를 넓혀 주세요.");}
  };
  const placeholder = (
    x: number,
    y: number,
    w: number,
    h: number,
    description: string,
    hint = true,
  ) => {
    box(x, y, w, h, c.tint);
    for (let i = 0; i < 48; i++) {
      const ratio = i / 47;
      const color =
        "#" +
        [1, 3, 5]
          .map((j) =>
            Math.round(
              parseInt(c.primary.slice(j, j + 2), 16) * (1 - ratio) +
                parseInt(c.tint.slice(j, j + 2), 16) * ratio,
            )
              .toString(16)
              .padStart(2, "0"),
          )
          .join("");
      box(x + (w * i) / 48, y, w / 48 + 0.002, h, color);
    }
    if (!hint) return;
    box(x + 0.25, y + h / 2 - 0.5, w - 0.5, 1, c.panel);
    txt(
      "이미지 자리\n" + description,
      x + 0.4,
      y + h / 2 - 0.35,
      w - 0.8,
      0.8,
      12,
      c.muted,
      false,
      "center",
    );
  };
  box(0, 0, SLIDE.w, SLIDE.h, "#FFFFFF");
  // Closing dividers are a visual stop, not another analysis page.
  if (slide.layoutId.endsWith("-end-divider")) {
    dataSchemas[slide.layoutId].parse(slide.data);
    drawExpanded(slide,c,{nodes,box,txt,line});
    return {nodes:applyCanvasEdits(fitTextNodes(nodes,warnings),slide.canvasEdits),warnings:[...new Set(warnings)]};
  }
  const consulting = slide.layoutId.startsWith("c-");
  if (consulting && !["c-cover", "c-toc"].includes(slide.layoutId)) {
    const label=wrap(deckName,9,2.95).length>1?wrap(deckName,9,2.8)[0]+"…":deckName;
    txt(label, 0.42, 0.2, 2.95, 0.22, 9, c.muted);
    sectionTabs(sections,slide.section).forEach(tab=>{
      if(tab.active)box(tab.start,0.1,tab.size,0.36,c.primary);
      txt(tab.label,tab.start+0.07,0.18,tab.size-0.14,0.24,10,tab.active?"#FFFFFF":c.muted,tab.active,"center");
    });
    line(0.42,0.46,12.49,c.primary,0.65);
    txt(slide.headline, 0.42, 0.72, 12.49, 0.7, 18, c.darkest, true);
  } else if (
    !["c-cover", "m-cover", "m-big-message", "m-quote-cta"].includes(
      slide.layoutId,
    )
  )
    txt(slide.headline, 0.8, 0.65, 11.73, 0.8, 24, c.darkest, true);
  if (!["c-cover", "m-cover"].includes(slide.layoutId)) {
    if (slide.sources.length && (!slide.evidenceRefs?.length || !slide.internalReview))
      txt(
        "출처: " + shortSources(slide.sources.map((s) => s.title)),
        0.42,
        7.05,
        11.4,
        0.2,
        8,
        c.muted,
      );
    txt(
      String(page).padStart(2, "0"),
      12.31,
      7.08,
      0.5,
      0.22,
      10,
      c.muted,
      false,
      "right",
    );
  }
  const checked = dataSchemas[slide.layoutId].safeParse(slide.data);
  if (!checked.success && expandedKind(slide.layoutId)) throw Error("새 레이아웃의 필수 데이터가 비었거나 범위를 벗어났습니다.");
  if (!checked.success) {
    txt("내용을 입력해 주세요.", 0.8, 3, 11.7, 1, 18, c.muted, false, "center");
    return {
      nodes,
      warnings: ["비어 있거나 잘못 입력한 내용을 확인해 주세요."],
    };
  }
  if (slide.evidenceRefs?.length && slide.internalReview) txt(slide.evidenceRefs.map(id => `[${id}]`).join(""), .42, 7.12, 10.5, .2, 8, c.muted);
  if (slide.internalReview) txt("내부 검토용", 10.55, 7.1, 1.5, .22, 9, c.muted, true, "right");
  if (slide.claimType && ["추론", "가설", "계산"].includes(slide.claimType)) txt(`[${slide.claimType}]`, .42, 1.49, 2.3, .25, 10, c.muted, true);
  const bodyStart=nodes.length,warningStart=warnings.length;
  if (drawExpanded(slide,c,{nodes,box,txt,line}) || drawAnalytical(slide,c,{ nodes,box,txt,line }) || drawVisual(slide,c,{ nodes,box,txt,line })) {
    if(needsAdaptiveBody(slide,nodes.slice(bodyStart),warnings.slice(warningStart))){nodes.splice(bodyStart);warnings.splice(warningStart);drawAdaptiveBody(slide,c,{nodes,box,txt});}
    return { nodes:applyCanvasEdits(fitTextNodes(nodes,warnings),slide.canvasEdits),warnings:[...new Set(warnings)] };
  }
  switch (slide.layoutId) {
    case "c-cover": {
      const d = dataSchemas["c-cover"].parse(slide.data);
      if (d.coverStyle === "photo") {
        const src = coverPhotoSrc(d);
        if (src) nodes.push({ kind: "image", x: 6.633333, y: 0, w: 6.7, h: 7.5, src, alt: "프로젝트 표지 사진" });
        else placeholder(6.633333, 0, 6.7, 7.5, "선택한 장표에서 프로젝트 사진을 넣어 주세요", false);
        box(0, 0, 6.633333, 7.5, "#FFFFFF");
        line(0.65, 0.8, 0.7, c.primary, 4);
        txt(d.eyebrow ?? "PROJECT PROPOSAL", 0.65, 1.12, 5.25, 0.4, 11, c.primary, true);
        coverTitle(d.title,0.65,2.12,5.3,2.4,30,c.darkest);
        txt(d.subtitle, 0.65, 4.85, 5.25, d.eyebrow ? 1.35 : 0.8, 14, c.muted);
        txt(d.author, 0.65, 6.7, 5.3, 0.35, 11, c.muted);
        if (d.referencePhoto && !d.photoId) txt("사진: 맹그로브 공식 홈페이지", 0.65, 7.15, 5.3, 0.18, 7, c.muted);
        break;
      }
      if (d.coverStyle === "white") {
        box(0, 0, 0.2, 7.5, c.primary);
        txt(d.eyebrow ?? "STRATEGY REPORT", 0.8, 0.8, 10.8, 0.4, 12, c.primary, true);
        coverTitle(d.title,.8,2.2,11.6,1.9,36,c.darkest);
        line(0.8, 4.55, 11.7, c.primary, 1.5);
        txt(d.subtitle, 0.8, 4.95, 10.7, d.eyebrow ? 1.35 : 0.85, 16, c.muted);
        txt(d.author, 0.8, 6.65, 10.7, 0.35, 12, c.muted);
        break;
      }
      if (d.coverStyle === "type") {
        box(0, 0, SLIDE.w, 7.5, c.panel);
        box(9.9, 0, 3.43, 7.5, c.primary);
        txt(d.eyebrow ?? "PROPOSAL", 0.7, 0.65, 8.4, 0.4, 12, c.primary, true);
        coverTitle(d.title,.7,2,8.35,2.3,37,c.darkest);
        txt(d.subtitle, 0.7, 4.85, 8.35, d.eyebrow ? 1.35 : 0.9, 16, c.muted);
        txt(d.author, 0.7, 6.6, 8.35, 0.35, 12, c.muted);
        txt("01", 10.35, 5.9, 2.3, 1, 54, "#FFFFFF", true, "center");
        break;
      }
      box(0, 0, SLIDE.w, 7.5, c.primary);
      txt(deckName, 0.6, 0.45, 12, 0.4, 14, c.tint, true);
      coverTitle(d.title,.6,2.35,11.7,1.35,30,"#FFFFFF");
      line(0.6, 4.0, 12.1, c.coverLine, 1.5);
      txt(d.subtitle, 0.6, 4.35, 11.8, 0.7, 16, "#FFFFFF");
      txt(d.author, 0.6, 6.45, 11.8, 0.4, 13, c.onDarkSub);
      break;
    }
    case "c-toc": {
      // 목차는 본문 높이를 세로로 나눠 번호·제목을 크게 놓는다(위쪽 한 줄 배치는 아래 절반이 비었다).
      const d = dataSchemas["c-toc"].parse(slide.data), top = 1.95, rh = (6.15 - top) / d.items.length, size = fitStack(d.items, 9.6, rh - .2, 22, 15);
      d.items.forEach((t, i) => {
        const y = top + i * rh;
        txt(String(i + 1).padStart(2, "0"), 0.9, y + rh / 2 - 0.3, 1.2, 0.6, 30, c.primary, true);
        nodes.push({ kind: "rect", x: 2.2, y: y + rh / 2 - 0.3, w: 0.06, h: 0.6, fill: i === 0 ? c.primary : c.connector });
        const th = textHeight(t, size, 9.6);
        txt(t, 2.6, y + (rh - th) / 2, 9.6, th + 0.05, size, c.darkest, true);
        if (i < d.items.length - 1) line(0.9, y + rh, 11.55, c.connector, 1);
      });
      break;
    }
    case "c-header-boxes": {
      // 글머리표를 칸 높이에 고르게 나눠 배치하고, 칸을 채우는 하나의 글자 크기로 맞춘다. 점은 첫 줄 높이에 맞춘다.
      const d = dataSchemas["c-header-boxes"].parse(slide.data),
        w = (12.49 - (d.columns.length - 1) * 0.3) / d.columns.length, top = 2.62, bottom = 5.82, tw = w - 0.68;
      const most = Math.max(...d.columns.map(v => v.bullets.length)), slot = (bottom - top) / most;
      const size = Math.min(...d.columns.map(v => Math.min(...v.bullets.map(b => fitStack([b], tw, slot - 0.16, 18, 12)))));
      d.columns.forEach((v, i) => {
        const x = 0.42 + i * (w + 0.3);
        box(x, 2, w, 3.95, "#FFFFFF", c.primary);
        box(x, 2, w, 0.46, c.primary);
        txt(v.title, x + 0.15, 2.09, w - 0.3, 0.3, 15, "#FFFFFF", true);
        const used = v.bullets.reduce((n, b) => n + textHeight(b, size, tw), 0), gap = Math.min(0.5, (bottom - top - used) / Math.max(1, v.bullets.length));
        let y = top + Math.max(0, (bottom - top - used - gap * (v.bullets.length - 1)) / 2);
        v.bullets.forEach((b, k) => {
          const th = textHeight(b, size, tw);
          nodes.push({ kind: "ellipse", x: x + 0.22, y: y + size * 1.25 / 72 / 2 - 0.045, w: 0.09, h: 0.09, fill: c.accent });
          txt(b, x + 0.48, y, tw, th + 0.04, size, c.darkest);
          if (k < v.bullets.length - 1) line(x + 0.22, y + th + gap / 2, w - 0.44, c.panel, 1);
          y += th + gap;
        });
      });
      break;
    }
    case "c-funnel": {
      const d = dataSchemas["c-funnel"].parse(slide.data);
      // 단계가 적으면 같은 본문 영역을 단계 높이로 채운다(3단계는 기존 배치와 동일).
      const fewer = d.steps.length < 3, step = fewer ? 4.5 / d.steps.length : 1.5, height = fewer ? step - 0.45 : 1.05, pad = fewer ? (height - 1.05) / 2 : 0, extra = fewer ? height - 1.05 : 0;
      d.steps.forEach((s, i) => {
        const w = 11.8 - i * 1.5,
          x = (SLIDE.w - w) / 2,
          y = 1.72 + i * step,
          shade = stepShade(i, d.steps.length, c.tint, c.darkest, c.primary);
        box(
          x,
          y,
          w,
          height,
          shade.fill,
          shade.fill,
        );
        txt(
          s.title,
          x + 0.25,
          y + pad + 0.13,
          w - 0.5,
          0.3,
          15,
          shade.text,
          true,
        );
        txt(
          s.body,
          x + 0.25,
          y + pad + 0.55,
          w - 0.5,
          0.35,
          13,
          shade.sub,
        );
        if (i < d.steps.length - 1)
          nodes.push({
            kind: "trapezoid",
            x: x + 0.3,
            y: y + 1.13 + extra,
            w: w - 0.6,
            h: 0.25,
            fill: c.connector,
            rotate: 180,
          });
      });
      break;
    }
    case "c-arrow-flow": {
      // 단계 칸을 결론 줄 위까지 늘리고, 본문은 칸을 채우는 크기로 가운데 둔다.
      const d = dataSchemas["c-arrow-flow"].parse(slide.data),
        gap = 0.45,
        w = (12.49 - gap * (d.blocks.length - 1)) / d.blocks.length, top = 2.0, h = 4.05, bw = w - 0.5, size = Math.min(...d.blocks.map(s => fitStack([s.body], bw, h - 0.85, 20, 13)));
      d.blocks.forEach((s, i) => {
        const x = 0.42 + i * (w + gap), th = textHeight(s.body, size, bw);
        box(x, top, w, h, c.panel, c.primary);
        box(x, top, w, 0.55, i === d.blocks.length - 1 ? c.darkest : c.primary);
        txt(`STEP ${i + 1}`, x + 0.14, top + 0.06, 1, 0.2, 10, c.onDarkSub, true);
        txt(s.title, x + 0.12, top + 0.22, w - 0.24, 0.3, 15, "#FFFFFF", true, "center");
        txt(s.body, x + 0.25, top + 0.55 + (h - 0.55 - th) / 2, bw, th + 0.05, size, c.darkest, true, "center");
        if (i < d.blocks.length - 1)
          nodes.push({ kind: "triangle", x: x + w + (gap - 0.18) / 2, y: top + h / 2 - 0.2, w: 0.18, h: 0.4, fill: c.accent, rotate: 90 });
      });
      break;
    }
    case "c-metric-cards": {
      const d = dataSchemas["c-metric-cards"].parse(slide.data),
        // 행이 2개뿐이면 남는 높이를 행에 나눠 채우고 내용은 행 가운데에 둔다(3·4행은 기존 배치와 동일).
        rh = d.rows.length >= 3 ? Math.min(1.42, 4.9 / d.rows.length) : 4.9 / d.rows.length,
        pad = Math.max(0, (rh - 1.42) / 2);
      d.rows.forEach((s, i) => {
        const y = 1.7 + i * rh;
        box(0.42, y, 2.15, rh - 0.16, c.tint);
        txt(s.label, 0.65, y + pad + 0.3, 1.7, 0.6, 16, c.primary, true);
        box(2.57, y, 10.34, rh - 0.16, "#FFFFFF", c.primary);
        txt(s.value, 2.85, y + pad + 0.22, 3, 0.65, 28, c.primary, true);
        txt(s.strong, 6, y + pad + 0.22, 6.5, 0.5, 14, c.darkest, true);
        txt(s.sub, 6, y + pad + 0.75, 6.5, 0.4, 12, c.muted);
      });
      break;
    }
    case "c-compare": {
      // 머리행은 낮게(0.55in) 두고 나머지 높이를 기준 행에 나눈다. 칸 글자는 하나의 크기로 가운데 정렬, 추천 대안은 진한 머리와 연한 칸으로 강조한다.
      const d = dataSchemas["c-compare"].parse(slide.data),
        w = 9.89 / d.options.length, hh = 0.55, top = 1.95,
        rh = (6.15 - top - hh) / d.criteria.length, cw = w - 0.3,
        size = Math.min(...d.cells.flat().map(t => fitStack([t], cw, rh - 0.2, 15, 12)));
      box(0.42, top, 2.6, hh, c.primary);
      d.options.forEach((s, j) => {
        const rec = j === d.recommended;
        box(3.02 + j * w, top, w, hh, rec ? c.darkest : c.primary);
        txt(s + (rec ? "  · 추천" : ""), 3.12 + j * w, top + 0.14, w - 0.2, 0.3, 14, "#FFFFFF", true, "center");
      });
      d.criteria.forEach((s, i) => {
        const y = top + hh + i * rh;
        box(0.42, y, 2.6, rh, c.panel, c.connector);
        nodes.push({ kind: "rect", x: 0.42, y: y + 0.14, w: 0.06, h: rh - 0.28, fill: c.primary });
        const lh = textHeight(s, 13, 2.2);
        txt(s, 0.62, y + (rh - lh) / 2, 2.2, lh + 0.04, 13, c.primary, true);
        d.options.forEach((_, j) => {
          const rec = j === d.recommended, th = textHeight(d.cells[i][j], size, cw);
          box(3.02 + j * w, y, w, rh, rec ? c.tint : "#FFFFFF", c.connector);
          txt(d.cells[i][j], 3.17 + j * w, y + (rh - th) / 2, cw, th + 0.04, size, c.darkest, rec, "center");
        });
      });
      break;
    }
    case "c-conclusion": {
      const d = dataSchemas["c-conclusion"].parse(slide.data),
        w = (12.49 - 0.3 * (d.points.length - 1)) / d.points.length;
      d.points.forEach((s, i) => {
        const x = 0.42 + i * (w + 0.3);
        box(x, 1.85, w, 3.5, c.panel, c.primary);
        txt(s.title, x + 0.28, 2.2, w - 0.56, 0.7, 18, c.primary, true);
        txt(s.body, x + 0.28, 3.15, w - 0.56, 1.8, 16, c.textSub);
      });
      box(0.42, 5.8, 12.49, 0.8, c.darkest);
      txt(d.conclusion, 0.65, 6, 12.03, 0.45, 18, "#FFFFFF", true, "center");
      break;
    }
    case "c-split-insight": {
      const d = dataSchemas["c-split-insight"].parse(slide.data);
      box(0.42, 1.9, 4.1, 4.75, c.darkest);
      txt("핵심 통찰", 0.7, 2.15, 3.5, 0.3, 12, c.onDarkSub);
      txt(d.takeaway, 0.7, 2.8, 3.5, 2.1, 22, "#FFFFFF", true);
      line(0.7, 5.12, 3.5, c.coverLine);
      txt(d.implication, 0.7, 5.4, 3.5, 0.95, 12, "#FFFFFF");
      d.evidence.forEach((e, i) => {
        const {start:y,size:h}=equalTracks(1.9,4.75,d.evidence.length,.18)[i];
        box(4.85, y, 8.06, h, c.panel);
        txt(String(i + 1).padStart(2, "0"), 5.08, y + 0.2, 0.6, 0.4, 18, c.primary, true);
        txt(e.title, 5.85, y + 0.18, 6.8, 0.35, 14, c.darkest, true);
        txt(e.body, 5.85, y + 0.67, 6.8, 0.65, 12, c.textSub);
      });
      break;
    }
    case "c-matrix": {
      const d = dataSchemas["c-matrix"].parse(slide.data);
      txt("정성적 비교 프레임", 0.42, 1.55, 8.1, 0.28, 11, c.muted);
      d.cells.forEach((cell, i) => {
        const x = 0.42 + (i % 2) * 4.2, y = 2 + Math.floor(i / 2) * 2.15;
        const active = i === d.highlight;
        box(x, y, 3.95, 1.95, active ? c.primary : c.panel, c.primary);
        txt(cell.title, x + 0.2, y + 0.2, 3.55, 0.55, 14, active ? "#FFFFFF" : c.darkest, true);
        txt(cell.body, x + 0.2, y + 0.9, 3.55, 0.85, 12, active ? "#FFFFFF" : c.textSub);
      });
      txt("검토 기준: " + d.xAxis + " × " + d.yAxis, 0.42, 6.5, 8.15, 0.3, 11, c.muted);
      box(8.92, 2, 3.99, 4.1, c.tint);
      txt("이 프레임에서 볼 점", 9.17, 2.3, 3.49, 0.6, 15, c.darkest, true);
      txt(d.implication, 9.17, 3.2, 3.49, 2.2, 14, c.darkest);
      break;
    }
    case "c-timeline": {
      const d = dataSchemas["c-timeline"].parse(slide.data);
      nodes.push({ kind: "line", x: 1.02, y: 2.18, w: 0, h: (d.steps.length - 1) * 1.25, fill: c.connector, stroke: c.connector, strokeWidth: 2 });
      d.steps.forEach((step, i) => {
        const y = 2 + i * 1.25;
        nodes.push({ kind: "ellipse", x: 0.85, y, w: 0.35, h: 0.35, fill: i === d.steps.length - 1 ? c.darkest : c.primary });
        txt(step.label, 1.45, y, 1.5, 0.7, 13, c.primary, true);
        box(3.15, y - 0.06, 9.76, 1.08, i === d.steps.length - 1 ? c.tint : c.panel);
        txt(step.title, 3.42, y + 0.08, 9.2, 0.34, 14, c.darkest, true);
        txt(step.body, 3.42, y + 0.55, 9.2, 0.34, 12, c.textSub);
      });
      break;
    }
    case "m-cover": {
      const d = dataSchemas["m-cover"].parse(slide.data);
      placeholder(8, 0, 5.333, 7.5, d.image);
      coverTitle(d.product,.8,2.2,6.4,1.8,40,c.darkest);
      txt(d.tagline, 0.8, 4.5, 6.2, 1.1, 18, c.textSub);
      break;
    }
    case "m-big-message": {
      const d = dataSchemas["m-big-message"].parse(slide.data);
      txt(d.message, 0.8, 2, 11.73, 1.5, 36, c.darkest, true);
      txt(d.highlight, 0.8, 3.8, 11.73, 0.9, 36, c.primary, true);
      txt(d.sub, 0.8, 5.35, 11.73, 0.9, 16, c.muted);
      break;
    }
    case "m-image-copy": {
      const d = dataSchemas["m-image-copy"].parse(slide.data),
        left = d.imageSide === "left";
      const columns=equalTracks(.8,11.73,2,.6);
      placeholder(columns[left?0:1].start,1.9,columns[0].size,4.9,d.image);
      d.body.forEach((s, i) =>
        txt(s, columns[left?1:0].start, 2.3 + i * 1.2, columns[0].size, 1, 18, c.textSub, i === 0),
      );
      break;
    }
    case "m-big-number": {
      const d = dataSchemas["m-big-number"].parse(slide.data),
        w = 11.73 / d.stats.length;
      d.stats.forEach((s, i) => {
        txt(s.value, 0.8 + i * w, 2.5, w - 0.3, 1.4, 60, c.primary, true);
        txt(s.label, 0.8 + i * w, 4.3, w - 0.3, 1, 14, c.muted);
      });
      break;
    }
    case "m-feature-cards": {
      const d = dataSchemas["m-feature-cards"].parse(slide.data);
      d.features.forEach((s, i) => {
        const {start:x,size:w}=equalTracks(.8,11.73,d.features.length,.3)[i];
        box(x, 2, w, 4.3, c.panel);
        nodes.push({
          kind: "ellipse",
          x: x + 0.3,
          y: 2.4,
          w: 0.6,
          h: 0.6,
          fill: c.primary,
        });
        txt(s.icon, x + 0.35, 2.5, 0.5, 0.4, 18, "#FFFFFF", true, "center");
        txt(s.title, x + 0.3, 3.4, w-.6, 0.8, 16, c.darkest, true);
        txt(s.desc, x + 0.3, 4.55, w-.6, 1.1, 12, c.muted);
      });
      break;
    }
    case "m-quote-cta": {
      const d = dataSchemas["m-quote-cta"].parse(slide.data);
      txt("“" + d.quote + "”", 0.8, 2, 11.73, 1.6, 20, c.darkest, true);
      txt(d.person, 0.8, 3.85, 11, 0.5, 14, c.muted);
      box(0, 5.25, SLIDE.w, 2.25, c.primary);
      txt(d.cta, 0.8, 5.65, 11.73, 0.7, 24, "#FFFFFF", true);
      txt(d.contact, 0.8, 6.55, 11.73, 0.5, 14, c.onDarkSub);
      break;
    }
  }
  return { nodes:applyCanvasEdits(fitTextNodes(nodes,warnings),slide.canvasEdits), warnings: [...new Set(warnings)] };
}

