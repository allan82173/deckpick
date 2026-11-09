/**
 * 근거 공백 수정 확인 실행(2026-11-09). 유료 실행은 사용자 승인 후에만 한다.
 * 같은 과제의 기존 과제 해석·조사 계획(체크포인트)을 그대로 쓰고 조사 단계(runResearch)만 새 코드로 다시 돌린다.
 *   node --env-file=.env.local --import tsx scripts/evidence-check.ts <기존 실행 체크포인트 폴더> <기존 실행 리포트 JSON>
 * 결과는 output/evidence-gap/check-<시각>.json·.md에 남기고, 실패해도 기록을 남긴다(덮어쓰지 않음).
 */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { runResearch } from "../src/lib/research-pipeline";
import { withExecution } from "../src/lib/execution-scope";
import { withRunContext } from "../src/lib/run-checkpoints";
import { inputUsage } from "../src/lib/usage-estimate";
import { GENERATION_CONFIG } from "../src/lib/generation-config";
import { taskFingerprint } from "../src/lib/task-analysis";
import type { DeckInput, ChatMessage } from "../src/lib/model";
import type { ResearchRecord } from "../src/lib/evidence-model";

const out = "output/evidence-gap", stamp = new Date().toISOString().replace(/[:.]/g, "-");
function connection() {
  const key = process.env.OPENAI_API_KEY; if (!key) throw Error("로컬 키가 설정되지 않았습니다.");
  const c = { provider: "openai" as const, key, model: process.env.OPENAI_MODEL ?? "gpt-6-luna" };
  if (c.model !== "gpt-6-luna") throw Error("현재 Luna 설정을 유지해야 합니다."); return c;
}
type Summary = { evidence: number; verified: number; byMethod: Record<string, number>; coverage: Record<string, string>; gaps: number; warnings: Record<string, number>; pagesOpened: number; pagesFailed: number };
function summary(record: Partial<ResearchRecord> & { evidence: ResearchRecord["evidence"] }): Summary {
  const pub = record.evidence.filter(e => e.kind === "공개 사실"), count = (xs: string[]) => xs.reduce<Record<string, number>>((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {});
  return { evidence: pub.length, verified: pub.filter(e => e.verificationStatus === "원문 확인").length, byMethod: count(pub.filter(e => e.verificationStatus === "원문 확인").map(e => e.verificationMethod ?? "인용(기존)")), coverage: Object.fromEntries((record.coverage ?? []).map(c => [c.questionId, `${c.status} (정확 ${c.exactSources}·부분 ${c.partialSources})`])), gaps: record.gaps?.length ?? 0, warnings: count((record.evidenceWarnings ?? []).map(w => w.reason.split("·")[0].trim())), pagesOpened: (record.originalPages ?? []).filter(p => p.opened).length, pagesFailed: (record.originalPages ?? []).filter(p => !p.opened).length };
}
async function main() {
  const [runDir, reportFile] = process.argv.slice(2); if (!runDir || !reportFile) throw Error("사용법: evidence-check.ts <체크포인트 폴더> <리포트 JSON>");
  const checkpoints = await Promise.all((await readdir(runDir)).filter(f => f.endsWith(".checkpoint.json")).map(async f => JSON.parse(await readFile(path.join(runDir, f), "utf8"))));
  const analysis = checkpoints.find(c => c.stage === "task-analysis")?.result, plan = checkpoints.find(c => c.stage === "research-plan")?.result;
  if (!analysis || !plan) throw Error("기존 과제 해석·조사 계획 체크포인트를 찾지 못했습니다.");
  // 리포트 경로 대신 파일 이름 일부(예: 실행 해시)를 주면 output/run-reports에서 찾는다.
  const reportPath = await readFile(reportFile, "utf8").then(() => reportFile, async () => { const name = (await readdir("output/run-reports")).find(f => f.includes(reportFile) && f.endsWith(".json")); if (!name) throw Error("기존 실행 리포트를 찾지 못했습니다: " + reportFile); return path.join("output/run-reports", name); });
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const before = { evidence: report.evidence?.filter((e: { kind: string }) => e.kind === "공개 사실").length, verified: report.evidence?.filter((e: { kind: string; verificationStatus?: string }) => e.kind === "공개 사실" && e.verificationStatus === "원문 확인").length, coverage: Object.fromEntries((report.research?.coverage ?? []).map((c: { questionId: string; status: string; exactSources: number; partialSources: number }) => [c.questionId, `${c.status} (정확 ${c.exactSources}·부분 ${c.partialSources})`])), warnings: (report.research?.evidenceWarnings ?? []).reduce((m: Record<string, number>, w: { reason: string }) => { const k = w.reason.split("·")[0].trim(); m[k] = (m[k] ?? 0) + 1; return m; }, {}), research: report.execution?.stages?.research, evidenceStage: report.execution?.stages?.evidence, planStage: report.execution?.stages?.planResearch };
  const input: DeckInput = { topic: report.topic, purpose: "최종 발표 · 근거 확인 실행", slideCount: analysis.slideCount ?? 20, deckType: "consulting", designSystemId: "ict-forest", stage: analysis.stage === "최종" ? "final" : undefined } as DeckInput;
  const messages: ChatMessage[] = [];
  // 기존 실행의 원래 입력·대화는 리포트에 남지 않으므로(비공개 값 보호), 같은 과제 해석을 이 확인 실행의 입력에 묶어 재사용한다.
  analysis.fingerprint = taskFingerprint(input, "", messages);
  const record: ResearchRecord = { analysis, plan, evidence: [], searchStatus: "not-requested", query: "", notice: "" } as ResearchRecord;
  await mkdir(out, { recursive: true });
  const id = "evidence-check-" + randomUUID().slice(0, 8), started = performance.now();
  let result: Awaited<ReturnType<typeof runResearch>> | undefined, error: string | undefined, calls: Parameters<typeof inputUsage>[0] = [];
  try {
    const measured = await withRunContext(id, () => withExecution(() => runResearch(connection(), input, record, "", messages)), { fresh: true });
    result = measured.result; calls = measured.execution.calls;
  } catch (e) { error = e instanceof Error ? e.message : String(e); }
  const usage = inputUsage(calls), after = result ? summary(result.researchRecord) : undefined;
  const data = { id, createdAt: new Date().toISOString(), topic: report.topic, durationMs: Math.round(performance.now() - started), config: { research: GENERATION_CONFIG.research, excerpt: GENERATION_CONFIG.efficiency.excerptCharactersPerPage }, usage: { calls: calls.length, inputTokens: usage.total, outputTokens: calls.reduce((n, c) => n + (c.outputTokens ?? 0), 0), searchCalls: calls.filter(c => /research/.test(String((c as { stage?: string }).stage ?? ""))).length }, before, after, error, evidence: result?.researchRecord.evidence.map(e => ({ id: e.id, q: e.questionIds, claim: e.claim, url: e.url, status: e.verificationStatus, method: e.verificationMethod, context: e.contextMatch })) };
  await writeFile(`${out}/check-${stamp}.json`, JSON.stringify(data, null, 1));
  const line = (k: string, a: unknown, b: unknown) => `| ${k} | ${typeof a === "object" ? JSON.stringify(a) : a ?? "-"} | ${typeof b === "object" ? JSON.stringify(b) : b ?? "-"} |`;
  const md = [`# 근거 확인 실행 ${stamp}`, "", error ? `실패: ${error}` : "완료", "", "| 항목 | 수정 전(오늘 실행) | 수정 후 |", "|---|---|---|",
    line("공개 근거 행", before.evidence, after?.evidence), line("원문 확인 행", before.verified, after?.verified), line("확인 방식", "-", after?.byMethod), line("질문별 범위", before.coverage, after?.coverage), line("근거 부족 질문", Object.values(before.coverage).filter(v => String(v).startsWith("insufficient")).length, after?.gaps), line("경고 사유", before.warnings, after?.warnings), line("원문 열기 성공/실패", "-", after ? `${after.pagesOpened}/${after.pagesFailed}` : "-"),
    line("조사 입력 토큰(조사+근거+계획)", (before.research?.inputTokens ?? 0) + (before.evidenceStage?.inputTokens ?? 0) + (before.planStage?.inputTokens ?? 0), data.usage.inputTokens), line("출력 토큰", (before.research?.outputTokens ?? 0) + (before.evidenceStage?.outputTokens ?? 0) + (before.planStage?.outputTokens ?? 0), data.usage.outputTokens), line("소요 시간(초)", before.research ? Math.round(before.research.durationMs / 1000) + " (조사 단계 누적)" : "-", Math.round(data.durationMs / 1000))].join("\n");
  await writeFile(`${out}/check-${stamp}.md`, md);
  console.log(md);
  if (error) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
