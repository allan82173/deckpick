/** 4단계 지표 요약. 사람 평가 점수는 다루지 않으며(채점 전 점수를 만들지 않는다), blind 대응표도 출력하지 않는다. */
import { readFile, readdir, writeFile } from "node:fs/promises";
const root = "output/stage4", priv = root + "/private";
type Metrics = { id: string; taskId: string; condition: string; rep: string; completed: boolean; failure: string; durationMs: number; calls: number; inputTokens: number; outputTokens: number; usage: { estimatedCalls: number; unestimatedCalls: number }; evidenceHash: string; cacheEvidenceHash: string; reviewStatus?: string; reviewIssues?: number; qualityWarnings: number; calculationIssues: { status: string }[] };
const stat = (values: number[]) => values.length ? { mean: values.reduce((a, b) => a + b, 0) / values.length, min: Math.min(...values), max: Math.max(...values) } : undefined;
const fmt = (s: ReturnType<typeof stat>, digits = 0, scale = 1) => s ? `${(s.mean / scale).toFixed(digits)} (${(s.min / scale).toFixed(digits)}~${(s.max / scale).toFixed(digits)})` : "-";
async function main() {
  const runs: Metrics[] = [];
  for (const id of await readdir(priv + "/runs").catch(() => [] as string[])) { try { runs.push(JSON.parse(await readFile(`${priv}/runs/${id}/metrics.json`, "utf8"))); } catch { /* 진행 중 */ } }
  const caches: { taskId: string; metrics: { medium: { verification: { claims: number; verified: number }; inputTokens: number; calls: number; durationMs: number }; extractionLow: { verification: { claims: number; verified: number }; inputTokens: number; searchMisses: number } } }[] = [];
  for (const name of await readdir(root + "/cache").catch(() => [] as string[])) caches.push(JSON.parse(await readFile(`${root}/cache/${name}`, "utf8")));
  const lines = ["# 3차 4단계 · 고정 조사 비교 지표", "", `생성 ${new Date().toISOString()} · 실행 기록 ${runs.length}개(실패 포함) · 사람 평가 점수 없음(채점 전)`, "", "## 조건별 (평균, 최소~최대) · 완료 실행 기준", "", "|조건|완료/시도|분|호출|입력 토큰(천)|출력 토큰(천)|검토 지적|품질 경고|계산 제거|", "|---|---|---|---|---|---|---|---|---|"];
  for (const condition of ["A", "B", "C"]) {
    const all = runs.filter(r => r.condition === condition), done = all.filter(r => r.completed);
    lines.push(`|${condition}|${done.length}/${all.length}|${fmt(stat(done.map(r => r.durationMs)), 1, 60000)}|${fmt(stat(done.map(r => r.calls)))}|${fmt(stat(done.map(r => r.inputTokens)), 0, 1000)}|${fmt(stat(done.map(r => r.outputTokens)), 0, 1000)}|${fmt(stat(done.map(r => r.reviewIssues ?? 0)), 1)}|${fmt(stat(done.map(r => r.qualityWarnings)), 1)}|${done.reduce((n, r) => n + r.calculationIssues.filter(i => i.status === "removed").length, 0)}|`);
  }
  lines.push("", "## 같은 캐시의 근거표 동일성", "", ...[...new Set(runs.map(r => r.taskId))].sort().map(task => { const hashes = new Set(runs.filter(r => r.taskId === task).map(r => r.evidenceHash)); const cache = runs.find(r => r.taskId === task)?.cacheEvidenceHash; return `- ${task}: 실행 ${runs.filter(r => r.taskId === task).length}개, 서로 다른 근거표 해시 ${hashes.size}개, 캐시와 일치 ${[...hashes].every(h => h === cache) ? "예" : "아니오"}`; }));
  lines.push("", "## 근거 추출 effort 비교 (6단계 입력) · 같은 검색·원문 재생", "", "|과제|medium 원문 확인/주장|low 원문 확인/주장|medium 입력|low 입력|low 재생 시 검색 miss|", "|---|---|---|---|---|---|");
  for (const cache of caches.sort((a, b) => a.taskId.localeCompare(b.taskId))) { const m = cache.metrics.medium, l = cache.metrics.extractionLow; lines.push(`|${cache.taskId}|${m.verification.verified}/${m.verification.claims}|${l.verification.verified}/${l.verification.claims}|${m.inputTokens}|${l.inputTokens}|${l.searchMisses}|`); }
  const failures = runs.filter(r => !r.completed);
  lines.push("", "## 실패 기록", "", ...(failures.length ? failures.map(r => `- ${r.id}: ${r.failure}`) : ["- 없음"]));
  lines.push("", "토큰 중 제공자가 사용량을 반환하지 않은 호출은 요청 길이 추정치를 포함한다. 금액은 응답에 없어 계산하지 않는다.");
  await writeFile(root + "/summary.md", lines.join("\n") + "\n"); console.log(lines.join("\n"));
}
void main();
