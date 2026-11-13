import { z } from "zod";
export const callMetricSchema = z.object({
  id: z.string(), stage: z.string(), model: z.string(), provider: z.string(), effort: z.string(), maxOutputTokens: z.number(),
  startedAt: z.string(), durationMs: z.number(), status: z.number(), truncated: z.boolean(),
  requestCharacters:z.number().optional(),estimatedInputTokens:z.number().optional(),estimationMethod:z.string().optional(),
  networkRetry:z.number().optional(),outputRetry:z.number().optional(),
  inputTokens: z.number().optional(), outputTokens: z.number().optional(), totalTokens: z.number().optional(), cachedInputTokens: z.number().optional(), reasoningTokens: z.number().optional(),
  transport: z.enum(["api", "cli"]).optional(), limitsEnforced: z.boolean().optional(),
});
export type CallMetric = z.infer<typeof callMetricSchema>;
export const evidenceScopeSchema=z.object({id:z.string(),stage:z.string(),slideIndex:z.number().optional(),availableRows:z.number(),sentRows:z.number(),attachmentRows:z.number(),confirmedDecisions:z.number(),evidenceIds:z.array(z.string())});
export type EvidenceScope=z.infer<typeof evidenceScopeSchema>;
export const executionSchema = z.object({ startedAt: z.string(), updatedAt: z.string(), calls: z.array(callMetricSchema),evidenceScopes:z.array(evidenceScopeSchema).optional(), config: z.record(z.string(),z.unknown()).optional() });
export type Execution = z.infer<typeof executionSchema>;
export function mergeExecution(previous: Execution | undefined, delta: Execution): Execution {
  const calls=[...new Map([...(previous?.calls??[]),...delta.calls].map(call=>[call.id,call])).values()].sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  const previousIsNewer=!!previous&&previous.updatedAt>delta.updatedAt;
  return { startedAt: previous && previous.startedAt < delta.startedAt ? previous.startedAt : delta.startedAt, updatedAt: previousIsNewer?previous!.updatedAt:delta.updatedAt, calls,evidenceScopes:[...new Map([...(previous?.evidenceScopes??[]),...(delta.evidenceScopes??[])].map(s=>[s.id,s])).values()], config: previousIsNewer?(previous!.config??delta.config):(delta.config??previous?.config) };
}
