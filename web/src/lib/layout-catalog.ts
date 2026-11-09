import { analyticalKind } from "./analytical-layouts";
import { expandedKind, expandedRegistry, expandedKinds } from "./expanded-layouts";
import { GENERATION_CONFIG } from "./generation-config";
import { layoutIds, type LayoutId, type DeckInput } from "./model";
import { visualKind } from "./visual-model";
export const layoutGroups = ["고객 여정", "인과관계", "비교", "시스템 구조", "실행 과정", "변화·성과"] as const;
export type LayoutGroup = typeof layoutGroups[number];
export function layoutGroup(id:LayoutId):LayoutGroup {
  const e=expandedKind(id); if(e){const roles=expandedRegistry[e].roles;if(roles.includes("일정"))return "실행 과정";if(roles.includes("흐름"))return "시스템 구조";if(roles.includes("비교")||roles.includes("판단"))return "비교";return "변화·성과";}
  const kind=visualKind(id);
  if(kind==="journey")return "고객 여정";
  if(kind==="cause-tree"||kind==="cause-chain"||id==="c-funnel")return "인과관계";
  if(kind==="positioning"||kind==="before-after"||["c-compare","c-matrix","c-header-boxes","m-feature-cards"].includes(id))return "비교";
  if(kind==="system-flow"||kind==="system-compare")return "시스템 구조";
  if(kind==="swimlane"||["c-arrow-flow","c-timeline"].includes(id))return "실행 과정";
  return "변화·성과";
}
export function bodyLayouts(input:Pick<DeckInput,"deckType">) {return layoutIds.filter(id=>id.startsWith(input.deckType==="consulting"?"c-":"m-")&&!id.endsWith("cover")&&id!=="c-toc");}

export function physicalLayoutKey(id: LayoutId): string { return expandedKind(id) || analyticalKind(id) || visualKind(id) ? id.slice(2) : id; }
export const catalogLayoutIds = layoutIds.filter((id,index) => layoutIds.findIndex(other => physicalLayoutKey(other) === physicalLayoutKey(id)) === index);
export const catalogCounts = { physical: catalogLayoutIds.length, implementations: layoutIds.length, added: expandedKinds.length };
/** 2026-11-09 레이아웃 점검(깨짐·빈 공간·작은 글자·규칙)에서 배치를 고친 유형. 카탈로그에 '점검 반영' 표시를 단다. */
export const revisedLayoutKeys = new Set(["c-toc", "c-compare", "comparison-table", "calendar", "contract-bars", "evidence-table", "cross-matrix", "evidence-scope", "calculation-flow", "screenshot-notes", "c-header-boxes", "c-arrow-flow", "journey", "cause-tree", "cause-chain", "positioning", "swimlane", "quadrants", "argument-board", "multi-bar", "line-chart", "waterfall", "horizontal-formula", "date-timeline", "scenario-gantt", "vertical-events", "journey-lanes", "business-structure", "agreement-next", "persona-cards", "interview-quotes", "metrics-panel", "benchmark-cards", "maturity-steps", "evidence-convergence"]);
export const newLayoutKeys = new Set(["tam-sam-som", "risk-matrix", "key-number"]);
/** 카탈로그 배지: 자동 생성에서 빠지는 유형(직접 고를 때만 사용)과 이번 점검에서 고친 유형. */
export function catalogBadges(id: LayoutId): { label: string; tone: "manual" | "revised" }[] {
  const key = physicalLayoutKey(id), badges: { label: string; tone: "manual" | "revised" }[] = [];
  if (GENERATION_CONFIG.layouts.autoExcludedKinds.some(kind => id.endsWith("-" + kind))) badges.push({ label: "직접 선택 전용", tone: "manual" });
  if (revisedLayoutKeys.has(key)) badges.push({ label: "점검 반영 11.09", tone: "revised" });
  if (newLayoutKeys.has(key)) badges.push({ label: "신규 11.09", tone: "revised" });
  return badges;
}
