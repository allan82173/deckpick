import {isDemoOnly} from "@/lib/runtime-mode";
import {localAgentAvailable} from "@/lib/local-agent";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      serverKeys: {
        openai: !isDemoOnly() && Boolean(process.env.OPENAI_API_KEY?.trim()),
        anthropic: !isDemoOnly() && Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
        // 로컬 에이전트: PC에서 DECKPICK_LOCAL_AGENT=1로 실행하고 CLI가 설치돼 있을 때만 true(공개 사이트에서는 항상 false).
        "claude-code": !isDemoOnly() && localAgentAvailable("claude-code"),
        codex: !isDemoOnly() && localAgentAvailable("codex"),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
