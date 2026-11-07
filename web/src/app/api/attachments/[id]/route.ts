import {isDemoOnly} from "@/lib/runtime-mode";
import { readAttachmentImage } from "@/lib/attachments";
import sharp from "sharp";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (isDemoOnly()) return new Response(null, {status:404});
  if (request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
  try {
    const image = await readAttachmentImage((await params).id);
    const png = new URL(request.url).searchParams.get("format") === "png";
    const bytes = png ? await sharp(image.bytes).png().toBuffer() : image.bytes;
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": png ? "image/png" : "image/webp", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 404 }); }
}
