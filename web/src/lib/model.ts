import { executionSchema, type Execution } from "./execution-model";
import { generationStateSchema,type GenerationState } from "./run-state";
import { expandedIds, expandedDataSchemas, expandedNames } from "./expanded-layouts";
import {canvasEditsSchema} from "./canvas-edits";
import { attachmentSchema, attachmentsSchema, MAX_PHOTOS, type Attachment } from "./attachment-model";
import { z } from "zod";
import { slideRoles, researchRecordSchema, slideQualitySchema } from "./evidence-model";
import { analyticalIds, analyticalDataSchemas, analyticalNames, type AnalyticalKind } from "./analytical-layouts";
import { argumentSchema, calculationSchema, reviewSchema } from "./task-model";
import { visualIds, visualSchemas, visualNames, type VisualKind } from "./visual-model";

export const layoutIds = [
  "c-cover",
  "c-toc",
  "c-header-boxes",
  "c-funnel",
  "c-arrow-flow",
  "c-metric-cards",
  "c-compare",
  "c-conclusion",
  "c-split-insight",
  "c-matrix",
  "c-timeline",
  "m-cover",
  "m-big-message",
  "m-image-copy",
  "m-big-number",
  "m-feature-cards",
  "m-quote-cta",
  ...visualIds,
  ...analyticalIds,
  ...expandedIds,
] as const;
export type LayoutId = (typeof layoutIds)[number];
const text = z.string().min(1).max(1200);
const short = z.string().min(1).max(120);
export const dataSchemas = {
  ...visualSchemas,
  ...analyticalDataSchemas,
  ...expandedDataSchemas,
  "c-cover": z.object({ title: text, subtitle: text, author: short, coverStyle: z.enum(["classic", "photo", "white", "type"]).optional(), photoId: attachmentSchema.shape.id.optional(), referencePhoto: z.literal("mgrv-space").optional() }),
  "c-toc": z.object({ items: z.array(short).min(3).max(5) }),
  "c-header-boxes": z.object({
    columns: z
      .array(z.object({ title: short, bullets: z.array(text).min(2).max(4) }))
      .min(2)
      .max(3),
  }),
  "c-funnel": z.object({
    steps: z
      .array(z.object({ title: short, body: text }))
      .min(2)
      .max(3),
    chips: z.array(short).max(4).optional(),
  }),
  "c-arrow-flow": z.object({
    blocks: z
      .array(z.object({ title: short, body: text }))
      .min(2)
      .max(4),
    chips: z.array(short).max(4).optional(),
  }),
  "c-metric-cards": z.object({
    rows: z
      .array(z.object({ label: short, value: short, strong: text, sub: text }))
      .min(2)
      .max(4),
  }),
  "c-compare": z
    .object({
      options: z.array(short).min(2).max(3),
      criteria: z.array(short).min(3).max(5),
      cells: z.array(z.array(text)),
      recommended: z.number().int().min(0).max(2),
    })
    .refine(
      (v) =>
        v.recommended < v.options.length &&
        v.cells.length === v.criteria.length &&
        v.cells.every((row) => row.length === v.options.length),
      "비교표의 행·열 수를 맞춰 주세요.",
    ),
  "c-conclusion": z.object({
    points: z
      .array(z.object({ title: short, body: text }))
      .min(2)
      .max(3),
    conclusion: text,
  }),
  "c-split-insight": z.object({ takeaway: text, evidence: z.array(z.object({ title: short, body: text })).min(2).max(3), implication: text }),
  "c-matrix": z.object({ xAxis: short, yAxis: short, cells: z.array(z.object({ title: short, body: text })).length(4), highlight: z.number().int().min(0).max(3), implication: text }),
  "c-timeline": z.object({ steps: z.array(z.object({ label: short, title: short, body: text })).min(3).max(4) }),
  "m-cover": z.object({ product: short, tagline: text, image: text }),
  "m-big-message": z.object({ message: text, highlight: short, sub: text }),
  "m-image-copy": z.object({
    image: text,
    body: z.array(text).min(1).max(3),
    imageSide: z.enum(["left", "right"]),
  }),
  "m-big-number": z.object({
    stats: z
      .array(z.object({ value: short, label: text }))
      .min(1)
      .max(3),
  }),
  "m-feature-cards": z.object({
    features: z
      .array(z.object({ icon: short, title: short, desc: text }))
      .length(3),
  }),
  "m-quote-cta": z.object({
    quote: text,
    person: short,
    cta: text,
    contact: short,
  }),
} satisfies Record<LayoutId, z.ZodType>;
export const sourceSchema = z.object({
  title: short,
  url: z.url().refine((v) => /^https?:\/\//.test(v)),
  usedFor: z.string().optional(),
});
export type Source = z.infer<typeof sourceSchema>;
export const slideSchema = z
  .object({
    layoutId: z.enum(layoutIds),
    section: z.string().max(8),
    headline: text,
    data: z.record(z.string(), z.unknown()),
    sources: z.array(sourceSchema).max(20),
    notes: z.string().optional(),
    evidenceRefs: z.array(z.string()).optional(),
    role: z.enum(slideRoles).optional(),
    quality: slideQualitySchema.optional(),
    internalReview: z.boolean().optional(),
    claimType: z.enum(["공개 사실", "내부 전제", "추론", "가설", "계산"]).optional(),
    rendererVersion:z.literal("adaptive-v3").optional(),
    canvasEdits: canvasEditsSchema,
  })
  .superRefine((v, c) => {
    const r = dataSchemas[v.layoutId].safeParse(v.data);
    if (!r.success)
      c.addIssue({ code: "custom", message: r.error.message, path: ["data"] });
  });
export type SlideSpec = z.infer<typeof slideSchema>;
export const outlineItemSchema = z.object({
  index: z.number().int().nonnegative(),
  section: z.string().min(1).max(8),
  message: short,
  contentHint: text,
  attachments: attachmentsSchema.optional(),
  role: z.enum(slideRoles).optional(),
  evidenceRefs: z.array(z.string()).optional(),
  argument: argumentSchema.optional(),
  calculation: calculationSchema.nullable().optional(),
  claimType: z.enum(["공개 사실", "내부 전제", "추론", "가설", "계산"]).optional(),
});
export type OutlineItem = z.infer<typeof outlineItemSchema>;
/** 2026-11-08: 최종 발표 모드(20~30장)를 위해 새 덱 상한을 20→30장으로 올렸다. */
export const MAX_DECK_SLIDES=30;
export const presentationStages = ["interim", "final"] as const;
export type PresentationStage = (typeof presentationStages)[number];
/** 최종 발표를 고르면 처음 제안하는 장 수 */
export const FINAL_DEFAULT_SLIDES = 24;
export const deckInputSchema = z.object({
  deckType: z.enum(["consulting", "marketing"]),
  designSystemId: z.enum(["ict-forest", "navy", "coral", "lemonade", "sand", "charcoal", "custom"]),
  customPrimary: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  topic: z.string().trim().min(1).max(250),
  purpose: z.string().trim().min(1).max(500),
  audience: z.string().max(300).optional(),
  slideCount: z.number().int().min(5).max(MAX_DECK_SLIDES),
  publicSearchTopic: z.string().max(250).optional(),
  appendSources: z.boolean().optional(),
  internalReview: z.boolean().optional(),
  /** 중간 발표(기본: 현황 진단·가설·검증 계획) / 최종 발표(컨셉·벤치마킹·로드맵·KPI 포함) */
  stage: z.enum(presentationStages).optional(),
});
export type DeckInput = z.infer<typeof deckInputSchema>;
export type Colors = {
  primary: string;
  darkest: string;
  textSub: string;
  muted: string;
  tint: string;
  panel: string;
  connector: string;
  accent: string;
  onDarkSub: string;
  coverLine: string;
  risk: string;
};
export type DesignSystem = {
  id: string;
  name: string;
  font: "Pretendard";
  colors: Colors;
};
export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  imageIds: z.array(attachmentSchema.shape.id).max(MAX_PHOTOS).optional(),
  text: z.string(),
  outlineDraft: z.array(outlineItemSchema).optional(),
  sources: z.array(sourceSchema).optional(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof messageSchema>;
export type Deck = {
  generation?:GenerationState;
  execution?: Execution;
  attachments?: Attachment[];
  id: string;
  input: DeckInput;
  designSystem: DesignSystem;
  research: Source[];
  researchRecord?: z.infer<typeof researchRecordSchema>;
  review?: z.infer<typeof reviewSchema>;
  chat: {
    setup: ChatMessage[];
    outline: ChatMessage[];
    slides: Record<number, ChatMessage[]>;
  };
  outline: OutlineItem[];
  candidates: Record<number, SlideSpec[]>;
  picked: Record<number, number>;
  edited: Record<number, SlideSpec>;
  demo: boolean;
  candidateRounds?: Record<number, number>;
};
const storedOutline = outlineItemSchema.extend({
  message: z.string(),
  section: z.string().max(8),
  contentHint: z.string(),
});
const storedMessage = messageSchema.extend({
  outlineDraft: z.array(storedOutline).optional(),
});
const storedSlide = z.object({
  layoutId: z.enum(layoutIds),
  section: z.string().max(8),
  headline: z.string(),
  data: z.record(z.string(), z.unknown()),
  sources: z.array(sourceSchema),
  notes: z.string().optional(),
  evidenceRefs: z.array(z.string()).optional(),
  quality: slideQualitySchema.optional(),
  role: z.enum(slideRoles).optional(),
  internalReview: z.boolean().optional(),
  claimType: z.enum(["공개 사실", "내부 전제", "추론", "가설", "계산"]).optional(),
    rendererVersion:z.literal("adaptive-v3").optional(),
    canvasEdits: canvasEditsSchema,
});
export const persistedDeckSchema = z.object({
  generation:generationStateSchema.optional(),
  execution: executionSchema.optional(),
  attachments: attachmentsSchema.optional(),
  id: z.string(),
  input: deckInputSchema.extend({ topic: z.string(), purpose: z.string(), slideCount: z.number().int().min(5).max(30) }),
  designSystem: z.object({
    id: z.string(),
    name: z.string(),
    font: z.literal("Pretendard"),
    colors: z.object(
      Object.fromEntries(
        [
          "primary",
          "darkest",
          "textSub",
          "muted",
          "tint",
          "panel",
          "connector",
          "accent",
          "onDarkSub",
          "coverLine",
          "risk",
        ].map((k) => [k, z.string().regex(/^#[0-9a-f]{6}$/i)]),
      ) as Record<keyof Colors, z.ZodString>,
    ),
  }),
  research: z.array(sourceSchema),
  researchRecord: researchRecordSchema.optional(),
  review: reviewSchema.optional(),
  chat: z.object({
    setup: z.array(storedMessage),
    outline: z.array(storedMessage),
    slides: z.record(z.string(), z.array(storedMessage)),
  }),
  outline: z.array(storedOutline),
  candidates: z.record(z.string(), z.array(storedSlide)),
  picked: z.record(z.string(), z.number().int().min(0).max(2)),
  edited: z.record(z.string(), storedSlide),
  demo: z.boolean(),
  candidateRounds: z.record(z.string(), z.number().int().nonnegative()).optional(),
});
export const layoutNames: Record<LayoutId, string> = {
  ...expandedNames,
  ...Object.fromEntries(analyticalIds.map(id => [id, analyticalNames[id.slice(2) as AnalyticalKind]])) as Record<typeof analyticalIds[number], string>,
  ...Object.fromEntries(visualIds.map(id => [id, visualNames[id.slice(2) as VisualKind]])) as Record<typeof visualIds[number], string>,
  "c-cover": "표지",
  "c-toc": "아젠다",
  "c-header-boxes": "병렬 박스",
  "c-funnel": "원인 좁히기",
  "c-arrow-flow": "단계별 흐름",
  "c-metric-cards": "핵심 지표",
  "c-compare": "대안 비교",
  "c-conclusion": "핵심 제언",
  "c-split-insight": "통찰 + 근거",
  "c-matrix": "2×2 프레임",
  "c-timeline": "실행 로드맵",
  "m-cover": "브랜드 표지",
  "m-big-message": "빅 메시지",
  "m-image-copy": "이미지 & 카피",
  "m-big-number": "빅 넘버",
  "m-feature-cards": "특징 카드",
  "m-quote-cta": "인용 & CTA",
};
export function validateCandidates(
  slides: unknown,
  input: DeckInput,
  allowed: Source[],
  excluded: string[] = [],
): SlideSpec[] {
  const parsed = z.array(slideSchema).min(1).max(3).parse(slides);
  const prefix = input.deckType === "consulting" ? "c-" : "m-";
  for (const s of parsed) {
    if (s.layoutId.endsWith("-trend") && s.data.mode === "observed" && !s.sources.length && !/첨부|파일|쪽|문단|슬라이드/.test(s.notes ?? "")) throw Error("실측 차트는 웹 출처 또는 첨부 파일의 위치 근거가 필요합니다.");
    if (!s.layoutId.startsWith(prefix) || excluded.includes(s.layoutId))
      throw Error("요청한 레이아웃 범위를 벗어났습니다.");
    if (s.sources.some((a) => !allowed.some((b) => b.url === a.url)))
      throw Error("검색 기록에 없는 출처입니다.");
  }
  const covers = parsed.every(
    (s) => s.layoutId === "c-cover" || s.layoutId === "m-cover",
  );
  if (!covers && new Set(parsed.map((s) => s.layoutId)).size !== parsed.length)
    throw Error("레이아웃이 중복됐습니다.");
  return parsed;
}
