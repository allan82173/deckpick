import { z } from "zod";
export const generationStateSchema=z.object({runId:z.string(),status:z.enum(["running","complete","failed","incomplete","awaiting-review"]),lastCompletedStage:z.string().optional(),completedStages:z.array(z.string()),updatedAt:z.string(),error:z.string().optional()});
export type GenerationState=z.infer<typeof generationStateSchema>;
export const rejectedRowSchema=z.object({stage:z.string(),reason:z.string(),questionId:z.string().optional(),url:z.string().optional(),locator:z.string().optional(),rowIndex:z.number().optional()});
export type RejectedRow=z.infer<typeof rejectedRowSchema>;
