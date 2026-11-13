/** Private loopback-only CLI transport. No API-key fallback or credential copying. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VisionImage } from "./vision";

export class LocalAgentTimeout extends Error { readonly status=504; }
export type LocalAgent = "codex" | "claude-code";
export const cliOnlyRequested = () => process.env.DECKPICK_CLI_ONLY === "1";
export const localAgentsEnabled = () => cliOnlyRequested() && process.env.VERCEL !== "1" && process.env.NEXT_PUBLIC_DEMO_ONLY !== "1";
export function isLoopbackCliRequest(request: Request): boolean {
  try {
    const host = request.headers.get("host") ?? new URL(request.url).host;
    const hostname = new URL(`http://${host}`).hostname;
    const origin = request.headers.get("origin");
    return ["localhost", "127.0.0.1", "[::1]"].includes(hostname) && !!origin && new URL(origin).host === host && request.headers.get("sec-fetch-site") !== "cross-site";
  } catch { return false; }
}
export function cliEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const allowed = /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|USERPROFILE|HOME|APPDATA|LOCALAPPDATA|TEMP|TMP|PROGRAMFILES|PROGRAMFILES\(X86\)|CODEX_HOME|CLAUDE_CONFIG_DIR|LANG|LC_ALL)$/i;
  return { NODE_ENV: "production", ...Object.fromEntries(Object.entries(source).filter(([key]) => allowed.test(key))) };
}
export function localAgentCommand(agent: LocalAgent): string | undefined {
  const configured = process.env[agent === "codex" ? "DECKPICK_CODEX_PATH" : "DECKPICK_CLAUDE_PATH"];
  if (configured && path.isAbsolute(configured) && existsSync(configured) && !/\.(?:cmd|bat|ps1)$/i.test(configured)) return configured;
  const bundled = path.resolve(process.cwd(), "../.local-tools/claude/node_modules/@anthropic-ai/claude-code/bin/claude.exe");
  if (agent === "claude-code" && existsSync(bundled)) return bundled;
  const filename = agent === "codex" ? (process.platform === "win32" ? "codex.exe" : "codex") : (process.platform === "win32" ? "claude.exe" : "claude");
  return (process.env.PATH ?? "").split(path.delimiter).map(p => path.join(p, filename)).find(p => existsSync(p));
}
type Status = { installed: boolean; subscriptionReady: boolean; state: "ready" | "missing" | "login-required" | "unknown" };
const cached = new Map<LocalAgent, { at: number; status: Status }>();
export function localAgentStatus(agent: LocalAgent): Status {
  if (!localAgentsEnabled()) return { installed: false, subscriptionReady: false, state: "missing" };
  const prior = cached.get(agent);
  if (prior && Date.now() - prior.at < 15000) return prior.status;
  const command = localAgentCommand(agent);
  if (!command) return { installed: false, subscriptionReady: false, state: "missing" };
  const result = spawnSync(command, agent === "codex" ? ["login", "status"] : ["auth", "status"], { encoding: "utf8", timeout: 12000, windowsHide: true, shell: false, env: cliEnvironment() });
  let ready = false;
  if (agent === "codex") ready = /logged in using ChatGPT/i.test(String(result.stdout) + String(result.stderr));
  else { try { const auth = JSON.parse(result.stdout); ready = auth.loggedIn === true && auth.authMethod === "claude.ai"; } catch { /* no credentials are returned */ } }
  const status: Status = { installed: true, subscriptionReady: ready, state: ready ? "ready" : result.error ? "unknown" : "login-required" };
  cached.set(agent, { at: Date.now(), status });
  return status;
}
export function extractLocalJson(text: string): unknown {
  const body = (text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text).trim();
  try { return JSON.parse(body); } catch { /* tolerate prose wrappers; downstream Zod still validates */ }
  const start = body.search(/[{[]/), end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
  throw Error("로컬 도구가 올바른 JSON 결과를 반환하지 않았습니다.");
}
/** Leave malformed structured output to the existing bounded format-repair loop. */
export function localStructuredContent(text:string):Record<string,unknown>[] {
  try{return [{type:"tool_use",name:"return_result",input:extractLocalJson(text)}];}
  catch{return [{type:"text",text:"로컬 응답이 JSON 형식 검증을 통과하지 못했습니다."}];}
}
export function codexArgs(dir: string, model: string, search: boolean, images: string[]): string[] {
  return ["exec", "--ignore-user-config", "--skip-git-repo-check", "--ephemeral", "--sandbox", "read-only", "--json", "-o", path.join(dir, "last.txt"), "-C", dir,
    "-c", 'forced_login_method="chatgpt"', "--disable", "shell_tool", "--disable", "unified_exec", "-c", `web_search="${search ? "live" : "disabled"}"`,
    ...(model !== "default" ? ["-m", model] : []), ...images.flatMap(image => ["-i", image]), "-"];
}
function execute(command: string, args: string[], stdin: string, cwd: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(Error("로컬 실행 대기 시간이 초과됐습니다."));
    const child = spawn(command, args, { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], cwd, env: cliEnvironment() });
    let out = "", settled = false;
    const finish = (error?: Error) => { if (settled) return; settled = true; signal.removeEventListener("abort", abort); error ? reject(error) : resolve(out); };
    const abort = () => { child.kill(); finish(new LocalAgentTimeout("로컬 도구가 시간 안에 응답하지 않았습니다. API로 전환하지 않았습니다.")); };
    signal.addEventListener("abort", abort, { once: true });
    child.stdout.setEncoding("utf8").on("data", chunk => { out += chunk; if (out.length > 8_000_000) { child.kill(); finish(Error("로컬 응답 크기 제한을 넘었습니다.")); } });
    child.stderr.resume(); // Never send raw CLI stderr, credentials or local config to the browser.
    child.on("error", () => finish(Error("로컬 실행 도구를 시작하지 못했습니다. 설치 경로를 확인해 주세요.")));
    child.on("close", code => finish(code === 0 ? undefined : Error("로컬 도구 실행이 실패했습니다. 구독 로그인·사용 한도를 확인해 주세요. API로 전환하지 않았습니다.")));
    child.stdin.on("error", () => undefined);
    child.stdin.end(stdin, "utf8");
  });
}
const flatten = (value: unknown): string => typeof value === "string" ? value : Array.isArray(value) ? value.map(v => typeof v === "object" && v && "text" in v ? String(v.text) : "").join("\n") : "";
let tail: Promise<void> = Promise.resolve();
/** Start the per-call timeout only once the serialized CLI slot is available. */
export async function withLocalAgentSlot<T>(signalFactory: () => AbortSignal, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const previous = tail; let release!: () => void;
  tail = new Promise<void>(resolve => { release = resolve; });
  try { await previous; return await task(signalFactory()); }
  finally { release(); }
}
export async function localAgentCall(agent: LocalAgent, model: string, body: Record<string, unknown>, images: VisionImage[], signalOrFactory: AbortSignal | (() => AbortSignal)): Promise<Record<string, unknown>> {
  if (!localAgentsEnabled()) throw Error("로컬 구독 연결이 활성화되지 않았습니다.");
  return withLocalAgentSlot(() => typeof signalOrFactory === "function" ? signalOrFactory() : signalOrFactory, async signal => {
  let jobDir: string | undefined;
  try {
    if (signal.aborted) throw Error("로컬 실행 대기 시간이 초과됐습니다.");
    const command = localAgentCommand(agent);
    if (!command || !localAgentStatus(agent).subscriptionReady) throw Error(`${agent === "codex" ? "Codex" : "Claude Code"} 구독 로그인이 필요합니다. API 키는 사용하지 않습니다.`);
    const tools = Array.isArray(body.tools) ? body.tools as { type?: string; name?: string; input_schema?: unknown }[] : [];
    const search = tools.some(t => (t.type ?? "").startsWith("web_search"));
    const outputFormat = body.output_config as { format?: { schema?: unknown } } | undefined;
    const schema = outputFormat?.format?.schema ?? tools.find(t => t.name === "return_result")?.input_schema;
    const searchSchema = { type: "object", properties: { summary: { type: "string" }, sources: { type: "array", items: { type: "object", properties: { title: { type: "string" }, url: { type: "string" }, snippet: { type: "string" } }, required: ["title", "url", "snippet"], additionalProperties: false } } }, required: ["summary", "sources"], additionalProperties: false };
    const shape = search ? searchSchema : schema;
    const messages = Array.isArray(body.messages) ? body.messages as { role?: string; content?: unknown }[] : [];
    const prompt = [flatten(body.system), ...messages.map(m => `${m.role}: ${flatten(m.content)}`), shape ? `JSON 값 하나만 반환하세요. 스키마: ${JSON.stringify(shape)}` : "", search ? "실제 웹 도구로 조사하고 URL을 제시하세요. 제안 URL은 서버의 별도 원문 대조 전에는 검증 완료가 아닙니다." : "도구를 호출하지 말고 전달된 자료만 사용하세요."].join("\n\n");
    // Keep isolated job assets in the project, preserve failure evidence, never expose credentials.
    const jobRoot = path.resolve(process.cwd(), ".cli-jobs");
    const { mkdir } = await import("node:fs/promises"); await mkdir(jobRoot, { recursive: true });
    const dir = await mkdtemp(path.join(jobRoot, `${agent}-`));
    jobDir = dir;
    let text = ""; let usage: Record<string, unknown> = {};
    if (agent === "codex") {
      const paths: string[] = [];
      for (const [i, image] of images.entries()) { const file = path.join(dir, `image-${i}.${image.mimeType === "image/png" ? "png" : "webp"}`); await writeFile(file, Buffer.from(image.base64, "base64")); paths.push(file); }
      const raw = await execute(command, codexArgs(dir, model, search, paths), prompt, dir, signal);
      for (const line of raw.split(/\r?\n/)) { try { const e = JSON.parse(line); if (e.type === "turn.completed" && e.usage) usage = { input_tokens: e.usage.input_tokens, output_tokens: e.usage.output_tokens, cached_input_tokens: e.usage.cached_input_tokens }; } catch { /* ignore non-JSON CLI diagnostics */ } }
      text = await readFile(path.join(dir, "last.txt"), "utf8");
    } else {
      const args = ["-p", "--output-format", "json", "--input-format", "stream-json", "--no-session-persistence", "--setting-sources", "", "--settings", '{"forceLoginMethod":"claudeai","disableAllHooks":true}', "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--permission-mode", "dontAsk", "--tools", search ? "WebSearch,WebFetch" : "", ...(search ? ["--allowedTools", "WebSearch,WebFetch"] : []), ...(model !== "default" ? ["--model", model] : [])];
      const content = [...images.map(image => ({ type: "image", source: { type: "base64", media_type: image.mimeType, data: image.base64 } })), { type: "text", text: prompt }];
      const result = JSON.parse(await execute(command, args, JSON.stringify({ type: "user", message: { role: "user", content } }) + "\n", dir, signal));
      if (result.is_error) throw Error("Claude Code가 요청을 완료하지 못했습니다. 구독 로그인·사용 한도를 확인해 주세요.");
      text = result.structured_output === undefined ? String(result.result ?? "") : JSON.stringify(result.structured_output);
      usage = result.usage ?? {};
    }
    if (!text.trim()) throw Error("로컬 도구가 빈 결과를 반환했습니다.");
    let response: Record<string, unknown>;
    if (search) {
      const found = extractLocalJson(text) as { summary?: string; sources?: { title: string; url: string; snippet?: string }[] };
      response = { content: [{ type: "text", text: String(found.summary ?? "") }, ...(Array.isArray(found.sources) ? found.sources : []).filter(s => /^https?:\/\//.test(s.url)).map(s => ({ type: "local_search_candidate", title: s.title, url: s.url, cited_text: `로컬 CLI 제안 URL · 원문 검증 전\n${s.snippet ?? ""}` }))], usage };
    } else response = { content: schema ? localStructuredContent(text) : [{ type: "text", text }], usage };
    await writeFile(path.join(dir, "status.json"), JSON.stringify({ agent, model, search, images: images.length, completed: true, at: new Date().toISOString() }));
    return response;
  } catch (error) {
    if (jobDir) await writeFile(path.join(jobDir, "status.json"), JSON.stringify({ agent, model, completed: false, at: new Date().toISOString() })).catch(()=>undefined);
    throw error;
  }
  });
}
