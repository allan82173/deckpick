/**
 * 로컬 에이전트 연결(2026-11-09): API 키 없이, 이 PC에 로그인된 Claude Code 또는 Codex CLI로 AI 호출을 보낸다.
 * - 개인용 로컬 실행 전용이다. Vercel(공개 사이트)에서는 꺼져 있고, `.env.local`에 DECKPICK_LOCAL_AGENT=1을 둔 로컬 서버에서만 켜진다.
 *   (외부 서비스가 다른 사람의 구독 로그인을 대신 쓰게 하는 기능이 아니다.)
 * - 파이프라인은 Anthropic Messages 형식으로 요청을 만들고, 여기서 CLI 실행 결과를 같은 형식의 응답으로 바꿔 돌려준다.
 *   그래서 형식 검증·재요청·근거 대조 같은 기존 흐름이 그대로 동작한다.
 * - 긴 지시문은 파일(--system-prompt-file)과 표준 입력으로 넘긴다(Windows 명령줄 길이·따옴표 문제 회피).
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const LOCAL_AGENTS = ["claude-code", "codex"] as const;
export type LocalAgent = (typeof LOCAL_AGENTS)[number];
export const isLocalAgent = (provider: string): provider is LocalAgent => (LOCAL_AGENTS as readonly string[]).includes(provider);
export const localAgentsEnabled = () => process.env.DECKPICK_LOCAL_AGENT === "1" && process.env.VERCEL !== "1";
const command = (agent: LocalAgent) => agent === "claude-code" ? "claude" : "codex";
const windows = process.platform === "win32";
// Windows의 npm 전역 설치는 .cmd 실행 파일이라 셸을 거친다. 이때 인자는 직접 따옴표로 감싼다(긴 내용은 인자로 넘기지 않는다).
const quoted = (args: string[]) => windows ? args.map(a => a === "" || /[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a) : args;

const available = new Map<LocalAgent, boolean>();
/** CLI가 설치돼 있는지(버전 확인). 결과는 서버가 켜져 있는 동안 기억한다. */
export function localAgentAvailable(agent: LocalAgent): boolean {
  if (!localAgentsEnabled()) return false;
  if (!available.has(agent)) {
    const r = spawnSync(command(agent), quoted(["--version"]), { shell: windows, timeout: 8000, encoding: "utf8", windowsHide: true });
    available.set(agent, r.status === 0);
  }
  return available.get(agent)!;
}

type Block = { type?: string; text?: string; name?: string; input_schema?: unknown };
function flatten(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(item => typeof item === "string" ? item : (item as Block)?.type === "text" ? String((item as Block).text ?? "") : "").filter(Boolean).join("\n");
  return "";
}
const searchSchema = { type: "object", additionalProperties: false, required: ["summary", "sources"], properties: { summary: { type: "string" }, sources: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url", "snippet"], properties: { title: { type: "string" }, url: { type: "string" }, snippet: { type: "string" } } } } } };
/** 응답 앞뒤의 코드 울타리·설명을 걷어내고 첫 JSON 값을 꺼낸다. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  try { return JSON.parse(body); } catch { /* 아래에서 범위를 좁혀 다시 시도 */ }
  const start = body.search(/[{[]/), end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
  throw Error("JSON이 없습니다.");
}

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
async function run(agent: LocalAgent, args: string[], stdin: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command(agent), quoted(args), { shell: windows, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const abort = () => { child.kill(); reject(Object.assign(Error("로컬 에이전트 응답 시간이 초과됐습니다."), { status: 504 })); };
    signal.addEventListener("abort", abort, { once: true });
    child.stdout.setEncoding("utf8").on("data", d => { out += d; });
    child.stderr.setEncoding("utf8").on("data", d => { err += d; });
    child.on("error", error => { signal.removeEventListener("abort", abort); reject(Object.assign(Error(`${command(agent)} 실행 파일을 찾지 못했습니다. 설치·로그인 후 다시 시도해 주세요. (${error.message})`), { status: 400 })); });
    child.on("close", code => { signal.removeEventListener("abort", abort); if (code === 0 || out.trim()) resolve(out); else reject(Object.assign(Error(`${command(agent)} 실행 실패(코드 ${code}): ${err.slice(-400) || "출력 없음"}`), { status: /log ?in|auth|credential|로그인/i.test(err) ? 401 : 502 })); });
    child.stdin.end(stdin, "utf8");
  });
}

/**
 * Anthropic Messages 형식 요청(body)을 CLI로 실행하고, 같은 형식의 응답을 돌려준다.
 * - output_config.format.schema 또는 return_result 도구가 있으면 구조화 응답(tool_use 블록)으로,
 * - web_search 도구가 있으면 CLI의 웹 검색으로 조사한 요약과 출처(web_search_result 블록)로 바꾼다.
 */
export async function localAgentCall(agent: LocalAgent, model: string, body: Record<string, unknown>, signal: AbortSignal): Promise<Record<string, unknown>> {
  const tools = Array.isArray(body.tools) ? body.tools as Block[] : [];
  const outputFormat = (body.output_config as { format?: { schema?: unknown } } | undefined)?.format?.schema;
  const resultTool = tools.find(t => t.name === "return_result");
  const schema = outputFormat ?? resultTool?.input_schema;
  const search = tools.some(t => String(t.type ?? "").startsWith("web_search"));
  const messages = Array.isArray(body.messages) ? body.messages as { content: unknown }[] : [];
  const user = messages.map(m => flatten(m.content)).join("\n\n").replace(/\n<<deck-common-end>>\n/g, "");
  const shape = search ? searchSchema : schema;
  const system = [flatten(body.system), shape ? `\n\n응답은 아래 JSON Schema를 만족하는 JSON 값 하나만 출력합니다. 설명·코드 울타리 없이 JSON만 씁니다.\n${JSON.stringify(shape)}` : "",
    search ? "\n\n웹 검색 도구로 실제로 조사한 내용만 summary에 쓰고, 직접 검색·열람해 확인한 출처만 sources에 넣습니다. URL을 지어내지 않습니다." : ""].join("");
  const dir = await mkdtemp(path.join(tmpdir(), "deckpick-agent-"));
  try {
    let text = "", usage: Usage = { input_tokens: 0, output_tokens: 0 };
    if (agent === "claude-code") {
      const systemFile = path.join(dir, "system.txt");
      await writeFile(systemFile, system, "utf8");
      const args = ["-p", "--output-format", "json", "--no-session-persistence", "--system-prompt-file", systemFile, ...(model && model !== "default" ? ["--model", model] : []),
        ...(search ? ["--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch", "WebFetch"] : ["--tools", ""])];
      const raw = JSON.parse(await run(agent, args, user, signal)) as { result?: string; is_error?: boolean; structured_output?: unknown; usage?: Usage };
      if (raw.is_error) throw Object.assign(Error(`Claude Code 오류: ${String(raw.result ?? "").slice(0, 400)}`), { status: /log ?in|auth/i.test(String(raw.result)) ? 401 : 502 });
      text = raw.structured_output !== undefined ? JSON.stringify(raw.structured_output) : String(raw.result ?? "");
      usage = { input_tokens: raw.usage?.input_tokens ?? 0, output_tokens: raw.usage?.output_tokens ?? 0, cache_read_input_tokens: raw.usage?.cache_read_input_tokens ?? 0, cache_creation_input_tokens: raw.usage?.cache_creation_input_tokens ?? 0 };
    } else {
      const last = path.join(dir, "last.txt");
      const args = ["exec", "--skip-git-repo-check", "--ephemeral", "--sandbox", "read-only", "--json", "-o", last, "-C", dir, ...(model && model !== "default" ? ["-m", model] : []), ...(search ? ["-c", "web_search=live"] : ["-c", "web_search=disabled"]), "-"];
      const events = (await run(agent, args, `${system}\n\n---\n\n${user}`, signal)).split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; } });
      text = await readFile(last, "utf8").catch(() => "");
      for (const event of events) { const u = (event.usage ?? (event as { turn?: { usage?: unknown } }).turn?.usage) as { input_tokens?: number; cached_input_tokens?: number; output_tokens?: number } | undefined; if (u) usage = { input_tokens: usage.input_tokens + (u.input_tokens ?? 0) - (u.cached_input_tokens ?? 0), output_tokens: usage.output_tokens + (u.output_tokens ?? 0), cache_read_input_tokens: (usage.cache_read_input_tokens ?? 0) + (u.cached_input_tokens ?? 0) }; }
    }
    if (search) {
      const found = extractJson(text) as { summary?: string; sources?: { title: string; url: string; snippet?: string }[] };
      return { content: [{ type: "text", text: String(found.summary ?? "") }, { type: "web_search_tool_result", content: (found.sources ?? []).filter(s => /^https?:\/\//.test(s.url)).map(s => ({ type: "web_search_result", title: s.title || s.url, url: s.url, cited_text: s.snippet })) }], stop_reason: "end_turn", usage };
    }
    if (schema) return { content: [{ type: "tool_use", name: "return_result", input: extractJson(text) }], stop_reason: "tool_use", usage };
    return { content: [{ type: "text", text }], stop_reason: "end_turn", usage };
  } finally { await rm(dir, { recursive: true, force: true }).catch(() => undefined); }
}
