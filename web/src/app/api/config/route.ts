import {isDemoOnly} from "@/lib/runtime-mode";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      serverKeys: {
        openai: !isDemoOnly() && Boolean(process.env.OPENAI_API_KEY?.trim()),
        anthropic: !isDemoOnly() && Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
