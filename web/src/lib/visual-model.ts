import { z } from "zod";
const label = z.string().min(1).max(60), body = z.string().min(1).max(180);
export const visualKinds = ["journey", "cause-tree", "cause-chain", "positioning", "system-flow", "system-compare", "swimlane", "before-after", "trend"] as const;
export type VisualKind = typeof visualKinds[number];
const schemas = {
  journey: z.object({ stages: z.array(z.object({ title: label, action: body, touchpoint: label, friction: body })).min(3).max(5), focus: z.number().int().min(0).max(4), takeaway: body }).refine(v => v.focus < v.stages.length, "강조 단계를 확인해 주세요."),
  "cause-tree": z.object({ problem: body, branches: z.array(z.object({ title: label, causes: z.array(label).min(2).max(3) })).length(3), status: z.enum(["hypothesis", "evidence"]), takeaway: body }),
  "cause-chain": z.object({ situation: body, observations: z.array(label).min(2).max(3), causes: z.array(z.object({ title: label, body })).min(2).max(3), tests: z.array(z.object({ title: label, body })).min(2).max(3), takeaway: body }),
  positioning: z.object({ xAxis: label, yAxis: label, items: z.array(z.object({ name: label, x: z.number().min(0).max(1), y: z.number().min(0).max(1), highlight: z.boolean() })).min(3).max(6), rationale: body, status: z.enum(["hypothesis", "evidence"]) }),
  "system-flow": z.object({ inputs: z.array(label).min(3).max(5), layer: label, layerBody: body, outputs: z.array(label).min(2).max(3), principle: body }),
  "system-compare": z.object({ panels: z.array(z.object({ title: label, inputs: z.array(label).min(3).max(4), layer: label, output: label, note: body })).length(2), takeaway: body }),
  swimlane: z.object({ steps: z.array(z.object({ owner: label, title: label, body, record: label })).min(4).max(6), principle: body }),
  "before-after": z.object({ beforeTitle: label, afterTitle: label, rows: z.array(z.object({ label, before: body, after: body })).min(3).max(4), status: z.enum(["proposal", "measured"]), takeaway: body }),
  trend: z.object({ unit: label, seriesName: label, points: z.array(z.object({ period: label, value: z.number().finite().min(0).max(1e12) })).min(3).max(6), mode: z.enum(["observed", "illustrative"]), takeaway: body }),
};
export const visualIds = ["c-journey", "c-cause-tree", "c-cause-chain", "c-positioning", "c-system-flow", "c-system-compare", "c-swimlane", "c-before-after", "c-trend", "m-journey", "m-cause-tree", "m-cause-chain", "m-positioning", "m-system-flow", "m-system-compare", "m-swimlane", "m-before-after", "m-trend"] as const;
export type VisualId = typeof visualIds[number];
export const visualSchemas = Object.fromEntries(visualIds.map(id => [id, schemas[id.slice(2) as VisualKind]])) as unknown as Record<VisualId, z.ZodType<Record<string,unknown>>>;
export const visualNames: Record<VisualKind, string> = { journey: "고객 여정·이탈 지점", "cause-tree": "원인 트리", "cause-chain": "문제 → 원인 → 검증", positioning: "포지셔닝 맵", "system-flow": "입력 → 데이터 연결 → 결과", "system-compare": "기존·제안 시스템 비교", swimlane: "역할별 업무 흐름", "before-after": "전후·현재와 제안 비교", trend: "기간별 추세 차트" };
export function visualKind(id: string): VisualKind | undefined { const kind = id.slice(2) as VisualKind; return visualKinds.includes(kind) ? kind : undefined; }
export function parseVisual(id: string, data: unknown) { const kind = visualKind(id); return kind ? schemas[kind].parse(data) : undefined; }
export { schemas as visualDataSchemas };
