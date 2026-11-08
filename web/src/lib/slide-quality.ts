import { GENERATION_CONFIG } from "./generation-config";
import { inspectSceneGeometry } from "./visual-quality";
import { expandedKind, expandedRegistry } from "./expanded-layouts";
import type { DeckInput, LayoutId, OutlineItem, SlideSpec } from "./model";
import { layoutIds } from "./model";
import type { Evidence } from "./evidence-model";
import { makeScene, wrap } from "./scene";
import { design } from "./design";
import type { Calculation, TaskAnalysis } from "./task-model";
import { applyCalculation } from "./scenario-calculation";

export const roleLayoutKinds = {
  "사실 제시": ["evidence-table", "comparison-table", "before-after", "trend"],
  "비교": ["comparison-table", "before-after", "quadrants", "positioning"],
  "흐름": ["journey", "cause-chain", "system-flow", "swimlane"],
  "우선순위": ["quadrants", "positioning", "comparison-table", "before-after"],
  "계산": ["formula-cards", "contract-bars", "comparison-table", "trend"],
  "일정": ["calendar", "contract-bars", "swimlane", "journey"],
  "판단": ["quadrants", "comparison-table", "positioning"],
  "근거": ["evidence-table", "comparison-table"],
  "마무리": ["argument-board", "comparison-table"],
  "합의 사항": ["evidence-table", "comparison-table", "quadrants", "before-after"],
} satisfies Record<NonNullable<OutlineItem["role"]>, string[]>;
export function roleLayouts(type: DeckInput["deckType"], role: NonNullable<OutlineItem["role"]>): LayoutId[] {
  const prefix = type === "consulting" ? "c-" : "m-";
  return layoutIds.filter(id => id.startsWith(prefix) && ((expandedKind(id) && expandedRegistry[expandedKind(id)!].roles.includes(role)) || id === prefix + "argument-board" || roleLayoutKinds[role].some(kind => id === prefix + kind)));
}
// Occupied text line height / available body text height. Thresholds deliberately
// vary by layout, since a calendar and a calculation card carry different densities.
const minimumByKind = GENERATION_CONFIG.visual.minimumFill;
export const MIN_BODY_FILL: Record<LayoutId, number> = Object.fromEntries(
  layoutIds.map(id => [id, minimumByKind[id.slice(2)] ?? GENERATION_CONFIG.visual.defaultMinimumFill]),
) as Record<LayoutId, number>;
export const MAX_QUALITY_RETRIES = GENERATION_CONFIG.qualityRetries;
export function isRendererWarning(warning:string){return /텍스트.*넘|한 줄 텍스트|텍스트끼리|라벨.*겹|본문 하단|본문 글자 크기|본문 채움|겹침|넘침|잘림|글꼴 대체|폰트|글자.*(?:작|크기)|여백.*(?:과도|크)/.test(warning);}
export function isPlanHeadline(text: string): boolean {
  return /(?:하겠습니다|해보겠습니다|보겠습니다|확인합니다|검토합니다|살핍니다|살펴봅니다|분석합니다|비교합니다|정리합니다|판단합니다|점검합니다|검증합니다|제안합니다|제시합니다)[.!。\s]*$/.test(text.replace(/\*\*/g, ""));
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}
export function inspectSlide(slide: SlideSpec, item: OutlineItem, input: DeckInput, evidence: Evidence[], previousLayouts: string[] = []):NonNullable<SlideSpec["quality"]> {
  const warnings: string[] = [];
  const exempt = item.index === 0 || ["표지", "목차", "출처"].includes(item.section) || item.role === "합의 사항";
  const compositionExempt = item.index === 0 || ["표지", "목차"].includes(item.section);
  const refs = (slide.evidenceRefs ?? []).filter(id => evidence.some(e => e.id === id));
  if (isPlanHeadline(slide.headline)) warnings.push("키메시지가 판단·질문 대신 계획형으로 끝납니다.");
  if (!exempt && !refs.length) warnings.push("근거표를 참조하지 않습니다.");
  if (item.role === "사실 제시" && !refs.length && !/\d/.test(JSON.stringify(slide.data))) warnings.push("사실 제시 장에 숫자·근거 참조가 모두 없습니다.");
  const body = strings(slide.data).filter(s => s.trim().length > 8);
  if (!compositionExempt && body.length && body.filter(s => /(?:확인합니다|살핍니다|검토합니다|조사합니다|비교합니다|확인 필요|추가 조사 필요)[.!\s]*$/.test(s)).length / body.length >= .6) warnings.push("본문 대부분이 할 일·확인 목록으로 구성돼 있습니다.");
  const scene = makeScene(slide, design(input.designSystemId, input.customPrimary), item.index + 1, input.topic);
  const textBoxes = scene.nodes.filter(n => n.kind === "text" && n.y >= 1.7 && n.y < 6.3 && n.h >= .35);
  let available = 0, occupied = 0;
  for (const node of textBoxes) {
    if (node.kind !== "text") continue;
    available += node.w * node.h;
    const lineHeight = node.size * node.lineHeight / 72;
    const textArea = wrap(node.text.replace(/\*\*/g, ""), node.size, node.w).reduce((area, line) => {
      const units = [...line].reduce((sum, char) => sum + (/[\u1100-\uFFFF]/.test(char) ? 1 : .55), 0);
      return area + Math.min(node.w, units * node.size / 72) * lineHeight;
    }, 0);
    occupied += Math.min(node.w * node.h, textArea);
  }
  const chartFloor = scene.nodes.some(n => n.kind === "image" && n.chart) ? .4 : 0;
  const fillRatio = chartFloor || (available ? Math.min(1, occupied / available) : 0);
  if (!compositionExempt && fillRatio < MIN_BODY_FILL[slide.layoutId]) warnings.push(`본문 채움 비율 ${Math.round(fillRatio * 100)}%가 기준 ${Math.round(MIN_BODY_FILL[slide.layoutId] * 100)}%보다 낮습니다.`);
  if (!compositionExempt && previousLayouts.at(-1) === slide.layoutId) warnings.push("같은 레이아웃이 앞 장과 반복됩니다. 다른 구성으로 바꿔 주세요.");
  if (slide.layoutId.endsWith("formula-cards") && Array.isArray(slide.data.cards) && slide.data.cards.every(card => card && typeof card === "object" && "result" in card && !/\d/.test(String(card.result)))) warnings.push("계산 결과에 산출된 숫자가 없습니다. 근거만으로 가능한 기본 계산 또는 명시한 가정의 계산 예시를 보여 주세요.");
  if (item.role === "계산" && /가정|단순화/.test(JSON.stringify(slide.data)) && /확정/.test(slide.headline + String(slide.data.takeaway ?? ""))) warnings.push("가정이 있는 계산을 확정값으로 표현하지 마세요. 제목·결론에도 계산 예시의 범위를 명시해 주세요.");
  if (item.role && !roleLayouts(input.deckType, item.role).includes(slide.layoutId) && !exempt) warnings.push("장의 역할과 레이아웃이 맞지 않습니다.");
  warnings.push(...scene.warnings,...inspectSceneGeometry(scene,compositionExempt));
  return { warnings: [...new Set(warnings)],rendererWarnings:[...new Set([...scene.warnings,...inspectSceneGeometry(scene,compositionExempt),...warnings.filter(isRendererWarning)])], fillRatio, attempts: 0 };
}
export function deckCountWarning(requested: number, actual: number): string[] {
  return Math.abs(requested - actual) > 2 ? [`요청 ${requested}장과 실제 ${actual}장이 2장 넘게 다릅니다.`] : [];
}
export function evidenceNotes(refs: string[], evidence: Evidence[]): string {
  return evidence.filter(e => refs.includes(e.id)).map(e => `[${e.id}] ${e.title}\n${e.url || "내부 자료 · 공개 URL 없음"}\n확인일 ${e.checkedAt}`).join("\n\n");
}

export function includeScenario(slide: SlideSpec, calculation?: Calculation | null): SlideSpec {
  return applyCalculation(slide, calculation);
}

export function textArtifacts(text: string, analysis?: TaskAnalysis): string[] {
  const warnings: string[] = [];
  if (/TODO|TBD|\[\s*\]|데이터\s*입력\s*후\s*산출|실제 계약 일정 입력 후 산출/i.test(text)) warnings.push("빈 양식이나 자리표시자가 남아 있습니다.");
  let visible = text;
  for (const term of analysis?.terminology ?? []) visible = visible.split(term.term).join("");
  if ((analysis?.language ?? "ko").startsWith("ko") && /[\u3040-\u30ff\u4e00-\u9fff]/.test(visible)) warnings.push("한국어 덱에 승인하지 않은 한자·가나가 섞여 있습니다.");
  return warnings;
}
