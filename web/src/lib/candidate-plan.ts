import { GENERATION_CONFIG } from "./generation-config";
import { expandedIds, expandedRegistry, expandedKind, type ExpandedId } from "./expanded-layouts";
import { layoutIds, type DeckInput, type LayoutId, type OutlineItem, type SlideSpec, type Deck } from "./model";
import { visualIds, visualNames, type VisualKind } from "./visual-model";
import { analyticalIds, analyticalNames, type AnalyticalKind } from "./analytical-layouts";
import { roleLayouts } from "./slide-quality";
const families: Record<LayoutId, string> = {
  ...Object.fromEntries(expandedIds.map(id => [id, id.slice(2)])) as Record<ExpandedId, string>,
  ...Object.fromEntries(analyticalIds.map(id => [id, id.slice(2)])) as Record<typeof analyticalIds[number], string>,
  ...Object.fromEntries(visualIds.map(id=>[id,id.slice(2)])) as Record<typeof visualIds[number],string>,
  "c-cover": "cover", "c-toc": "agenda", "c-header-boxes": "parallel", "c-funnel": "flow", "c-arrow-flow": "flow",
  "c-metric-cards": "metrics", "c-compare": "comparison", "c-conclusion": "summary", "c-split-insight": "insight", "c-matrix": "matrix", "c-timeline": "timeline",
  "m-cover": "cover", "m-big-message": "copy", "m-image-copy": "image", "m-big-number": "metrics", "m-feature-cards": "parallel", "m-quote-cta": "quote",
};
export const layoutPurpose: Record<LayoutId, string> = {
  ...Object.fromEntries(expandedIds.map(id => [id, expandedRegistry[expandedKind(id)!].use])) as Record<ExpandedId, string>,
  ...Object.fromEntries(analyticalIds.map(id => [id, analyticalNames[id.slice(2) as AnalyticalKind]])) as Record<typeof analyticalIds[number], string>,
  ...Object.fromEntries(visualIds.map(id=>[id,visualNames[id.slice(2) as VisualKind]+" · 근거와 관계를 구분해 표현"])) as Record<typeof visualIds[number],string>,
  "c-cover": "주제와 발표 약속", "c-toc": "섹션별 목차", "c-header-boxes": "같은 기준의 항목을 병렬로 검토", "c-funnel": "현상에서 원인과 과제로 좁히기", "c-arrow-flow": "과정과 인과의 흐름",
  "c-metric-cards": "기준이 명시된 지표·측정 계획", "c-compare": "공통 기준으로 대안 비교", "c-conclusion": "추천과 다음 행동 요약", "c-split-insight": "핵심 통찰 한 가지와 근거 분리", "c-matrix": "두 기준의 정성적 2×2 프레임", "c-timeline": "단계별 실행 로드맵",
  "m-cover": "브랜드와 제안", "m-big-message": "하나의 큰 카피", "m-image-copy": "사용 장면과 카피", "m-big-number": "검증된 핵심 수치", "m-feature-cards": "가치와 특징 비교", "m-quote-cta": "메시지와 행동 제안",
};
/** 사람 평가에서 장표 품질이 낮았던 레이아웃은 자동 후보에서 제외한다(직접 선택은 허용). */
const autoAllowed = (id: string) => !GENERATION_CONFIG.layouts.autoExcludedKinds.some(kind => id.endsWith("-" + kind));
/** 포지셔닝 맵은 경쟁 구도·위치 비교가 장의 핵심일 때만 자동 후보가 된다(컨셉·우선순위·판단 장 남용 방지). */
export const positioningFits = (item: OutlineItem) => (item.argument?.preferredLayouts ?? []).some(id => id.endsWith("-positioning")) || /포지셔닝|경쟁.{0,6}(위치|구도|지형)|지각도|시장.?지도/.test(`${item.section} ${item.message} ${item.contentHint}`);
export function candidatePlan(input: DeckInput, item: OutlineItem, excluded: string[] = [], rotation = 0, count = 3, requested?:LayoutId): LayoutId[] {
  if (requested && item.role && !roleLayouts(input.deckType, item.role).includes(requested)) throw Error("이 장의 역할에 맞는 레이아웃을 선택해 주세요.");
  if(requested){if(count!==1||item.index===0||requested.endsWith("cover")||requested==="c-toc"||!requested.startsWith(input.deckType==="consulting"?"c-":"m-")||excluded.includes(requested))throw Error("현재 장표에 사용할 수 없는 구성입니다. 다른 후보에 없는 본문 구성을 골라 주세요.");return [requested];}
  if (item.index === 0) return Array(count).fill(input.deckType === "consulting" ? "c-cover" : "m-cover") as LayoutId[];
  if (item.section === "출처" && count === 1 && !excluded.includes(input.deckType === "consulting" ? "c-evidence-table" : "m-evidence-table")) return [input.deckType === "consulting" ? "c-evidence-table" : "m-evidence-table"];
  if(item.role){
    const rolePool=roleLayouts(input.deckType,item.role).filter(id=>!excluded.includes(id)&&autoAllowed(id)&&(!id.endsWith("-positioning")||positioningFits(item)));
    const preferred=(item.argument?.preferredLayouts??[]).filter((id):id is LayoutId=>rolePool.includes(id as LayoutId));
    const rest=rolePool.filter(id=>!preferred.includes(id));
    const shift=rest.length?rotation%rest.length:0;
    const ordered=[...new Set([...preferred,...rest.slice(shift),...rest.slice(0,shift)])];
    const selected=ordered.slice(0,Math.min(count,GENERATION_CONFIG.candidates.maximum));
    if(!selected.length)throw Error("이 장의 역할에 맞는 추가 후보가 없습니다.");
    return selected;
  }
  const semantic = /일정|실행|계획|로드맵|대안|해결|솔루션|전략|원인|가설|구조|성과|효과|측정|수치|통계|현황|문제|한계|리스크|특징|비교|기능/.test(item.section) ? item.section : `${item.message} ${item.contentHint}`;
  let preferred: LayoutId[];
  const content=`${item.message} ${item.contentHint}`;
  const prefix=input.deckType==="consulting"?"c":"m";
  const visual=(...kinds:VisualKind[])=>kinds.map(k=>`${prefix}-${k}` as LayoutId);
  if(item.section!=="목차"&&/고객.?여정|접점|이탈|구매.?과정/.test(content))preferred=visual("journey","cause-chain","before-after");
  else if(item.section!=="목차"&&/데이터.?연결|시스템.?구조|데이터.?레이어|입력.*출력|온톨로지/.test(content))preferred=visual("system-flow","system-compare","swimlane");
  else if(item.section!=="목차"&&/포지셔닝|경쟁.*위치|축.*비교/.test(content))preferred=visual("positioning","before-after","cause-tree");
  else if(item.section!=="목차"&&/담당.*역할|역할별|업무.?흐름|처리.?과정/.test(content))preferred=visual("swimlane","system-flow","before-after");
  else if(item.section!=="목차"&&/원인.*가설|인과|정보.?단절|왜.*발생/.test(content))preferred=visual("cause-tree","cause-chain","before-after");
  else if(item.section!=="목차"&&/추세|연도별|기간별|월별/.test(content))preferred=visual("trend","before-after","journey");
  else if (input.deckType === "marketing") {
    preferred = /성과|측정|수치|통계/.test(semantic) ? ["m-big-number", "m-image-copy", "m-big-message"] : /특징|비교|기능/.test(semantic) ? ["m-feature-cards", "m-big-message", "m-image-copy"] : ["m-big-message", "m-image-copy", "m-feature-cards"];
  } else if (item.section === "목차") preferred = ["c-toc", "c-arrow-flow", "c-header-boxes"];
  else if (/결론|정리|제언/.test(item.section)) preferred = ["c-conclusion", "c-split-insight", "c-timeline"];
  else if (/일정|실행|계획|로드맵/.test(semantic)) preferred = ["c-timeline", "c-compare", "c-header-boxes"];
  else if (/대안|해결|솔루션|전략/.test(semantic)) preferred = ["c-compare", "c-matrix", "c-split-insight"];
  else if (/원인|가설|구조/.test(semantic)) preferred = ["c-funnel", "c-matrix", "c-header-boxes"];
  else if (/성과|효과|측정|수치|통계|현황/.test(semantic)) preferred = ["c-metric-cards", "c-split-insight", "c-compare"];
  else if (/문제|한계|리스크/.test(semantic)) preferred = ["c-split-insight", "c-funnel", "c-compare"];
  else preferred = ["c-header-boxes", "c-matrix", "c-timeline"];
  const rolePool = item.role ? roleLayouts(input.deckType, item.role) : [];
  const rolePreference = item.role === "계산" ? "formula-cards"
    : item.role === "일정" ? "calendar"
    : item.role === "비교" ? "comparison-table" : undefined;
  const contentPreferences = (item.argument?.preferredLayouts ?? []).filter((id): id is LayoutId => rolePool.includes(id as LayoutId));
  const preferredStage = ["판단", "우선순위", "근거", "합의 사항", "마무리"].includes(item.role ?? "") ? 1 : item.role === "계산" ? 2 : item.role === "일정" ? 3 : 0;
  const score = (id: LayoutId) => { const k=expandedKind(id); return k && expandedRegistry[k].stage === preferredStage ? 2 : Number(id === `${prefix}-${rolePreference}`); };
  const orderedRoles = [...rolePool].sort((a,b)=>score(b)-score(a));
  const pool = (item.role ? [...new Set([...contentPreferences, ...orderedRoles])] : [...new Set([...preferred, ...layoutIds.filter((id) => id.startsWith(input.deckType === "consulting" ? "c-" : "m-") && !id.endsWith("cover") && (id !== "c-toc" || item.section === "목차"))])]).filter(autoAllowed);
  const shift = rotation % pool.length;
  const excludedFamilies = new Set(excluded.map((id) => families[id as LayoutId]));
  const ordered = [...pool.slice(shift), ...pool.slice(0, shift)].filter((id) => !excluded.includes(id) && (count !== 1 || !excludedFamilies.has(families[id])));
  const result: LayoutId[] = [];
  for (const id of ordered) if (!result.some((r) => families[r] === families[id])) { result.push(id); if (result.length === count) break; }
  if (result.length !== count) throw Error("새 후보에 사용할 구성이 부족합니다. 전체 후보를 다시 만들어 주세요.");
  return result;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value) return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return typeof value === "string" ? value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim() : value;
}
export function candidateSignature(slide: SlideSpec) {
  const serialized = JSON.stringify(canonical({ layoutId: slide.layoutId, headline: slide.headline, data: slide.data }));
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) hash = Math.imul(hash ^ serialized.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
// Replace exactly one slot. Retain other cards and a concurrently selected/edited card.
export function replaceCandidate(deck: Deck, index: number, slot: number, candidate: SlideSpec): Deck {
  const previous = deck.candidates[index];
  if (!previous || !previous[slot]) throw Error("교체할 후보를 찾지 못했습니다.");
  if (previous.some((p) => candidateSignature(p) === candidateSignature(candidate))) throw Error("이전과 같은 후보입니다. 다른 구성을 요청해 주세요.");
  if (!candidate.layoutId.endsWith("cover") && previous.some((p) => p.layoutId === candidate.layoutId)) throw Error("방금 버린 후보 또는 남겨둔 후보와 다른 구성이 필요합니다.");
  const next = previous.map((p, i) => i === slot ? candidate : p);
  const picked = { ...deck.picked }, edited = { ...deck.edited };
  if (picked[index] === slot) { delete picked[index]; delete edited[index]; }
  return { ...deck, candidates: { ...deck.candidates, [index]: next }, picked, edited };
}

/** 장별 첫 후보 레이아웃 계획. 바로 앞 장과 같은 구성이 연속되지 않도록 역할에 맞는 다른 후보를 먼저 고른다. */
export function plannedFirstLayouts(input: DeckInput, outline: OutlineItem[]): LayoutId[] {
  const chosen: LayoutId[] = [];
  for (const item of outline) {
    let plan: LayoutId[] = [];
    try { plan = candidatePlan(input, item); } catch { plan = []; }
    const first = item.index > 0 ? avoidDeckRepeats(plan, chosen, widerPool(input, item), true, outline.length)[0] : undefined;
    chosen.push(first ?? plan[0]);
  }
  return chosen;
}

/* 덱 전체 레이아웃 규칙(2026-11-09, 현대차 협력업체 최종 덱 평가 기반)
   R1 같은 레이아웃은 덱당 최대 2회, 다시 쓰려면 4장 이상 간격
   R2 카드형 계열은 합쳐서 5장당 1회(최소 2회) 이하, 연속 금지
   R3 Executive Summary는 앞쪽(3장 이내)에만, 벤치마킹 카드·포지셔닝 맵은 1회
   R5 아직 쓰지 않은 레이아웃을 먼저 골라 서로 다른 구성 수를 늘린다 */
export const DECK_LAYOUT_MAX_USES = 2;
export const DECK_LAYOUT_MIN_GAP = 4;
const FREE_FAMILIES = new Set(["cover", "agenda", "evidence-table", "section-divider"]);
const CARD_FAMILIES = new Set(["parallel", "comparison", "argument-board", "system-compare", "judgment-reversal", "benchmark-cards", "persona-cards", "interview-quotes"]);
const ONCE_FAMILIES = new Set(["executive-summary", "benchmark-cards", "positioning"]);
export const layoutFamily = (id: string) => families[id as LayoutId] ?? id.slice(2);
export const isCardFamily = (id: string) => CARD_FAMILIES.has(layoutFamily(id));
export const cardFamilyLimit = (deckSize: number) => Math.max(2, Math.ceil(deckSize / 5));
/** previous는 앞 장들의 레이아웃(0번부터 순서대로). 이 레이아웃을 다음 장에 쓰면 어기는 규칙을 반환한다. */
export function deckLayoutIssue(id: string, previous: string[], deckSize: number): string | null {
  const family = layoutFamily(id);
  if (!id || FREE_FAMILIES.has(family)) return null;
  const index = previous.length;
  if (family === "executive-summary" && index > 2) return "Executive Summary는 앞쪽 요약 장에만 씁니다.";
  const uses = previous.filter(value => value === id).length;
  if (ONCE_FAMILIES.has(family) && uses >= 1) return "이 구성은 덱에서 한 번만 씁니다.";
  if (uses >= DECK_LAYOUT_MAX_USES) return `같은 레이아웃은 덱당 ${DECK_LAYOUT_MAX_USES}회까지 씁니다.`;
  const last = previous.lastIndexOf(id);
  if (last >= 0 && index - last < DECK_LAYOUT_MIN_GAP) return `같은 레이아웃은 ${DECK_LAYOUT_MIN_GAP}장 이상 간격을 둡니다.`;
  if (isCardFamily(id)) {
    if (previous.length && isCardFamily(previous.at(-1)!)) return "카드형 구성이 연속됩니다.";
    if (previous.filter(isCardFamily).length >= cardFamilyLimit(deckSize)) return "카드형 구성이 덱에서 너무 많습니다.";
  }
  return null;
}
/** 역할에 맞는 자동 사용 가능 레이아웃 전체. 덱 규칙 때문에 첫 계획을 못 쓸 때 대안으로 쓴다. */
export function widerPool(input: DeckInput, item: OutlineItem): LayoutId[] {
  if (!item.role || item.index === 0) return [];
  return (roleLayouts(input.deckType, item.role) ?? []).filter(id => autoAllowed(id) && (!id.endsWith("-positioning") || positioningFits(item)));
}
/** 덱 규칙을 지키고 아직 쓰지 않은 레이아웃을 앞에 둔다. 지킬 수 있는 후보가 없으면 바로 앞 장 중복만 피한다. */
export function avoidDeckRepeats(plan: LayoutId[], previous: string[], wider: LayoutId[], single: boolean, deckSize: number): LayoutId[] {
  if (!plan.length || plan[0].endsWith("cover")) return plan;
  const pool = [...new Set([...plan, ...wider])];
  const allowed = pool.filter(id => !deckLayoutIssue(id, previous, deckSize));
  if (!allowed.length) return avoidPreviousLayout(plan, previous.at(-1), wider, single);
  const used = new Set(previous);
  const ordered = [...allowed.filter(id => !used.has(id)), ...allowed.filter(id => used.has(id))];
  if (single) return [ordered[0]];
  const result: LayoutId[] = [];
  for (const id of [...ordered, ...plan]) if (!result.includes(id) && !result.some(r => families[r] === families[id])) { result.push(id); if (result.length === plan.length) break; }
  return result;
}
/** 앞 장과 같은 레이아웃이 첫 후보가 되지 않게 순서를 바꾼다. 다른 후보가 없으면 그대로 둔다. */
export function avoidPreviousLayout(plan: LayoutId[], previous: string | undefined, wider: LayoutId[], single: boolean): LayoutId[] {
  if (!previous || plan[0] !== previous || previous.endsWith("cover")) return plan;
  const alternative = [...plan, ...wider].find(id => id !== previous);
  if (!alternative) return plan;
  return single ? [alternative] : [...new Set([alternative, ...plan.filter(id => id !== previous && id !== alternative), previous])].slice(0, plan.length);
}
