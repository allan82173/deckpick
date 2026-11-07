import { z } from "zod";
export const attachmentSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  kind: z.enum(["document", "image"]).default("document"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  includeForAI: z.boolean().optional(),
  imageDetail: z.enum(["auto", "low"]).optional(),
  name: z.string().min(1).max(180),
  bytes: z.number().int().nonnegative(),
  characters: z.number().int().nonnegative(),
  chunks: z.number().int().nonnegative(),
  estimatedTokens: z.number().int().nonnegative(),
  warnings: z.array(z.string()).max(10),
});
export type Attachment = z.infer<typeof attachmentSchema>;
export const MAX_DOCUMENTS = 10;
export const MAX_PHOTOS = 20;
export const MAX_ATTACHMENTS = MAX_DOCUMENTS + MAX_PHOTOS;

export function canAttach(files: Attachment[], file: Attachment) {
  const limit = file.kind === "image" ? MAX_PHOTOS : MAX_DOCUMENTS;
  return files.filter((item) => item.kind === file.kind && item.id !== file.id).length < limit;
}

export const attachmentsSchema = z.array(attachmentSchema).max(MAX_ATTACHMENTS)
  .refine((files) => {
    const photos = files.filter((file) => file.kind === "image").length;
    return photos <= MAX_PHOTOS && files.length - photos <= MAX_DOCUMENTS;
  }, "문서는 최대 10개, 사진은 최대 20장까지 첨부할 수 있습니다.");
// Requests may include both deck-wide and slide-specific attachments.
export const attachmentIdsSchema = z.array(attachmentSchema.shape.id).max(2 * MAX_ATTACHMENTS).default([]);
export const FILE_ACCEPT = ".pdf,.docx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp";
const MIB = 1024 * 1024;
export const MAX_FILE_BYTES = 30 * MIB;
export function fileLimitMB(name: string) {
  return /\.pdf$/i.test(name) ? 30 : 10;
}
export function fileLimitBytes(name: string) {
  return fileLimitMB(name) * MIB;
}
export function attachmentOptions(files: Attachment[] = []) {
  return {
    attachmentIds: files.filter((f) => f.kind !== "image" || f.includeForAI !== false).map((f) => f.id),
    lowDetailImageIds: files.filter((f) => f.kind === "image" && f.includeForAI !== false && f.imageDetail === "low").map((f) => f.id),
  };
}
