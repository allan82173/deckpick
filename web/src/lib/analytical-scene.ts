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
      const d = schemas[kind].parse(slide.data);
      const w = 10.29 / d.alternatives.length;
      cell("비교 기준", .42, 1.95, 2.2, .55, true);
      d.alternatives.forEach((a, i) => cell(a.name, 2.62 + i * w, 1.95, w, .55, true));
      const h = 3.5 / d.criteria.length;
      d.criteria.forEach((label, r) => {
        cell(label, .42, 2.5 + r * h, 2.2, h);
        d.alternatives.forEach((a, i) => cell(a.values[r], 2.62 + i * w, 2.5 + r * h, w, h));
      });
      conclusion(d.takeaway);
      break;
    }
    case "calendar": {
      const d = schemas.calendar.parse(slide.data), w = 10.29 / d.periods.length;
      cell("구분", .42, 1.95, 2.2, .55, true);
      d.periods.forEach((p, i) => cell(p, 2.62 + i * w, 1.95, w, .55, true));
      const h = 3.5 / d.events.length;
      d.events.forEach((event, r) => {
        cell(event.name, .42, 2.5 + r * h, 2.2, h);
        event.cells.forEach((value, i) => cell(value || "—", 2.62 + i * w, 2.5 + r * h, w, h));
      });
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
      const d = schemas[kind].parse(slide.data), w = 10.45 / d.periods.length;
      txt(d.assumption, .42, 1.78, 12.49, .38, 11, c.muted);
      d.periods.forEach((p, i) => cell(p, 2.46 + i * w, 2.28, w, .5, true));
      const h = 3.1 / d.rooms.length;
      d.rooms.forEach((room, i) => {
        const y = 2.85 + i * h;
        cell(room.name, .42, y, 1.94, h - .08);
        box(2.46, y, 10.45, h - .08, c.panel, c.tint);
        room.contracts.forEach(contract => cell(contract.label, 2.46 + contract.start * w, y, (contract.end - contract.start) * w, h - .08, !/미정|확인 필요/.test(contract.label)));
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
      const d = schemas[kind].parse(slide.data), widths = [1, 5.1, 6.39], xs = [.42, 1.42, 6.52];
      ["근거 ID", "주장", "판단 가능한 범위"].forEach((value, i) => cell(value, xs[i], 1.95, widths[i], .55, true));
      const h = 3.5 / d.rows.length;
      d.rows.forEach((v, r) => [v.id, v.claim, v.scope].forEach((value, i) => {
        const y = 2.5 + r * h;
        box(xs[i], y, widths[i], h, c.panel, c.tint);
        txt(value, xs[i] + .08, y + .035, widths[i] - .16, h - .05, 12, c.darkest);
      }));
      conclusion(d.takeaway);
      break;
    }
  }
  return true;
}
