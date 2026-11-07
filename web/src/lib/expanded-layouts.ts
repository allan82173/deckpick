import { z } from "zod";
const label = z.string().min(1).max(60), body = z.string().min(1).max(220);
export const natureTag = z.enum(["공개 사실", "내부 전제", "추론", "가설", "계산"]);
const common = { takeaway: body, tag: natureTag.optional() };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => { const d = new Date(s + "T00:00:00Z"); return !isNaN(+d) && d.toISOString().slice(0, 10) === s; }, "유효한 날짜가 아닙니다.");
const span = z.object({ start: date, end: date, label, tone: z.enum(["진함", "연함"]) }).refine(v => v.start <= v.end, "기간 순서가 잘못됐습니다.");
const series = z.object({ name: label, values: z.array(z.number().finite()).min(2).max(12) });
const chartBase = { categories: z.array(label).min(2).max(12), unit: label, interpretation: body.optional(), ...common };
const aligned = (d: { categories: string[]; series: { values: number[] }[] }) => d.series.every(s => s.values.length === d.categories.length);
export const expandedSchemas = {
  "evaluation-matrix": z.object({ criteria: z.array(label).min(3).max(6), rows: z.array(z.object({ name: label, subtitle: label, grades: z.array(z.enum(["높음", "부분", "낮음"])).min(3).max(6), judgment: label })).min(4).max(8), highlight: z.number().int().min(0).max(7).optional(), ...common }).refine(d => d.rows.every(r => r.grades.length === d.criteria.length) && (d.highlight === undefined || d.highlight < d.rows.length), "행·기준 수가 일치하지 않습니다."),
  "cross-matrix": z.object({ columns: z.array(label).min(2).max(4), rows: z.array(z.object({ label, cells: z.array(body).min(2).max(4), note: label.optional() })).min(3).max(6), highlights: z.array(z.object({ row: z.number().int().nonnegative(), col: z.number().int().nonnegative() })).max(12).optional(), ...common }).refine(d => d.rows.every(r => r.cells.length === d.columns.length) && (d.highlights ?? []).every(p => p.row < d.rows.length && p.col < d.columns.length), "셀 좌표·열 수가 잘못됐습니다."),
  "judgment-reversal": z.object({ priorities: z.array(z.object({ name: label, why: body, reversal: body, method: body })).min(2).max(3), ...common }),
  "question-summary": z.object({ answers: z.array(z.object({ question: label, answer: body, evidence: body, tag: natureTag })).min(2).max(4), agreement: body, ...common }),
  "validation-plan": z.object({ rows: z.array(z.object({ question: body, method: body, sample: body, change: body })).min(3).max(6), ...common }),
  "evidence-scope": z.object({ rows: z.array(z.object({ code: label, material: label, supports: body, limits: body })).min(4).max(14), ...common }),
  "survey-findings": z.object({ sampleSize: z.number().int().positive(), period: z.string().min(6).max(80), evidenceId: label, responses: z.array(z.object({ label, percent: z.number().min(0).max(100) })).min(2).max(6), quotes: z.array(z.object({ text: body, speaker: label })).min(2).max(3), ...common }),
  "multi-bar": z.object({ ...chartBase, mode: z.enum(["그룹", "누적"]), series: z.array(series).min(2).max(4) }).refine(aligned, "차트 계열과 범주 수가 다릅니다."),
  "line-chart": z.object({ ...chartBase, series: z.array(series).min(1).max(3) }).refine(aligned, "차트 계열과 범주 수가 다릅니다."),
  waterfall: z.object({ start: z.object({ label, value: z.number().finite() }), changes: z.array(z.object({ label, value: z.number().finite() })).min(1).max(8), endLabel: label, unit: label, interpretation: body.optional(), ...common }),
  "composition-donut": z.object({ items: z.array(z.object({ label, value: z.number().nonnegative().finite() })).min(3).max(6), unit: label, focusIndex: z.number().int().nonnegative().optional(), ...common }).refine(d => d.items.reduce((s, v) => s + v.value, 0) > 0 && (d.focusIndex === undefined || d.focusIndex < d.items.length), "구성비 총합·강조 위치가 잘못됐습니다."),
  "horizontal-formula": z.object({ items: z.array(z.object({ label, value: z.number().nonnegative().finite(), basis: body })).min(2).max(6), unit: label, assumption: body, formula: body, interpretation: body.optional(), ...common, tag: z.literal("계산") }),
  "calculation-flow": z.object({ assumptions: z.array(z.object({ label, value: label })).min(2).max(6), formula: body, result: label, unit: label, limitation: body, ...common, tag: z.literal("계산") }),
  "date-timeline": z.object({ rows: z.array(z.object({ label, periods: z.array(span).min(1).max(5) })).min(2).max(6), milestones: z.array(z.object({ date, label })).max(6), highlight: z.object({ start: date, end: date, label }).optional(), ...common }),
  "scenario-gantt": z.object({ start: date, end: date, scenarios: z.array(z.object({ name: label, periods: z.array(span).min(1).max(6), resultDescription: body })).min(2).max(4), formula: body, ...common, tag: z.literal("계산") }).refine(d => d.start < d.end && d.scenarios.every(s => s.periods.every((p, i) => p.start >= d.start && p.end <= d.end && (i === 0 || p.start > s.periods[i - 1].end))), "시나리오 기간이 범위를 벗어나거나 중복됩니다."),
  "vertical-events": z.object({ events: z.array(z.object({ date: label, title: label, description: body })).min(3).max(6), deliverables: z.array(body).min(1).max(4).optional(), ...common }),
  "journey-lanes": z.object({ stages: z.array(label).min(3).max(5), lanes: z.array(z.object({ name: label, cells: z.array(z.object({ action: body, touchpoint: label, friction: body, tag: natureTag.optional() })).min(3).max(5) })).min(1).max(3), exitPoints: z.array(label).min(3).max(5).optional(), focus: z.number().int().nonnegative().optional(), ...common }).refine(d => d.lanes.every(l => l.cells.length === d.stages.length) && (!d.exitPoints || d.exitPoints.length === d.stages.length) && (d.focus === undefined || d.focus < d.stages.length), "여정 단계·레인 셀 수가 다릅니다."),
  "business-structure": z.object({ actors: z.array(z.object({ name: label, responsibility: z.array(body).length(2) })).min(3).max(5), transactions: z.array(label).min(2).max(4), ...common }).refine(d => d.transactions.length === d.actors.length - 1, "거래 화살표 수가 맞지 않습니다."),
  "metrics-panel": z.object({ metrics: z.array(z.object({ label, value: label, meaning: body })).min(2).max(4), panelTitle: label, panel: z.array(body).min(2).max(4), ...common }),
  "agreement-next": z.object({ agreements: z.array(body).min(2).max(4), steps: z.array(z.object({ date: label, action: body })).min(3).max(6), ...common }),
  "section-divider": z.object({ number: label, name: label, sections: z.array(label).min(2).max(8), description: body.optional(), ...common }),
  "persona-cards": z.object({ personas: z.array(z.object({ name: label, attributes: label, goal: body, pain: body, quote: body })).min(2).max(3), basis: z.enum(["가상", "실제 조사"]), evidenceIds: z.array(label).max(10), ...common }).refine(d => d.basis !== "실제 조사" || d.evidenceIds.length > 0, "실제 조사 페르소나는 조사 근거가 필요합니다."),
  "screenshot-notes": z.object({ imageSrc: z.string().min(1).refine(s => /^\/api\/attachments\/[a-f0-9]{64}$/.test(s) || /^data:image\/(png|jpeg|webp);base64,/.test(s), "업로드한 이미지가 필요합니다."), imageAlt: label, imageWidth: z.number().positive(), imageHeight: z.number().positive(), annotations: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), title: label, description: body })).min(2).max(6), ...common }),
};
export type ExpandedKind = keyof typeof expandedSchemas;
export const expandedKinds = Object.keys(expandedSchemas) as ExpandedKind[];
export const expandedIds = expandedKinds.flatMap(kind => [`c-${kind}`, `m-${kind}`] as const);
export type ExpandedId = `c-${ExpandedKind}` | `m-${ExpandedKind}`;
export const expandedDataSchemas = Object.fromEntries(expandedIds.map(id => [id, expandedSchemas[id.slice(2) as ExpandedKind]])) as unknown as Record<ExpandedId, z.ZodType<Record<string, unknown>>>;
export function expandedKind(id: string): ExpandedKind | undefined { const k = id.slice(2) as ExpandedKind; return k in expandedSchemas ? k : undefined; }
type Meta = { name: string; stage: number; reference: number; roles: string[]; use: string; avoid: string; minimum: string };
export const expandedRegistry: Record<ExpandedKind, Meta> = {
  "evaluation-matrix": { name: "평가 매트릭스", stage: 1, reference: 19, roles: ["판단", "비교", "우선순위"], use: "다수 대상을 동일 기준으로 평가하고 선택할 때", avoid: "평가 기준이나 등급의 근거가 없을 때", minimum: "대상4~8, 기준3~6, 3단계 등급과 판단" },
  "cross-matrix": { name: "교차 매트릭스", stage: 1, reference: 20, roles: ["비교", "판단", "우선순위"], use: "두 분류축을 교차해 설명할 때", avoid: "축끼리 독립적이지 않을 때", minimum: "행3~6×열2~4, 교차 셀의 문장" },
  "judgment-reversal": { name: "판단과 반증 조건", stage: 1, reference: 21, roles: ["판단", "우선순위", "마무리"], use: "우선순위와 이를 뒤집는 조건을 합의할 때", avoid: "현재 선택이나 반전 조건이 없을 때", minimum: "대안2~3, 이유·반전 조건·확인 방법" },
  "question-summary": { name: "질문별 답과 근거 수준", stage: 1, reference: 5, roles: ["판단", "합의 사항", "마무리"], use: "핵심 질문마다 현재 답을 요약할 때", avoid: "질문만 있고 잠정 답도 없을 때", minimum: "질문2~4, 답·근거·성격 태그" },
  "validation-plan": { name: "검증 계획 표", stage: 1, reference: 43, roles: ["근거", "합의 사항", "일정"], use: "검증 결과에 따라 바꿀 판단을 정할 때", avoid: "방법만 나열하고 변경할 판단이 없을 때", minimum: "질문3~6, 방법·대상규모·반전 조건" },
  "evidence-scope": { name: "출처와 판단 범위 확장", stage: 1, reference: 42, roles: ["근거", "사실 제시", "합의 사항"], use: "자료별 판단 가능 범위를 공개할 때", avoid: "실제 출처·코드가 없을 때", minimum: "자료4~14, 판단 가능·불가 범위" },
  "survey-findings": { name: "조사 결과와 인용", stage: 1, reference: 41, roles: ["근거", "사실 제시"], use: "실제 설문 비율과 인터뷰를 함께 해석할 때", avoid: "표본 수·기간·조사 근거가 없을 때", minimum: "n·기간·근거ID, 비율2~6, 인용2~3" },
  "multi-bar": { name: "누적·그룹 막대", stage: 2, reference: 33, roles: ["사실 제시", "비교", "계산"], use: "두 개 이상 계열의 크기나 구성을 비교할 때", avoid: "계열의 분모·단위가 다를 때", minimum: "계열2~4, 공통 범주2~12, 단위" },
  "line-chart": { name: "다중 선 그래프", stage: 2, reference: 34, roles: ["사실 제시", "비교", "계산"], use: "같은 간격의 기간별 변화를 비교할 때", avoid: "순서 없는 범주나 정의가 바뀐 지표일 때", minimum: "계열1~3, 기간2~12, 단위" },
  waterfall: { name: "증감 워터폴", stage: 2, reference: 35, roles: ["계산", "사실 제시"], use: "시작값에서 끝값까지의 증감을 설명할 때", avoid: "증감 항목이 중복돼 합계가 맞지 않을 때", minimum: "시작값, 증감1~8, 끝값은 코드 계산" },
  "composition-donut": { name: "구성비 도넛", stage: 2, reference: 37, roles: ["사실 제시", "비교"], use: "양의 전체를 구성하는 비중을 설명할 때", avoid: "항목이 중복되거나 음수가 있을 때", minimum: "항목3~6, 양의 총합, 단위" },
  "horizontal-formula": { name: "가로 막대와 산출 근거", stage: 2, reference: 36, roles: ["계산", "비교"], use: "가정에 따른 대안별 산출값을 비교할 때", avoid: "산식·가정을 밝힐 수 없을 때", minimum: "항목2~6, 값·근거, 가정·산식·단위" },
  "calculation-flow": { name: "가정에서 산식·결과", stage: 2, reference: 38, roles: ["계산"], use: "하나의 계산을 가정부터 재현할 때", avoid: "숫자 결과나 산식이 없을 때", minimum: "가정2~6, 산식, 결과·단위·한계" },
  "date-timeline": { name: "날짜 기반 타임라인", stage: 3, reference: 39, roles: ["일정", "흐름"], use: "실제 날짜에 따른 병렬 일정을 보여 줄 때", avoid: "날짜 없이 단계 이름만 있을 때", minimum: "YYYY-MM-DD 기간2~6행, 이정표 선택" },
  "scenario-gantt": { name: "시나리오 간트와 계산 결과", stage: 3, reference: 40, roles: ["일정", "계산", "비교"], use: "기간 활용·빈 기간을 시나리오로 비교할 때", avoid: "일정이 중복되거나 전체 범위가 없을 때", minimum: "시나리오2~4, 시작·종료일, 기간 막대" },
  "vertical-events": { name: "세로 날짜 타임라인", stage: 3, reference: 28, roles: ["일정", "흐름"], use: "날짜별 사건과 산출물을 정리할 때", avoid: "시간순서가 의미 없는 목록일 때", minimum: "날짜·제목·설명3~6개" },
  "journey-lanes": { name: "세그먼트별 고객 여정", stage: 4, reference: 13, roles: ["흐름", "비교"], use: "공통 단계에서 서로 다른 고객 경험을 비교할 때", avoid: "레인마다 단계 정의가 다를 때", minimum: "단계3~5, 레인1~3, 행동·접점·불편" },
  "business-structure": { name: "거래와 책임 사업 구조", stage: 4, reference: 24, roles: ["흐름", "사실 제시"], use: "주체 간 거래와 책임을 함께 설명할 때", avoid: "거래 관계가 없는 단순 조직 목록일 때", minimum: "주체3~5, 거래2~4, 책임 각2개" },
  "metrics-panel": { name: "지표와 해석 한계", stage: 4, reference: 30, roles: ["사실 제시", "근거", "계산"], use: "핵심 수치와 말할 수 없는 범위를 구분할 때", avoid: "지표의 단위나 의미를 모를 때", minimum: "지표2~4, 값·의미, 한계2~4" },
  "agreement-next": { name: "합의 사항과 다음 단계", stage: 4, reference: 48, roles: ["마무리", "합의 사항", "일정"], use: "의사결정과 후속 실행을 함께 확정할 때", avoid: "합의할 항목이 없을 때", minimum: "합의2~4, 날짜별 행동3~6" },
  "section-divider": { name: "섹션 구분", stage: 4, reference: 4, roles: ["흐름", "마무리"], use: "여러 절 사이에서 현재 위치를 보여 줄 때", avoid: "본문 근거나 판단을 대신할 때", minimum: "섹션 번호·이름, 전체 절2~8" },
  "persona-cards": { name: "근거 구분 페르소나", stage: 4, reference: 14, roles: ["사실 제시", "가설", "비교"], use: "고객의 목표와 불편을 인물별로 정리할 때", avoid: "가상 인물을 실제 인터뷰로 보이게 할 때", minimum: "인물2~3, 속성·목표·불편·인용, 조사 여부" },
  "screenshot-notes": { name: "화면 캡처와 번호 주석", stage: 4, reference: 49, roles: ["근거", "사실 제시", "흐름"], use: "실제 업로드 화면의 위치를 짚어 설명할 때", avoid: "업로드 이미지가 없을 때", minimum: "업로드 이미지·원본 크기, 좌표·제목·설명2~6" },
};
export const expandedNames = Object.fromEntries(expandedIds.map(id => [id, expandedRegistry[id.slice(2) as ExpandedKind].name])) as Record<ExpandedId, string>;
export function dateRange(data: { rows?: { periods: { start: string; end: string }[] }[]; milestones?: { date: string }[]; highlight?: { start: string; end: string } }) {
 const dates = [...(data.rows ?? []).flatMap(r => r.periods.flatMap(p => [p.start, p.end])), ...(data.milestones ?? []).map(m => m.date), ...(data.highlight ? [data.highlight.start, data.highlight.end] : [])].sort();
 if (!dates.length) throw Error("시간축 날짜가 비었습니다."); return { start: dates[0], end: dates.at(-1)! };
}
export const dayNumber = (s: string) => Date.parse(s + "T00:00:00Z") / 86400000;
export function scenarioDays(start: string, end: string, periods: { start: string; end: string }[]) { const total = dayNumber(end) - dayNumber(start) + 1; const occupied = periods.reduce((sum,p) => sum + dayNumber(p.end) - dayNumber(p.start) + 1,0); return { total, occupied, vacant: total - occupied }; }
