import { z } from "zod";

const label = z.string().min(1).max(80);
const body = z.string().min(1).max(240);
export const analyticalKinds = ["comparison-table", "calendar", "quadrants", "contract-bars", "formula-cards", "evidence-table", "argument-board"] as const;
export type AnalyticalKind = typeof analyticalKinds[number];
export const analyticalSchemas = {
  "argument-board": z.object({ insight: body, panels: z.array(z.object({ kind: z.enum(["목록", "숫자", "비교", "막대", "산식"]), title: label, rows: z.array(z.object({ label, value: z.string().max(80), detail: body })).min(2).max(4), assumption: z.string().max(180) })).min(2).max(3), takeaway: body }),
  "comparison-table": z.object({
    criteria: z.array(label).min(2).max(4),
    alternatives: z.array(z.object({ name: label, values: z.array(body).min(2).max(4) })).min(2).max(4),
    takeaway: body,
  }).refine(d => d.alternatives.every(a => a.values.length === d.criteria.length), "비교 기준과 셀 수가 다릅니다."),
  calendar: z.object({
    periods: z.array(label).min(3).max(6),
    events: z.array(z.object({ name: label, cells: z.array(z.string().max(100)).min(3).max(6) })).min(2).max(4),
    takeaway: body,
  }).refine(d => d.events.every(e => e.cells.length === d.periods.length), "일정 열 수가 다릅니다."),
  quadrants: z.object({ xAxis: label, yAxis: label, cells: z.array(z.object({ title: label, body })).length(4), takeaway: body }),
  "contract-bars": z.object({
    periods: z.array(label).min(3).max(12),
    rooms: z.array(z.object({ name: label, contracts: z.array(z.object({ start: z.number().int().min(0), end: z.number().int().min(1), label })).max(6) })).min(2).max(6),
    assumption: body,
    takeaway: body,
  }).refine(d => d.rooms.every(r => r.contracts.every((c, i) => c.start < c.end && c.end <= d.periods.length && (i === 0 || c.start >= r.contracts[i - 1].end))), "계약 막대가 기간을 벗어나거나 겹칩니다."),
  "formula-cards": z.object({ cards: z.array(z.object({ title: label, assumption: body, formula: body, result: label, interpretation: body })).min(2).max(3), takeaway: body }),
  "evidence-table": z.object({ rows: z.array(z.object({ id: label, claim: body, scope: body })).min(1).max(6), takeaway: body }),
};
export const analyticalNames: Record<AnalyticalKind, string> = {
  "argument-board": "주장·비교·지표 복합 구성",
  "comparison-table": "대안 × 기준 비교표", calendar: "학기·입주 달력", quadrants: "2×2 판단 매트릭스",
  "contract-bars": "객실 계약·공실 막대", "formula-cards": "가정·산식·결과 카드", "evidence-table": "출처·근거 범위 표",
};
export const analyticalIds = [
  "c-comparison-table", "c-calendar", "c-quadrants", "c-contract-bars", "c-formula-cards", "c-evidence-table",
  "m-comparison-table", "m-calendar", "m-quadrants", "m-contract-bars", "m-formula-cards", "m-evidence-table",
  "c-argument-board", "m-argument-board",
] as const;
export function analyticalKind(id: string): AnalyticalKind | undefined {
  const kind = id.slice(2) as AnalyticalKind;
  return analyticalKinds.includes(kind) ? kind : undefined;
}
export const analyticalDataSchemas = Object.fromEntries(analyticalIds.map(id => [id, analyticalSchemas[id.slice(2) as AnalyticalKind]])) as unknown as Record<typeof analyticalIds[number], z.ZodType<Record<string, unknown>>>;

export function analyticalSample(id: string): Record<string, unknown> | undefined {
  switch (analyticalKind(id)) {
    case "argument-board": return { insight: "같은 판단을 여러 근거로 연결하는 구성 예시입니다.", panels: [{ kind: "비교", title: "대안과 판단", rows: [{ label: "대안 A", value: "가설", detail: "같은 조건으로 비교할 근거를 연결합니다." }, { label: "대안 B", value: "가설", detail: "선택을 바꿀 조건을 함께 보여 줍니다." }], assumption: "구성 예시 · 실제 조사 결과 아님" }, { kind: "숫자", title: "지표와 의미", rows: [{ label: "기간", value: "30일", detail: "계산 예시의 가정이며 실제 일정이 아닙니다." }, { label: "수량", value: "100개", detail: "분모와 단위를 함께 제시하는 예시입니다." }], assumption: "합성 데이터" }], takeaway: "비교와 지표가 같은 메시지를 뒷받침하게 합니다." };
    case "comparison-table": return { criteria: ["조건", "비용", "제약"], alternatives: ["대안 A", "대안 B", "대안 C"].map(name => ({ name, values: ["공식 조건 근거 필요", "동일 기간 견적 필요", "적용 범위 확인 필요"] })), takeaway: "동일한 조건의 비교 근거로 판단합니다." };
    case "calendar": return { periods: ["1기", "2기", "3기", "4기"], events: ["신청", "입주", "퇴실"].map(name => ({ name, cells: ["일정 근거 필요", "", "검증 전 예시", ""] })), takeaway: "신청과 입주 시점의 간극을 구분합니다." };
    case "quadrants": return { xAxis: "기간 예측 가능성", yAxis: "조건 적합성", cells: ["보완", "우선", "보류", "조건부"].map(title => ({ title, body: "분류 기준과 우선순위를 뒤집을 조건을 근거로 설명합니다." })), takeaway: "축과 분류는 검증 전 가설입니다." };
    case "contract-bars": return { periods: ["1월", "2월", "3월", "4월", "5월", "6월"], rooms: ["객실 A", "객실 B", "객실 C"].map(name => ({ name, contracts: [{ start: 0, end: 2, label: "계약 가정" }, { start: 3, end: 5, label: "계약 가정" }] })), assumption: "계산 예시 · 빈 구간은 공실 · 실제 계약 아님", takeaway: "계약 기간과 공실 간격을 함께 계산합니다." };
    case "formula-cards": return { cards: [{ title: "가동률 예시", assumption: "연 365일 중 240일 판매 가정", formula: "240 ÷ 365 × 100", result: "65.8%", interpretation: "합성 계산 예시 · 실제 성과 아님" }, { title: "공실 예시", assumption: "동일한 365일 기준", formula: "365 − 240", result: "125일", interpretation: "청소·전환 기간 제외 가정" }], takeaway: "실측과 계산 가정을 구분합니다." };
    case "evidence-table": return { rows: [{ id: "[1]", claim: "공개 자료의 주장", scope: "원문이 뒷받침하는 판단 범위" }, { id: "[2]", claim: "내부 조건", scope: "내부 전제 · 외부 검증 아님" }], takeaway: "확인한 사실과 미검증 가설을 구분합니다." };
  }
}
