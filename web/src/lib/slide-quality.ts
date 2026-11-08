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
/** 유보형 키메시지(판단 보류) — 덱당 상한을 넘으면 잠정 판단 형태로 고친다. */
export const HEDGE_HEADLINE_LIMIT = 2;
export function isHedgeHeadline(text: string): boolean {
  const plain = text.replace(/\*\*/g, "");
  return /(?:판단|판정|단정|진단|확정|설명|입증|결론|평가|우열)(?:을|를|은|는|이|가|까지는?)?\s*(?:내리기|짓기|하기)?\s*(?:어렵|할 수 없|하지\s*(?:않|못)|되지\s*않|내릴 수 없|지을 수 없|짓지\s*못)|확인되지 않|확인할 수 없|알 수 없|불분명|미확인|근거가 부족|자료가 부족|(?:조사|확인|검증|비교|분석)(?:이|가)?\s*(?:더\s*)?필요|(?:검증|확인)해야|검증 가설|검증할 가설|아직\s*(?:판정|판단|확인|검증|입증)|아직\s.{0,20}가설/.test(plain);
}
/** 결론 요약 장이 실제 선택·우선순위 대신 판단 보류나 발표 성격만 말하는지. */
export function isWeakSummaryHeadline(text: string): boolean {
  const plain = text.replace(/\*\*/g, "");
  return isHedgeHeadline(plain) || /(?:이번|본|오늘)\s*(?:중간\s*|최종\s*)?발표(?:는|에서는|의 초점은)|발표 범위|(?:우선하고|가설로)\s.*다룹니다[.\s]*$|(?:결론|목표|목적)은\s.*(?:아니라|진단|구분)|(?:현황|근거)\s*(?:수준을\s*)?(?:진단|정리|구분)(?:이다|입니다|한다|합니다)?[.\s]*$/.test(plain);
}
/** 상한을 넘는 유보형 장의 인덱스. 한계·다음 단계가 놓이는 뒤쪽 장을 남기고 앞쪽부터 고친다. */
export function excessHedgeIndices(pages: { index: number; text: string }[], limit = HEDGE_HEADLINE_LIMIT): number[] {
  const hedges = pages.filter(page => isHedgeHeadline(page.text)).map(page => page.index).sort((a, b) => a - b);
  return hedges.slice(0, Math.max(0, hedges.length - limit));
}
/** 컨설팅 덱(6장 이상)은 표지·목차 다음 첫 본문 장을 결론 요약(판단·우선순위)으로 둔다. */
export const ANSWER_FIRST_ROLES = ["판단", "우선순위"] as const;
export function answerFirstIndex(outline: { section?: string }[]): number {
  return outline[1]?.section === "목차" ? 2 : 1;
}
export function answerFirstError(type: DeckInput["deckType"], outline: { section?: string; role?: string | null }[]): string | null {
  if (type !== "consulting" || outline.length < 6) return null;
  const index = answerFirstIndex(outline), role = outline[index]?.role;
  return role && (ANSWER_FIRST_ROLES as readonly string[]).includes(role) ? null : `${index + 1}장(표지·목차 다음 첫 본문)은 덱 전체 결론 요약으로 두고 role을 판단 또는 우선순위로 지정해 주세요.`;
}
export function isPlanHeadline(text: string): boolean {
  return /(?:하겠습니다|해보겠습니다|보겠습니다|확인합니다|검토합니다|살핍니다|살펴봅니다|분석합니다|비교합니다|정리합니다|판단합니다|점검합니다|검증합니다|제안합니다|제시합니다)[.!。\s]*$/.test(text.replace(/\*\*/g, ""));
}
/** 원문 대조·검수 상태는 발표 화면이 아니라 노트·근거표에 둔다. */
export const QA_STATUS_PATTERN = /원문\s*[·ㆍ]?\s*(?:페이지\s*)?(?:미확인|확인\s*전)|페이지\s*확인\s*전|제공된 자료 요약 수치|검수\s*전|부합\s*출처|(?:출처|근거)\s*개수|(?:출처|근거)\s*\d+\s*(?:건|개)/;
export function visibleQaStatus(data: unknown): string[] {
  return strings(data).filter(text => QA_STATUS_PATTERN.test(text));
}
/** 차트 수치가 모두 0이면 "확인 안 됨"을 0으로 그린 것이므로 차트로 쓰지 않는다. */
export function allZeroChart(data: unknown): boolean {
  const numbers: number[] = [];
  const walk = (value: unknown, key = "") => {
    if (Array.isArray(value)) { if (/^(values|points|data)$/i.test(key) || value.every(item => typeof item === "number")) value.forEach(item => typeof item === "number" ? numbers.push(item) : walk(item, key)); else value.forEach(item => walk(item, key)); return; }
    if (value && typeof value === "object") { for (const [k, v] of Object.entries(value)) { if (typeof v === "number" && /^(value|values|percent|y)$/i.test(k)) numbers.push(v); else walk(v, k); } }
  };
  walk(data);
  // 모두 0이거나 해당 여부만 0/1로 표시한 차트는 수치 차트가 아니다.
  return numbers.length >= 2 && (numbers.every(value => value === 0) || (numbers.length >= 3 && numbers.every(value => value === 0 || value === 1)));
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
  if (visibleQaStatus(slide.data).length) warnings.push("본문에 원문 확인·검수 상태나 출처 개수 문구가 있습니다. 검수 상태는 노트로 옮기고 화면에는 내용과 기준 연도만 남기세요.");
  if (allZeroChart(slide.data)) warnings.push("차트 수치가 모두 0이거나 0/1 표시뿐입니다. 확인되지 않은 항목은 차트 대신 가설·검증 계획으로 보여 주세요.");
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
