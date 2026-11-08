import {z} from "zod";
import {attachmentIdsSchema} from "./attachment-model";
import {deckInputSchema,messageSchema,outlineItemSchema,sourceSchema,layoutIds,slideSchema,persistedDeckSchema} from "./model";
import {researchRecordSchema} from "./evidence-model";
import {deckContextSchema} from "./slide-chat";
/** Research source counts are variable; the route enforces the total request-byte budget. */
export const requestSchema = z.object({
  runId:z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).optional(),
  provider: z.enum(["openai", "anthropic"]).default("openai"),
  model: z.string().optional(),
  attachmentIds: attachmentIdsSchema,
  lowDetailImageIds: attachmentIdsSchema,
  input: deckInputSchema.extend({ slideCount: z.number().int().min(5).max(30) }).optional(),
  messages: z.array(messageSchema).max(40).default([]),
  outline: z.array(outlineItemSchema).max(30).default([]),
  sources: z.array(sourceSchema).default([]),
  researchRecord: researchRecordSchema.optional(),
  previousLayouts: z.array(z.enum(layoutIds)).max(30).default([]),
  item: outlineItemSchema.optional(),
  instruction: z.string().max(5000).default(""),
  requestedLayout:z.enum(layoutIds).optional(),
  exclude: z.array(z.string()).max(12).default([]),
  rotation: z.number().int().min(0).max(10000).default(0),
  previousSignatures: z.array(z.string().regex(/^[a-f0-9]{8}$/)).max(3).default([]),
  context: z.enum(["setup", "outline", "slide"]).default("setup"),
  webSearch: z.boolean().default(false),
  currentSlide:slideSchema.optional(),
  designSystem:persistedDeckSchema.shape.designSystem.optional(),
  targetIndex:z.number().int().min(0).max(29).optional(),
  deckContext:deckContextSchema.optional(),
  currentDeck: persistedDeckSchema.optional(),
  acceptLimitedEvidence: z.boolean().default(false),
});
