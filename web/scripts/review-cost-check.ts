/**
 * 시간·토큰 절감(③) 비교 실행(2026-11-09). 유료 실행은 사용자 승인 후에만 한다.
 * 기존 실행의 조사 결과·장별 설계(storyline-final, evidence-table 체크포인트)를 그대로 쓰고,
 * 장표 후보 생성 → 시각 검토 → 덱 검토·수정만 새 코드로 다시 돌려 기존 실행 리포트와 단계별로 비교한다.
 *   node --env-file=.env.local --import tsx scripts/review-cost-check.ts <기존 실행 체크포인트 폴더> <기존 실행 리포트 JSON 또는 파일 이름 일부>
 * 결과는 output/review-cost/check-<시각>.json·.md·.pptx에 남기고, 실패해도 기록을 남긴다(덮어쓰지 않음).
 */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { generateCandidates } from "../src/lib/ai";
import { reviewAndRepairDeck } from "../src/lib/deck-review";
import { plannedFirstLayouts, deckLayoutIssue } from "../src/lib/candidate-plan";
import { mapConcurrent } from "../src/lib/concurrency";
import { withExecution } from "../src/lib/execution-scope";
import { withRunContext } from "../src/lib/run-checkpoints";
import { exportDeck } from "../src/lib/export";
import { design } from "../src/lib/design";
import { draftSlide } from "../src/lib/draft-workflow";
import type { Deck, DeckInput } from "../src/lib/model";

const out = "output/review-cost", stamp = new Date().toISOString().replace(/[:.]/g, "-");
const STAGES = ["candidates", "visualReview", "assessDeck", "formatRepair"];
function connection() {
  const key = process.env.OPENAI_API_KEY; if (!key) throw Error("로컬 키가 설정되지 않았습니다.");
  const c = { provider: "openai" as const, key, model: process.env.OPENAI_MODEL ?? "gpt-6-luna" };
  if (c.model !== "gpt-6-luna") throw Error("현재 Luna 설정을 유지해야 합니다."); return c;
}
type Call = { stage: string; startedAt?: string; durationMs?: number; inputTokens?: number; outputTokens?: number; cachedInputTokens?: number; estimatedInputTokens?: number };
function byStage(calls: Call[]) {
  const rows: Record<string, { calls: number; inputTokens: number; outputTokens: number; cachedInputTokens: number; apiMs: number }> = {};
  for (const call of calls) { const r = rows[call.stage] ??= { calls: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, apiMs: 0 }; r.calls++; r.inputTokens += call.inputTokens ?? call.estimatedInputTokens ?? 0; r.outputTokens += call.outputTokens ?? 0; r.cachedInputTokens += call.cachedInputTokens ?? 0; r.apiMs += call.durationMs ?? 0; }
  return rows;
}
// 후보 생성 시작부터 덱 검토 끝까지의 실제 경과 시간(호출 시작·종료 시각 기준).
function wallMs(calls: Call[]) {
  const timed = calls.filter(c => STAGES.includes(c.stage) && c.startedAt).map(c => ({ s: Date.parse(c.startedAt!), e: Date.parse(c.startedAt!) + (c.durationMs ?? 0) }));
  return timed.length ? Math.max(...timed.map(t => t.e)) - Math.min(...timed.map(t => t.s)) : 0;
}
function layoutRepeats(deck: Deck) { const prev: string[] = []; let n = 0; for (const item of deck.outline) { const id = draftSlide(deck, item.index)?.layoutId ?? ""; if (item.index && deckLayoutIssue(id, prev, deck.outline.length)) n++; prev.push(id); } return n; }

async function main() {
  const [runDir, reportArg] = process.argv.slice(2); if (!runDir || !reportArg) throw Error("사용법: review-cost-check.ts <체크포인트 폴더> <리포트>");
  const checkpoints = await Promise.all((await readdir(runDir)).filter(f => f.endsWith(".checkpoint.json")).map(async f => JSON.parse(await readFile(path.join(runDir, f), "utf8"))));
  const story = checkpoints.find(c => c.stage === "storyline-final" && c.status === "complete")?.result, table = checkpoints.find(c => c.stage === "evidence-table" && c.status === "complete")?.result;
  if (!story || !table) throw Error("기존 장별 설계·근거표 체크포인트를 찾지 못했습니다.");
  const reportPath = await readFile(reportArg, "utf8").then(() => reportArg, async () => { const name = (await readdir("output/run-reports")).find(f => f.includes(reportArg) && f.endsWith(".json")); if (!name) throw Error("기존 실행 리포트를 찾지 못했습니다: " + reportArg); return path.join("output/run-reports", name); });
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const input: DeckInput = { topic: report.topic, purpose: "최종 발표 · 검토 비용 비교 실행", slideCount: story.outlineDraft.length, deckType: "consulting", designSystemId: "ict-forest", stage: "final" } as DeckInput;
  const id = "review-cost-" + randomUUID().slice(0, 8);
  let deck: Deck = { id, input, designSystem: design("ict-forest" as never), research: table.sources, researchRecord: story.researchRecord, outline: story.outlineDraft, chat: { setup: [], outline: [], slides: {} }, candidates: {}, picked: {}, edited: {}, demo: false } as Deck;
  await mkdir(out, { recursive: true });
  const c = connection(), started = performance.now(); let failure = "", phase = "candidates", calls: Call[] = [], candidateMs = 0, swaps = 0, replacements = 0;
  try {
    const measured = await withRunContext(id, () => withExecution(async () => {
      const planned = plannedFirstLayouts(input, deck.outline);
      const outcomes = await mapConcurrent(deck.outline, async item => {
        const slides = await generateCandidates(c, input, item, deck.research, "검토 비용 비교 실행", [], true, deck.outline, "", 0, [], [], undefined, deck.researchRecord?.evidence, planned.slice(0, item.index), { record: deck.researchRecord });
        deck.candidates[item.index] = slides; deck.picked[item.index] = 0; return item.index;
      });
      const errors = outcomes.filter(o => o.status === "rejected");
      if (errors.length) throw Error(errors.map(o => o.status === "rejected" ? (o.reason instanceof Error ? o.reason.message : String(o.reason)) : "").join(" / "));
      candidateMs = Math.round(performance.now() - started); phase = "review";
      const reviewed = await reviewAndRepairDeck(c, deck);
      for (const r of reviewed.replacements as { index: number; slide: Deck["candidates"][number][number]; swapWith?: number }[]) {
        const slot = deck.picked[r.index] ?? 0, list = [...deck.candidates[r.index]];
        if (typeof r.swapWith === "number") { list[r.swapWith] = list[slot]; swaps++; }
        list[slot] = r.slide; deck.candidates[r.index] = list; replacements++;
      }
      deck.review = reviewed.review; if (reviewed.review.status === "incomplete") failure = "덱 검토 미완료";
    }), { fresh: true });
    calls = measured.execution.calls as Call[];
  } catch (e) { failure = e instanceof Error ? e.message : String(e); }
  const now = byStage(calls), before = report.execution.stages as Record<string, { calls: number; inputTokens: number; outputTokens: number; durationMs: number }>;
  const beforeCached = byStage(report.execution.calls as Call[]);
  const sum = (rows: Record<string, { inputTokens: number; outputTokens: number }>, key: "inputTokens" | "outputTokens") => STAGES.reduce((n, s) => n + (rows[s]?.[key] ?? 0), 0);
  const visualSkipped = deck.outline.reduce((n, item) => n + (deck.candidates[item.index] ?? []).filter(s => s?.quality?.visual?.status === "skipped").length, 0);
  const warnings = deck.outline.reduce((n, item) => n + (draftSlide(deck, item.index)?.quality?.warnings.length ?? 0), 0);
  const data = { id, createdAt: new Date().toISOString(), topic: report.topic, failure, phase, durationMs: Math.round(performance.now() - started), candidateMs,
    wallMs: { before: wallMs(report.execution.calls as Call[]), after: wallMs(calls) },
    stages: Object.fromEntries(STAGES.map(s => [s, { before: { ...before[s], cachedInputTokens: beforeCached[s]?.cachedInputTokens ?? 0 }, after: now[s] }])),
    totals: { before: { inputTokens: sum(before, "inputTokens"), outputTokens: sum(before, "outputTokens") }, after: { inputTokens: sum(now, "inputTokens"), outputTokens: sum(now, "outputTokens") } },
    quality: { before: { reviewIssues: report.review?.issues?.length, reviewRounds: report.review?.rounds, reviewStatus: report.review?.status }, after: { reviewIssues: deck.review?.issues.length, reviewRounds: deck.review?.rounds, reviewStatus: deck.review?.status, slideWarnings: warnings, layoutRepeats: layoutRepeats(deck), swaps, replacements, visualSkipped } } };
  await writeFile(`${out}/check-${stamp}.json`, JSON.stringify(data, null, 1));
  if (!failure || deck.outline.every(item => deck.candidates[item.index]?.length)) { try { const pptx = await exportDeck(deck, false); await pptx.writeFile({ fileName: `${out}/check-${stamp}.pptx` }); } catch { /* 내보내기 실패는 지표 기록을 막지 않는다 */ } }
  const pct = (a: number, b: number) => a ? `${Math.round((b - a) / a * 100)}%` : "-", k = (n: number) => `${Math.round(n / 1000)}k`;
  const rows = STAGES.map(s => { const b = data.stages[s].before, a = data.stages[s].after; return `| ${s} | ${b?.calls ?? 0}회 · ${k(b?.inputTokens ?? 0)} · 캐시 ${b?.inputTokens ? Math.round((b.cachedInputTokens ?? 0) / b.inputTokens * 100) : 0}% | ${a?.calls ?? 0}회 · ${k(a?.inputTokens ?? 0)} · 캐시 ${a?.inputTokens ? Math.round(a.cachedInputTokens / a.inputTokens * 100) : 0}% | ${pct(b?.inputTokens ?? 0, a?.inputTokens ?? 0)} |`; });
  const md = [`# 검토 비용 비교 실행 ${stamp}`, "", failure ? `실패/미완료: ${failure} (단계 ${phase})` : "완료", "",
    "| 단계 | 기존(호출·입력·캐시) | 이번 | 입력 변화 |", "|---|---|---|---|", ...rows,
    `| 합계 입력 | ${k(data.totals.before.inputTokens)} | ${k(data.totals.after.inputTokens)} | ${pct(data.totals.before.inputTokens, data.totals.after.inputTokens)} |`,
    `| 합계 출력 | ${k(data.totals.before.outputTokens)} | ${k(data.totals.after.outputTokens)} | ${pct(data.totals.before.outputTokens, data.totals.after.outputTokens)} |`,
    `| 경과 시간(후보~검토) | ${Math.round(data.wallMs.before / 1000)}초 | ${Math.round(data.wallMs.after / 1000)}초 | ${pct(data.wallMs.before, data.wallMs.after)} |`, "",
    `품질: 검토 지적 ${data.quality.before.reviewIssues} → ${data.quality.after.reviewIssues}, 검토 라운드 ${data.quality.before.reviewRounds} → ${data.quality.after.reviewRounds}, 레이아웃 규칙 위반 ${data.quality.after.layoutRepeats}장, 후보 교체 ${swaps}장, 다시 만든 장 ${replacements - swaps}장, 시각 검토 생략 후보 ${visualSkipped}개, 장표 경고 ${warnings}건`];
  await writeFile(`${out}/check-${stamp}.md`, md.join("\n"));
  console.log(md.join("\n"));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
