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
