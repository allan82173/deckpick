import { analyticalKind } from "./analytical-layouts";
import { expandedKind, expandedRegistry } from "./expanded-layouts";
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
export const catalogCounts = { physical: catalogLayoutIds.length, implementations: layoutIds.length, added: 27 };
