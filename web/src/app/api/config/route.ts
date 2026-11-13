import {isDemoOnly} from "@/lib/runtime-mode";
import {cliOnlyRequested, localAgentStatus} from "@/lib/local-agent";

export const dynamic = "force-dynamic";



export async function GET() {

  return Response.json(

    {

      serverKeys: {

        openai: !cliOnlyRequested() && !isDemoOnly() && Boolean(process.env.OPENAI_API_KEY?.trim()),

        anthropic: !cliOnlyRequested() && !isDemoOnly() && Boolean(process.env.ANTHROPIC_API_KEY?.trim()),

      },
      cliOnly: cliOnlyRequested(),
      localAgents: cliOnlyRequested() ? { openai: localAgentStatus("codex"), anthropic: localAgentStatus("claude-code") } : undefined,

    },

    { headers: { "Cache-Control": "no-store" } },

  );

}

