import { expandedSample } from "./expanded-samples";
import { candidatePlan, candidateSignature } from "./candidate-plan";
import {
  dataSchemas,
  type DeckInput,
  type OutlineItem,
  type LayoutId,
  type SlideSpec,
} from "./model";
import { coverTitle, styleCover } from "./covers";
import { visualSample } from "./visual-samples";
import { analyticalSample } from "./analytical-layouts";
export function demoOutline(input: DeckInput): OutlineItem[] {
  const c = input.deckType === "consulting";
  const sections = c
    ? [
        "표지",
        "목차",
        "현황",
        "문제",
        "원인",
        "해결안",
        "기대효과",
        "실행계획",
        "측정",
        "리스크",
        "정리",
        "결론",
      ]
    : [
        "표지",
        "문제",
        "솔루션",
        "특징",
        "성과",
        "사례",
        "활용",
        "비교",
        "실행",
        "제안",
        "정리",
        "CTA",
      ];
  return Array.from({ length: input.slideCount }, (_, i) => ({
    index: i,
    section: i === input.slideCount - 1 ? (c ? "결론" : "CTA") : (sections[i]??(c?"분석":"제안")),
    message:
      i === 0
        ? input.topic
        : i === input.slideCount - 1
          ? c
            ? "작은 실험으로 실행 가능성을 확인합니다"
            : "지금 첫 번째 시도를 시작하세요"
          : c
            ? ([
                "",
                "발표의 흐름을 먼저 확인합니다",
                "사용자의 현재 경험을 먼저 살펴봅니다",
                "핵심 문제를 하나로 좁혀야 합니다",
                "문제의 원인을 나누어 확인합니다",
                "실행 가능한 대안을 비교합니다",
                "효과를 확인할 지표를 정의합니다",
              ][i] ?? "다음 실행의 우선순위를 정합니다")
            : ([
                "",
                "무엇이 불편한가요?",
                "더 간단한 방법",
                "필요한 기능에 집중",
                "변화의 크기를 확인",
              ][i] ?? "새로운 경험을 제안합니다"),
    contentHint:
      i === 0
        ? `${input.purpose} · ${input.audience || "발표 청중"}`
        : "데모 구성 예시입니다. 실제 조사 내용과 근거를 입력해 주세요.",
  }));
}
export function sampleData(
  id: LayoutId,
  item: OutlineItem,
  variant = 0,
): Record<string, unknown> {
  const analytical = analyticalSample(id);
  if (analytical) return analytical;
  const expanded = expandedSample(id, variant); if (expanded) return expanded;
  const visual = visualSample(id, item.message, variant);
  if (visual) return dataSchemas[id].parse(visual) as Record<string, unknown>;
  const labels = /실행|계획/.test(item.section) ? ["준비", "실행", "확인"] : /현황/.test(item.section) ? ["관찰 현상", "사용자 경험", "확인할 근거"] : /대안|해결|솔루션/.test(item.section) ? ["전략 방향", "실행 조건", "검증 방법"] : ["현재의 문제", "핵심 가설", "다음 실행"];
  const bodies = [
    "사용자 경험을 확인합니다",
    "인터뷰로 원인을 살펴봅니다",
    "작은 실험의 결과를 비교합니다",
  ];
  const d: Partial<Record<LayoutId, Record<string, unknown>>> = {
    "c-cover": {
      title: coverTitle(item.message, variant),
      coverStyle: ["photo", "white", "type"][variant % 3],
      subtitle: ["발표 자료 초안", "문제 정의와 실행 방향", "검토를 위한 제안", "핵심 쟁점과 의사결정", "새로운 관점의 제안", "근거에서 실행으로"][
        variant % 6
      ],
      author: "DeckPick · 데모",
    },
    "c-toc": { items: ["현황과 문제", "대안 검토", "실행 제안"] },
    "c-header-boxes": {
      columns: labels.map((title, i) => ({
        title,
        bullets: [
          bodies[(i + variant) % 3],
          "**근거 확인** 후 내용을 보완합니다",
        ],
      })),
    },
    "c-funnel": {
      steps: labels.map((title, i) => ({ title, body: bodies[i] })),
      chips: ["사용자 관점", "검증 우선"],
    },
    "c-arrow-flow": {
      blocks: labels.map((title, i) => ({ title, body: bodies[i] })),
      chips: ["검토용 가설"],
    },
    "c-metric-cards": {
      rows: ["인지", "참여", "유지"].map((label) => ({
        label,
        value: "확인 필요",
        strong: "기준과 측정 방법을 정합니다",
        sub: "근거 없는 수치를 만들지 않습니다",
      })),
    },
    "c-compare": {
      options: ["대안 A", "대안 B", "대안 C"],
      criteria: ["사용자 가치", "실행 난이도", "검증 방법"],
      cells: [
        ["인터뷰 확인", "인터뷰 확인", "인터뷰 확인"],
        ["검토 필요", "검토 필요", "검토 필요"],
        ["소규모 실험", "소규모 실험", "소규모 실험"],
      ],
      recommended: variant % 3,
    },
    "c-conclusion": {
      points: labels.map((title, i) => ({ title, body: bodies[i] })),
      conclusion: item.message,
    },
    "c-split-insight": { takeaway: item.message, evidence: labels.map((title, i) => ({ title, body: bodies[i] })), implication: "제공한 근거로 가설을 검증하고 다음 실행을 정합니다" },
    "c-matrix": { xAxis: "사용자 가치", yAxis: "실행 가능성", cells: [{ title: "가치·실행 가능성 검토", body: "우선 검토할 방향과 필요한 근거" }, { title: "높은 가치의 조건", body: "실행 제약과 보완할 가정을 확인" }, { title: "작은 실험", body: "제한된 범위에서 가능성을 확인" }, { title: "추가 확인", body: "비교 기준과 근거를 보완" }], highlight: variant % 4, implication: "정성적 검토 프레임 예시이며 실제 평가 결과가 아닙니다" },
    "c-timeline": { steps: [{ label: "준비", title: "범위와 기준 합의", body: "목표와 확인할 자료를 정리합니다" }, { label: "실행", title: "작은 범위에서 검토", body: "가설과 실행 조건을 확인합니다" }, { label: "확인", title: "결과와 다음 행동", body: "근거를 비교하고 후속 실행을 정합니다" }] },
    "m-cover": {
      product: item.message,
      tagline: ["더 나은 경험을 위한 첫 번째 제안", "사용자의 일상에서 시작하는 변화", "작은 시도에서 새로운 가치로", "핵심 경험에 집중한 제안", "새로운 관점으로 만나는 브랜드", "다음 행동을 위한 한 가지 약속"][variant % 6],
      image: "사용자가 서비스를 이용하는 장면",
    },
    "m-big-message": {
      message: item.message,
      highlight: "첫 번째 변화",
      sub: "필요한 가치에 집중해 보세요.",
    },
    "m-image-copy": {
      image: "서비스의 핵심 경험을 보여 주는 이미지",
      body: ["사용자가 겪는 불편을 살펴봅니다", "작은 변화부터 시작합니다"],
      imageSide: variant % 2 ? "right" : "left",
    },
    "m-big-number": {
      stats: [
        { value: "확인 필요", label: "검증된 수치를 입력해 주세요" },
        { value: "확인 필요", label: "성과를 확인할 기준" },
      ],
    },
    "m-feature-cards": {
      features: labels.map((title, i) => ({
        icon: String(i + 1),
        title,
        desc: bodies[i],
      })),
    },
    "m-quote-cta": {
      quote: "작은 시도가 더 나은 경험의 시작입니다.",
      person: "데모 카피",
      cta: "함께 시작하세요",
      contact: "연락처를 입력해 주세요",
    },
  };
  return dataSchemas[id].parse(d[id]) as Record<string,unknown>;
}
export function demoCandidates(
  input: DeckInput,
  item: OutlineItem,
  excluded: string[] = [],
  rotation = 0,
  count = 3,
  previousSignatures: string[] = [],
  requestedLayout?:LayoutId,
): SlideSpec[] {
  const ids = candidatePlan(input, item, excluded, rotation, count, requestedLayout);
  return ids.map((layoutId, i) => {
    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate: SlideSpec = styleCover({
        layoutId, section: item.section, headline: item.message,
        data: sampleData(layoutId, item, rotation * 3 + i + attempt), sources: [],
        notes: "데모용 내용입니다. 실제 자료로 교체 후 사용하세요.",
      }, rotation * 3 + i + attempt, input.topic);
      if (layoutId === "c-cover") candidate.headline = String(candidate.data.title);
      if (!previousSignatures.includes(candidateSignature(candidate))) return candidate;
    }
    throw Error("다른 후보를 준비하지 못했습니다. 전체 후보를 다시 만들어 주세요.");
  });
}
