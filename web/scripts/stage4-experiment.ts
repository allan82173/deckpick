/**
 * 3차 4단계 · 고정 조사 비교 실험.
 *   cache <taskId>                 과제별 조사 1회(근거 추출 medium) + 같은 검색·원문으로 근거 추출 low 재생(6단계 비교용)
 *   run <cacheFile> <A|B|C> <rep>  캐시된 근거표로 판단 이후 단계만 실행
 *   blind                          결과를 run-NN.pptx로 섞어 내보내고, 대응표·빈 평가 CSV 생성
 *   all [reps=3]                   위 단계를 자식 프로세스로 동시 3개씩 실행(조건별 effort 격리). 완료된 캐시·실행은 건너뛰고, 실패한 실행은 기록을 남긴 채 1회만 다시 시도
 * 유료 실행은 사용자 승인 후에만 한다. 모든 결과는 output/stage4/ 아래에 남고 실패도 덮어쓰지 않는다.
 */
import { readFile, writeFile, mkdir, readdir, copyFile, appendFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { prepareTask, runResearch, createStoryline } from "../src/lib/research-pipeline";
import { research, generateCandidates } from "../src/lib/ai";
import { readOriginalPage } from "../src/lib/source-pages";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { plannedFirstLayouts } from "../src/lib/candidate-plan";
import { mapConcurrent } from "../src/lib/concurrency";
import { withExecution } from "../src/lib/execution-scope";
import { withRunContext, runState } from "../src/lib/run-checkpoints";
import { saveAttemptReport } from "../src/lib/run-attempt-report";
import { inputUsage } from "../src/lib/usage-estimate";
import { claimVerification } from "../src/lib/benchmark-gates";
import { exportDeck } from "../src/lib/export";
import { design } from "../src/lib/design";
import { GENERATION_CONFIG } from "../src/lib/generation-config";
import { conditionEfforts, applyEfforts, defaultEfforts } from "../src/lib/experiment-conditions";
import type { Deck, DeckInput, ChatMessage, Source } from "../src/lib/model";
import type { ResearchRecord } from "../src/lib/evidence-model";

type Fixture = { id: string; input: DeckInput; attachment: string };
type Cache = { cacheId: string; taskId: string; createdAt: string; input: DeckInput; attachment: string; messages: ChatMessage[]; sources: Source[]; researchRecord: ResearchRecord; searches: Record<string, Awaited<ReturnType<typeof research>>>; pages: Record<string, Awaited<ReturnType<typeof readOriginalPage>>>; metrics: Record<string, unknown> };
const root = "output/stage4", priv = root + "/private";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const original = defaultEfforts();
function connection() {
  const key = process.env.OPENAI_API_KEY; if (!key) throw Error("로컬 키가 설정되지 않았습니다.");
  const c = { provider: "openai" as const, key, model: process.env.OPENAI_MODEL ?? "gpt-6-luna" };
  if (c.model !== "gpt-6-luna") throw Error("현재 Luna 설정을 유지해야 합니다."); return c;
}
const summarize = (calls: Parameters<typeof inputUsage>[0]) => { const usage = inputUsage(calls); return { calls: calls.length, inputTokens: usage.total, usage, outputTokens: calls.reduce((n, call) => n + (call.outputTokens ?? 0), 0) }; };

async function cache(taskId: string) {
  const fixture = (JSON.parse(await readFile("tests/fixtures/general-decks-v3.json", "utf8")) as Fixture[]).find(f => f.id === taskId);
  if (!fixture) throw Error("과제 ID를 찾지 못했습니다: " + taskId);
  const c = connection(), cacheId = "cache-" + taskId + "-" + randomUUID().slice(0, 8);
  const messages: ChatMessage[] = [{ role: "user", text: fixture.input.purpose, createdAt: new Date().toISOString() }];
  const searches: Cache["searches"] = {}, pages: Cache["pages"] = {};
  const recordSearch: typeof research = async (conn, query) => { const found = await research(conn, query); searches[query.toLowerCase()] = found; return found; };
  const recordPage: typeof readOriginalPage = async url => { const page = await readOriginalPage(url); pages[url] = page; return page; };
  applyEfforts(original);
  const started = performance.now();
  const measured = await withRunContext(cacheId, () => withExecution(async () => {
    const prepared = await prepareTask(c, fixture.input, fixture.attachment, messages);
    return { prepared, researched: await runResearch(c, fixture.input, prepared, fixture.attachment, messages, [], { search: recordSearch, readPage: recordPage }) };
  }), { fresh: true });
  const medium = { durationMs: Math.round(performance.now() - started), ...summarize(measured.execution.calls), verification: claimVerification(measured.result.researched.researchRecord.evidence) };
  // 6단계 비교: 같은 검색·원문으로 근거 추출만 low. 캐시에 없는 후속 검색어는 실제 검색하고 miss로 센다.
  let misses = 0;
  const replaySearch: typeof research = async (conn, query) => searches[query.toLowerCase()] ?? (misses++, research(conn, query));
  const replayPage: typeof readOriginalPage = async url => pages[url] ?? readOriginalPage(url);
  applyEfforts({ ...original, evidence: "low" });
  const lowStarted = performance.now();
  const low = await withRunContext(cacheId + "-extract-low", () => withExecution(() => runResearch(c, fixture.input, measured.result.prepared, fixture.attachment, messages, [], { search: replaySearch, readPage: replayPage })), { fresh: true });
  applyEfforts(original);
  const extractionLow = { durationMs: Math.round(performance.now() - lowStarted), ...summarize(low.execution.calls), verification: claimVerification(low.result.researchRecord.evidence), searchMisses: misses };
  const data: Cache = { cacheId, taskId, createdAt: new Date().toISOString(), input: fixture.input, attachment: fixture.attachment, messages, sources: measured.result.researched.sources, researchRecord: measured.result.researched.researchRecord, searches, pages, metrics: { medium, extractionLow, evidenceHash: hash(measured.result.researched.researchRecord.evidence), configVersion: GENERATION_CONFIG.version } };
  await mkdir(root + "/cache", { recursive: true });
  await writeFile(`${root}/cache/${cacheId}.json`, JSON.stringify(data), { mode: 0o600 });
  console.log(JSON.stringify({ cacheId, medium, extractionLow }));
}

async function run(cacheFile: string, condition: "A" | "B" | "C", rep: string) {
  if (!["A", "B", "C"].includes(condition)) throw Error("조건은 A/B/C입니다.");
  const data = JSON.parse(await readFile(cacheFile, "utf8")) as Cache, c = connection();
  const id = `s4-${data.taskId}-${condition}-${rep}-${randomUUID().slice(0, 8)}`, directory = `${priv}/runs/${id}`;
  await mkdir(directory, { recursive: true });
  const record = structuredClone(data.researchRecord);
  let deck: Deck = { id, input: data.input, designSystem: design(data.input.designSystemId), research: data.sources, researchRecord: record, outline: [], chat: { setup: data.messages, outline: [], slides: {} }, candidates: {}, picked: {}, edited: {}, demo: false };
  applyEfforts(conditionEfforts(condition));
  const started = performance.now(); let failure = "", phase = "storyline", calculationIssues: unknown[] = [];
  const measured = await withRunContext(id, () => withExecution(async () => {
    try {
      const story = await createStoryline(c, data.input, data.messages, [], { ...record, acceptedLimits: true, requiresReview: false });
      deck.outline = story.outlineDraft; deck.researchRecord = story.researchRecord; calculationIssues = story.calculationIssues;
      phase = "candidates";
      const outcomes = await mapConcurrent(deck.outline, async item => {
        const slides = await generateCandidates(c, data.input, item, deck.research, "4단계 고정 조사 비교", [], true, deck.outline, data.attachment, 0, [], [], undefined, deck.researchRecord?.evidence, plannedFirstLayouts(data.input,deck.outline).slice(0,item.index), { record: deck.researchRecord });
        deck.candidates[item.index] = slides; deck.picked[item.index] = 0; return item.index;
      });
      const errors = outcomes.filter(o => o.status === "rejected");
      if (errors.length) throw Error(errors.map(o => o.status === "rejected" ? (o.reason instanceof Error ? o.reason.message : String(o.reason)) : "").join(" / "));
      phase = "review";
      const reviewed = await reviewAndRepairDeck(c, deck);
      for (const replacement of reviewed.replacements) deck.candidates[replacement.index][0] = replacement.slide;
      deck.review = reviewed.review; if (reviewed.review.status === "incomplete") failure = "덱 검토 미완료";
    } catch (error) { failure = error instanceof Error ? error.message : "알 수 없는 실패"; }
    deck.generation = await runState(failure ? "failed" : "complete", failure || undefined);
  }), { fresh: true });
  applyEfforts(original);
  deck.execution = measured.execution;
  const durationMs = Math.round(performance.now() - started), totals = summarize(measured.execution.calls);
  const warnings = deck.outline.reduce((n, item) => n + (deck.candidates[item.index]?.[0]?.quality?.warnings.length ?? 0), 0);
  await saveAttemptReport(deck, "stage4-run", failure ? 504 : 200, failure || undefined);
  const metrics = { id, taskId: data.taskId, cacheId: data.cacheId, condition, rep, efforts: conditionEfforts(condition), completed: !failure, phase, failure, durationMs, ...totals, evidenceHash: hash(record.evidence), cacheEvidenceHash: (data.metrics as { evidenceHash: string }).evidenceHash, reviewStatus: deck.review?.status, reviewIssues: deck.review?.issues.length, qualityWarnings: warnings, calculationIssues, configVersion: GENERATION_CONFIG.version };
  await writeFile(`${directory}/metrics.json`, JSON.stringify(metrics, null, 2), { mode: 0o600 });
  await writeFile(`${directory}/deck.json`, JSON.stringify(deck), { mode: 0o600 });
  if (!failure) { const pptx = await exportDeck(deck, false); await pptx.writeFile({ fileName: `${directory}/deck.pptx` }); }
  console.log(JSON.stringify(metrics));
}

async function blind() {
  const runs = (await readdir(priv + "/runs").catch(() => [] as string[])).sort();
  const done: { id: string; metrics: Record<string, unknown> }[] = [];
  for (const id of runs) { try { const metrics = JSON.parse(await readFile(`${priv}/runs/${id}/metrics.json`, "utf8")); if (metrics.completed) done.push({ id, metrics }); } catch { /* 미완료 실행은 지표 표에만 남는다 */ } }
  const order = done.map(value => ({ value, key: Math.random() })).sort((a, b) => a.key - b.key).map(item => item.value);
  await mkdir(root + "/blind", { recursive: true });
  const mapping: Record<string, unknown>[] = [];
  for (const [index, item] of order.entries()) {
    const name = `run-${String(index + 1).padStart(2, "0")}`;
    await copyFile(`${priv}/runs/${item.id}/deck.pptx`, `${root}/blind/${name}.pptx`);
    mapping.push({ blind: name, runId: item.id, taskId: item.metrics.taskId, condition: item.metrics.condition, rep: item.metrics.rep });
  }
  await writeFile(`${priv}/mapping.json`, JSON.stringify(mapping, null, 2), { mode: 0o600 });
  const header = "run,근거(1-5),타깃(1-5),실행(1-5),장표(1-5),사실 구분(1-5),메모";
  await writeFile(`${root}/blind/human-evaluation.csv`, "﻿" + [header, ...mapping.map(m => `${m.blind},,,,,,`)].join("\r\n") + "\r\n");
  console.log(JSON.stringify({ exported: mapping.length, skippedIncomplete: runs.length - done.length }));
}

function child(args: string[], log: string): Promise<number> {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, ["--env-file=.env.local", "--import", "tsx", "scripts/stage4-experiment.ts", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    const write = (chunk: Buffer) => { void appendFile(log, chunk); };
    proc.stdout.on("data", write); proc.stderr.on("data", write);
    proc.on("close", code => resolve(code ?? 1));
  });
}
async function all(reps: number) {
  const tasks = (JSON.parse(await readFile("tests/fixtures/general-decks-v3.json", "utf8")) as Fixture[]).map(f => f.id);
  await mkdir(root + "/logs", { recursive: true }); await mkdir(priv + "/runs", { recursive: true });
  const status = async (line: string) => { console.log(line); await appendFile(root + "/logs/progress.log", new Date().toISOString() + " " + line + "\n"); };
  const cacheFor = async (task: string) => (await readdir(root + "/cache").catch(() => [] as string[])).find(name => name.startsWith(`cache-${task}-`));
  await mapConcurrent(tasks, async task => {
    if (await cacheFor(task)) return status(`cache ${task} 재사용`);
    await status(`cache ${task} 시작`); const code = await child(["cache", task], `${root}/logs/cache-${task}.log`); await status(`cache ${task} 종료 ${code}`);
  }, 3);
  const jobs: { task: string; condition: "A" | "B" | "C"; rep: string }[] = [];
  for (let rep = 1; rep <= reps; rep++) for (const task of tasks) for (const condition of ["A", "B", "C"] as const) jobs.push({ task, condition, rep: String(rep) });
  const completed = async (job: typeof jobs[number]) => { for (const id of await readdir(priv + "/runs").catch(() => [] as string[])) { if (!id.startsWith(`s4-${job.task}-${job.condition}-${job.rep}-`)) continue; try { if (JSON.parse(await readFile(`${priv}/runs/${id}/metrics.json`, "utf8")).completed) return true; } catch { /* 진행 중이거나 실패한 실행 */ } } return false; };
  await mapConcurrent(jobs, async job => {
    const file = await cacheFor(job.task); if (!file) return status(`run ${job.task} ${job.condition} ${job.rep} 건너뜀 · 캐시 없음`);
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (await completed(job)) return status(`run ${job.task} ${job.condition} ${job.rep} 완료됨`);
      await status(`run ${job.task} ${job.condition} ${job.rep} 시도 ${attempt}`);
      const code = await child(["run", `${root}/cache/${file}`, job.condition, job.rep], `${root}/logs/run-${job.task}-${job.condition}-${job.rep}.log`);
      await status(`run ${job.task} ${job.condition} ${job.rep} 종료 ${code}`);
    }
  }, 3);
  await blind(); await status("blind 완료");
}

const [mode, ...args] = process.argv.slice(2);
const job = mode === "cache" ? cache(args[0]) : mode === "run" ? run(args[0], args[1] as "A" | "B" | "C", args[2] ?? "1") : mode === "blind" ? blind() : mode === "all" ? all(Number(args[0] ?? 3)) : Promise.reject(Error("사용법: cache <taskId> | run <cacheFile> <A|B|C> <rep> | blind | all [reps]"));
void job.catch(error => { console.error(error instanceof Error ? error.message : "실패"); process.exitCode = 1; });
