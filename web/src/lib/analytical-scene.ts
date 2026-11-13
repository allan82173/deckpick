import { analyticalKind, analyticalSchemas as schemas } from "./analytical-layouts";
import type { DesignSystem, SlideSpec } from "./model";
import { fitStack, textHeight, type SceneNode } from "./scene";

type Draw = {
  nodes: SceneNode[];
  box: (x: number, y: number, w: number, h: number, fill: string, stroke?: string) => unknown;
  txt: (text: string, x: number, y: number, w: number, h: number, size?: number, color?: string, bold?: boolean, align?: "left" | "center" | "right") => unknown;
  line?: (x: number, y: number, w: number, color: string, width?: number) => unknown;
};
export function drawAnalytical(slide: SlideSpec, c: DesignSystem["colors"], g: Draw): boolean {
  const kind = analyticalKind(slide.layoutId);
  if (!kind) return false;
  const { box, txt } = g;
  const cell = (text: string, x: number, y: number, w: number, h: number, heading = false) => {
    box(x, y, w, h, heading ? c.primary : c.panel, heading ? c.primary : c.tint);
    txt(text, x + .12, y + .12, w - .24, h - .21, 12, heading ? "#FFFFFF" : c.darkest, heading);
  };
  const conclusion = (text: string) => cell(text, .42, 6.3, 12.49, .55, true);
  switch (kind) {
    case "argument-board": {
      const d = schemas[kind].parse(slide.data);
      txt(d.insight, .42, 1.65, 12.49, .38, 12, c.primary, true);
      const w = (12.49 - .22 * (d.panels.length - 1)) / d.panels.length;
      d.panels.forEach((panel, i) => {
        const x = .42 + i * (w + .22);
        cell(panel.title, x, 2.1, w, .5, true);
        box(x, 2.6, w, 3.42, "#FFFFFF", c.tint);
        const h = 2.85 / panel.rows.length;
        const numeric = panel.rows.map(row => Number(row.value.replace(/[^0-9.\-]/g, "")));
        const maximum = Math.max(1, ...numeric.filter(Number.isFinite));
        const reserve = panel.assumption ? .42 : 0, rowH = (2.95 - reserve) / panel.rows.length, dSize = Math.min(...panel.rows.map(row => fitStack([row.detail], w - .28, rowH - .5, 14, 12)));
        panel.rows.forEach((row, index) => {
          const y = 2.72 + index * rowH;
          txt(row.label, x + .14, y, (w - .28) * .55, .3, 13, c.primary, true);
          txt(row.value, x + w * .57, y, w * .39, .3, panel.kind === "숫자" ? 18 : 13, c.primary, true, "right");
          if (panel.kind === "막대" && Number.isFinite(numeric[index])) box(x + .14, y + .34, Math.max(.03, (w - .28) * Math.max(0, numeric[index]) / maximum), .12, c.tint);
          txt(row.detail, x + .14, y + .44, w - .28, Math.max(.25, rowH - .5), dSize, c.darkest);
        });
        if (panel.assumption) { g.line?.(x + .14, 5.55, w - .28, c.tint, 1); txt(panel.assumption, x + .14, 5.62, w - .28, .34, 11, c.muted); }
      });
      conclusion(d.takeaway);
      break;
    }
    case "comparison-table": {
      // 대안 카드 비교: 기준은 가로 띠, 대안은 세로 카드(머리에 A·B·C 표식). 칸 글자는 하나의 크기로 가운데 정렬한다.
      const d = schemas[kind].parse(slide.data), lw = 2.0, gap = .2, n = d.alternatives.length, w = (12.49 - lw - gap * n) / n, top = 1.95, hh = .72, rh = (6.12 - top - hh - .1) / d.criteria.length, cw = w - .3;
      const size = Math.min(...d.alternatives.flatMap(a => a.values.map(v => fitStack([v], cw, rh - .26, 15, 12))));
      d.criteria.forEach((label, r) => {
        const y = top + hh + .1 + r * rh;
        box(.42, y, 12.49, rh, r % 2 ? "#FFFFFF" : c.panel);
        g.nodes.push({ kind: "rect", x: .42, y: y + .14, w: .06, h: rh - .28, fill: c.primary });
        const lh = textHeight(label, 13, lw - .3);
        txt(label, .6, y + (rh - lh) / 2, lw - .3, lh + .04, 13, c.primary, true);
      });
      d.alternatives.forEach((a, i) => {
        const x = .42 + lw + gap + i * (w + gap);
        box(x, top, w, hh, c.primary);
        g.nodes.push({ kind: "ellipse", x: x + .14, y: top + .16, w: .4, h: .4, fill: c.tint });
        txt(String.fromCharCode(65 + i), x + .14, top + .23, .4, .28, 13, c.primary, true, "center");
        txt(a.name, x + .64, top + .2, w - .78, .32, 14, "#FFFFFF", true);
        a.values.forEach((v, r) => {
          const y = top + hh + .1 + r * rh, th = textHeight(v, size, cw);
          box(x, y + .08, w, rh - .16, "#FFFFFF", c.connector);
          txt(v, x + .15, y + (rh - th) / 2, cw, th + .04, size, c.darkest, false, "center");
        });
      });
      conclusion(d.takeaway);
      break;
    }
    case "calendar": {
      // 달력 표 대신 기간 축 위의 막대로 그린다. 같은 내용이 이어지는 칸은 한 막대로 합치고, 빈 칸('—')은 비워 둔다. 검증 전·가정 일정은 연한 막대.
      const d = schemas.calendar.parse(slide.data), lw = 2.0, left = .42 + lw + .1, gw = 12.91 - left, w = gw / d.periods.length, top = 1.95, rh = (5.9 - top - .45) / d.events.length;
      d.periods.forEach((p, i) => { txt(p, left + i * w, top, w, .3, 13, c.primary, true, "center"); g.nodes.push({ kind: "line", x: left + i * w, y: top + .38, w: 0, h: 5.9 - top - .38, fill: c.tint, stroke: c.tint, strokeWidth: 1 }); });
      g.line?.(left, top + .38, gw, c.primary, 1.5);
      const tentative = (v: string) => /검증|예시|가정|미정|확인|예정|후보/.test(v);
      d.events.forEach((event, r) => {
        const y = top + .45 + r * rh, mid = y + rh / 2;
        const lh = textHeight(event.name, 13, lw - .2);
        txt(event.name, .42, mid - lh / 2, lw - .2, lh + .04, 13, c.darkest, true);
        g.line?.(left, mid, gw, c.connector, 1);
        const blank = (v: string) => !v.trim() || /^[—–-]+$/.test(v.trim());
        for (let i = 0; i < event.cells.length;) {
          const v = event.cells[i]; if (blank(v)) { i++; continue; }
          let j = i + 1; while (j < event.cells.length && event.cells[j] === v) j++;
          const x = left + i * w + .06, bw = (j - i) * w - .12, bh = Math.min(.62, rh - .2), soft = tentative(v);
          box(x, mid - bh / 2, bw, bh, soft ? c.tint : c.primary, soft ? c.primary : undefined);
          const size = fitStack([v], bw - .2, bh - .08, 13, 11), th = textHeight(v, size, bw - .2);
          txt(v, x + .1, mid - th / 2, bw - .2, th + .03, size, soft ? c.primary : "#FFFFFF", true, "center");
          i = j;
        }
      });
      box(left, 5.95, .3, .16, c.primary); txt("확정 일정", left + .38, 5.92, 1.2, .24, 11, c.muted);
      box(left + 1.6, 5.95, .3, .16, c.tint, c.primary); txt("검증 전·가정", left + 1.98, 5.92, 1.5, .24, 11, c.muted);
      conclusion(d.takeaway);
      break;
    }
    case "quadrants": {
      const d = schemas.quadrants.parse(slide.data);
      txt(d.yAxis, .42, 1.7, 12.49, .3, 12, c.primary, true);
      // 사분면 칸 높이를 축 라벨 위까지 채우고, 본문은 칸을 채우는 크기로 가운데 둔다.
      const qh = 1.62, size = Math.min(...d.cells.map(v => fitStack([v.body], 5.9, qh - .62, 17, 12)));
      d.cells.forEach((v, i) => {
        const x = .42 + (i % 2) * 6.35, y = 2.08 + Math.floor(i / 2) * (qh + .12);
        cell(v.title, x, y, 6.14, .46, true);
        box(x, y + .46, 6.14, qh - .46, c.panel, c.tint);
        const th = textHeight(v.body, size, 5.9);
        txt(v.body, x + .12, y + .46 + (qh - .46 - th) / 2, 5.9, th + .04, size, c.darkest);
      });
      txt(d.xAxis, .42, 5.69, 12.49, .35, 12, c.primary, true, "center");
      conclusion(d.takeaway);
      break;
    }
    case "contract-bars": {
      // 굵은 칸 대신 타임라인처럼 가는 막대로 계약 기간을 그리고, 막대 위에 라벨, 빈 구간에는 '공실' 표시를 둔다.
      const d = schemas[kind].parse(slide.data), lw = 1.94, left = .42 + lw + .1, gw = 12.91 - left, w = gw / d.periods.length, top = 2.25, rh = (6.0 - top - .45) / d.rooms.length;
      txt(d.assumption, .42, 1.78, 12.49, .34, 12, c.muted);
      d.periods.forEach((p, i) => { txt(p, left + i * w, top, w, .3, 12, c.primary, true, "center"); g.nodes.push({ kind: "line", x: left + i * w, y: top + .38, w: 0, h: 6.0 - top - .38, fill: c.tint, stroke: c.tint, strokeWidth: 1 }); });
      g.line?.(left, top + .38, gw, c.primary, 1.5);
      d.rooms.forEach((room, r) => {
        const y = top + .45 + r * rh, mid = y + rh * .62;
        txt(room.name, .42, mid - .17, lw - .1, .3, 13, c.darkest, true);
        g.line?.(left, mid, gw, c.connector, 1);
        let cursor = 0;
        const vacancy = (from: number, to: number) => { if (to > from) txt(`공실 ${to - from}`, left + from * w, mid - .32, (to - from) * w, .24, 11, c.muted, false, "center"); };
        room.contracts.forEach(contract => {
          vacancy(cursor, contract.start);
          const x = left + contract.start * w + .04, bw = (contract.end - contract.start) * w - .08, soft = /미정|확인 필요/.test(contract.label);
          box(x, mid - .09, bw, .18, soft ? c.tint : c.primary, soft ? c.primary : undefined);
          g.nodes.push({ kind: "ellipse", x: x - .05, y: mid - .07, w: .14, h: .14, fill: soft ? c.primary : c.darkest });
          txt(contract.label, x, mid - .38, bw, .26, 12, c.primary, true);
          cursor = contract.end;
        });
        vacancy(cursor, d.periods.length);
      });
      conclusion(d.takeaway);
      break;
    }
    case "formula-cards": {
      const d = schemas[kind].parse(slide.data), w = (12.49 - .22 * (d.cards.length - 1)) / d.cards.length;
      d.cards.forEach((v, i) => {
        const x = .42 + i * (w + .22);
        cell(v.title, x, 1.95, w, .55, true);
        box(x, 2.5, w, 3.45, "#FFFFFF", c.primary);
        txt(v.assumption, x + .2, 2.7, w - .4, .7, 12);
        txt(v.formula, x + .2, 3.55, w - .4, .65, 14, c.primary, true);
        const resultSize = /\d/.test(v.result) && v.result.length < 18 ? 28 : 16;
        txt(v.result, x + .2, 4.35, w - .4, .7, resultSize, c.primary, true);
        txt(v.interpretation, x + .2, 5.28, w - .4, .5, 11, c.muted);
      });
      conclusion(d.takeaway);
      break;
    }
    case "evidence-table": {
      const legacyData = schemas[kind].parse(slide.data);
      // Preserve the 49-layout baseline and existing user edit coordinates. The
      // new geometry only handles dense, unedited cards with the observed fault.
      if (legacyData.rows.length < 5 || Object.keys(slide.canvasEdits ?? {}).length) {
        const d = legacyData, cols = d.rows.length >= 4 ? 2 : 1, rowsN = Math.ceil(d.rows.length / cols), gap = .2, cw = (12.49 - gap * (cols - 1)) / cols, top = 1.95, ch = (6.12 - top - gap * (rowsN - 1)) / rowsN, tw = cw - 1.15;
        const cSize = Math.min(...d.rows.map(v => fitStack([v.claim], tw, ch * .45, 16, 12))), sSize = Math.min(...d.rows.map(v => fitStack([v.scope], tw - .2, ch * .38 - .1, 13, 11)));
        d.rows.forEach((v, i) => {
          const x = .42 + (i % cols) * (cw + gap), y = top + Math.floor(i / cols) * (ch + gap);
          box(x, y, cw, ch, c.panel, c.tint);
          box(x, y, .82, ch, c.darkest);
          txt(v.id, x + .05, y + ch / 2 - .17, .72, .32, 14, "#FFFFFF", true, "center");
          const clh = textHeight(v.claim, cSize, tw);
          txt(v.claim, x + 1.0, y + .14, tw, clh + .04, cSize, c.darkest, true);
          const sy = y + ch - ch * .38 - .1;
          box(x + 1.0, sy, tw, ch * .38, "#FFFFFF", c.tint);
          txt("판단 범위", x + 1.1, sy + .06, 1.2, .22, 10, c.primary, true);
          txt(v.scope, x + 1.1, sy + .28, tw - .2, ch * .38 - .32, sSize, c.primary);
        });
        conclusion(d.takeaway);
        break;
      }
      // Dense six-row evidence cards need two tall rows. Reserve shared space for
      // BOTH claim and scope before drawing; a later scope box must never hide text.
      const d = schemas[kind].parse(slide.data), cols = d.rows.length >= 5 ? 3 : d.rows.length >= 4 ? 2 : 1, rowsN = Math.ceil(d.rows.length / cols), gap = .2, cw = (12.49 - gap * (cols - 1)) / cols, top = 1.95, ch = (6.12 - top - gap * (rowsN - 1)) / rowsN, tw = cw - .32;
      const bodySize = Math.min(...d.rows.map(v => fitStack([v.claim, v.scope], tw, ch - .64, 14, 12, .16)));
      d.rows.forEach((v, i) => {
        const x = .42 + (i % cols) * (cw + gap), y = top + Math.floor(i / cols) * (ch + gap);
        box(x, y, cw, ch, c.panel, c.tint);
        txt(v.id.replace(/\s+/g, " ").trim(), x + .16, y + .12, tw, .28, 12, c.primary, true);
        const claimY = y + .48, clh = textHeight(v.claim, bodySize, tw);
        txt(v.claim, x + .16, claimY, tw, clh + .02, bodySize, c.darkest, true);
        const scopeY = claimY + clh + .16;
        txt(v.scope, x + .16, scopeY, tw, Math.max(.01, y + ch - .12 - scopeY), bodySize, c.primary);
      });
      conclusion(d.takeaway);
      break;
    }
  }
  return true;
}
