import test from "node:test";
import assert from "node:assert/strict";
import { allZeroChart, visibleQaStatus } from "../src/lib/slide-quality";
import { makeScene } from "../src/lib/scene";
import { forest } from "../src/lib/design";
import { demoCandidates } from "../src/lib/demo";
import type { DeckInput, OutlineItem } from "../src/lib/model";

test("값이 모두 0인 차트를 잡고 실제 수치 차트는 통과시킨다", () => {
  assert.equal(allZeroChart({ categories: ["디지털 편의성", "가격 가치", "오프라인 경험"], series: [{ name: "대학생 행동 근거", values: [0, 0, 0] }, { name: "실제 지불", values: [0, 0, 0] }] }), true);
  assert.equal(allZeroChart({ series: [{ name: "독서율", values: [32.3, 19.4, 3.7] }] }), false);
  assert.equal(allZeroChart({ responses: [{ label: "A", percent: 0 }, { label: "B", percent: 0 }] }), true);
  assert.equal(allZeroChart({ title: "숫자 없음" }), false);
});

test("화면 본문의 원문 확인·검수 상태 문구를 찾는다", () => {
  assert.deepEqual(visibleQaStatus({ note: "2023년 성인 기준 · 제공된 자료 요약 수치 · 원문 · 페이지 확인 전" }).length, 1);
  assert.equal(visibleQaStatus({ items: ["YES24 크레마클럽 사례 [원문 미확인]"] }).length, 1);
  assert.equal(visibleQaStatus({ items: ["2025 국민 독서실태 조사 · 문화체육관광부"] }).length, 0);
});

test("근거 ID 번호는 내부 검토 모드에서만 화면에 보이고, 출처 이름은 항상 보인다", () => {
  const input: DeckInput = { deckType: "consulting", designSystemId: "ict-forest", topic: "출처 표시", purpose: "검증", slideCount: 6 };
  const item: OutlineItem = { index: 2, section: "근거", message: "출처 표시를 확인합니다", contentHint: "" };
  const base = { ...demoCandidates(input, item)[0], evidenceRefs: ["115", "116"], sources: [{ title: "2025 국민 독서실태 조사", url: "https://example.org/report" }] };
  const texts = (internalReview: boolean) => makeScene({ ...base, internalReview }, forest, 3, input.topic).nodes.map(node => node.kind === "text" ? node.text : "").join("|");
  assert.doesNotMatch(texts(false), /\[115\]/);
  assert.match(texts(false), /출처: 2025 국민 독서실태 조사/);
  assert.match(texts(true), /\[115\]\[116\]/);
});

test("사진 없는 표지에 '이미지 자리' 안내 문구를 내보내지 않는다", () => {
  const input: DeckInput = { deckType: "consulting", designSystemId: "ict-forest", topic: "교보문고 현황 진단", purpose: "검증", slideCount: 6 };
  const cover = demoCandidates(input, { index: 0, section: "표지", message: "교보문고 현황 진단", contentHint: "" }).find(slide => slide.layoutId === "c-cover" && (slide.data as { coverStyle?: string }).coverStyle === "photo");
  if (!cover) return;
  const data = { ...(cover.data as Record<string, unknown>) }; delete data.photoId; delete data.referencePhoto;
  const text = makeScene({ ...cover, data }, forest, 1, input.topic).nodes.map(node => node.kind === "text" ? node.text : "").join("|");
  assert.doesNotMatch(text, /이미지 자리/);
});

test("2차 실행에서 새로 나온 편법(0/1 지표 차트, 출처 개수 본문)을 잡는다", () => {
  assert.equal(allZeroChart({ categories: ["디지털 접근성", "가격 가치", "오프라인 경험"], series: [{ name: "검증할 가설 항목", values: [1, 1, 1] }, { name: "대학생 행동으로 확인된 항목", values: [0, 0, 0] }] }), true);
  assert.equal(allZeroChart({ series: [{ name: "매출", values: [717.25, 869.89] }] }), false);
  assert.equal(visibleQaStatus({ rows: [{ label: "직접 부합 출처", value: "0 건" }] }).length, 1);
  assert.equal(visibleQaStatus({ text: "근거 수준을 구분해 해석" }).length, 0);
});

test("큰 응답 단계는 개별 호출 대기 시간이 길고, 작은 단계는 기본값을 쓴다", async () => {
  const { GENERATION_CONFIG } = await import("../src/lib/generation-config");
  const byStage = GENERATION_CONFIG.providerTimeoutMsByStage as Record<string, number | undefined>;
  assert.ok((byStage.story ?? 0) >= 180000);
  assert.ok((byStage.story ?? 0) < GENERATION_CONFIG.reliability.deadlines.storyline);
  assert.equal(byStage.candidates, undefined);
  assert.equal(GENERATION_CONFIG.providerTimeoutMs, 75000);
});

test("3차 실행: 계열·범주가 뒤바뀐 차트를 잡는다", async () => {
  const { swappedSeriesChart } = await import("../src/lib/slide-quality");
  assert.equal(swappedSeriesChart({ categories: ["독서 경험률 (%)", "문화·스포츠 관람률 (%)"], series: [{ name: "독서 경험률", values: [48.7, 48.7] }, { name: "문화·스포츠 관람률", values: [57.7, 57.7] }] }), true);
  assert.equal(swappedSeriesChart({ categories: ["2024", "2025"], series: [{ name: "교보문고", values: [9770, 9900] }, { name: "예스24", values: [6558, 6400] }] }), false);
  assert.equal(swappedSeriesChart({ series: [{ name: "단일", values: [3, 3] }] }), false);
});

test("하단 출처는 발행처·자료명만 짧게, 3건 넘으면 외 N건", async () => {
  const { shortSources } = await import("../src/lib/scene");
  assert.equal(shortSources(["2024 출판시장 통계 보고서 — 주요 서점 실적", "KT 밀리의서재(418470) - 사용 84% 가 손판감", "2025 사회조사 결과 (복지, 사회참여, 여가)"]), "2024 출판시장 통계 보고서 · KT 밀리의서재 · 2025 사회조사 결과");
  assert.match(shortSources(["A 자료", "B 자료", "C 자료", "D 자료", "E 자료"]), /외 2건$/);
  assert.equal(shortSources(["같은 자료 — 1부", "같은 자료 — 2부"]), "같은 자료");
});
