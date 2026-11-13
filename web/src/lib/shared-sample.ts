import type {Deck} from "./model";
// Synthetic data only. No private references, credentials or run records.
export const sharedSample:Deck = {
  "id": "deckpick-synthetic-workflow-v4",
  "input": {
    "topic": "고객지원 접수 업무 개선 시범안",
    "purpose": "내부 업무 개선 제안",
    "audience": "운영팀",
    "deckType": "consulting",
    "designSystemId": "ict-forest",
    "slideCount": 5,
    "language": "ko"
  },
  "designSystem": {
    "id": "ict-forest",
    "name": "숲녹색 컨설팅",
    "font": "Pretendard",
    "colors": {
      "primary": "#244C3C",
      "darkest": "#15291F",
      "textSub": "#2B3A31",
      "muted": "#526158",
      "tint": "#D8E5DC",
      "panel": "#F1F4F2",
      "connector": "#DADFDB",
      "accent": "#3E7D5F",
      "onDarkSub": "#B9CCBF",
      "coverLine": "#8FB8A2",
      "risk": "#9B3B3B"
    }
  },
  "outline": [
    {
      "index": 0,
      "section": "표지",
      "message": "고객지원 접수 업무 개선 시범안",
      "contentHint": "6주 시범안, 상담원 6명, 합성 가정. 개인정보 외부 전송 없음.\n제공된 자료: 가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다. 6주 시범 운영, 상담원 6명. 도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다. 개인정보는 외부 전송하지 않습니다. 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. 모두 합성 가정이며 관측 성과가 아닙니다.",
      "role": "판단",
      "evidenceRefs": [
        "1"
      ],
      "claimType": "추론",
      "contentContract": {
        "version": 1,
        "requirements": [
          {
            "id": "purpose",
            "kind": "fact",
            "quote": "고객지원 접수 업무 개선 시범안",
            "anchors": [
              "고객지원",
              "접수 업무",
              "시범안"
            ],
            "display": "body"
          },
          {
            "id": "scope",
            "kind": "condition",
            "quote": "6주 시범 운영, 상담원 6명.",
            "anchors": [
              "6주",
              "상담원 6명"
            ],
            "display": "body"
          },
          {
            "id": "assumption",
            "kind": "condition",
            "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
            "anchors": [
              "합성 가정",
              "관측 성과"
            ],
            "display": "body"
          },
          {
            "id": "privacy",
            "kind": "condition",
            "quote": "개인정보는 외부 전송하지 않습니다.",
            "anchors": [
              "개인정보",
              "외부 전송"
            ],
            "display": "body"
          },
          {
            "id": "timecalc",
            "kind": "calculation",
            "quote": "가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
            "anchors": [
              "월 400건",
              "건당 12분",
              "건당 8분",
              "월 1,600분"
            ],
            "display": "notes"
          },
          {
            "id": "cost",
            "kind": "condition",
            "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
            "anchors": [
              "도구 비용",
              "월 20만 원",
              "인건비·교육비·구축비",
              "제외"
            ],
            "display": "notes"
          },
          {
            "id": "decision",
            "kind": "decision",
            "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
            "anchors": [
              "처리시간 8분 이하",
              "재문의율",
              "기준 미충족",
              "전면 확대"
            ],
            "display": "notes"
          }
        ],
        "comparisonDimensions": [
          "처리시간",
          "재문의율",
          "도구 비용",
          "개인정보"
        ]
      }
    },
    {
      "index": 1,
      "section": "요약",
      "message": "처리시간과 재문의율 조건을 함께 충족할 때 시범안을 확대합니다",
      "contentHint": "월 400건, 개인정보 외부 전송 없음. 관측 성과가 아닌 가정이라는 조건을 표시. 적용 조건과 반전 조건을 보존.\n제공된 자료: 가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다. 6주 시범 운영, 상담원 6명. 도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다. 개인정보는 외부 전송하지 않습니다. 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. 모두 합성 가정이며 관측 성과가 아닙니다.",
      "role": "판단",
      "evidenceRefs": [
        "1"
      ],
      "claimType": "추론",
      "contentContract": {
        "version": 1,
        "requirements": [
          {
            "id": "assumptions",
            "kind": "condition",
            "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
            "anchors": [
              "합성 가정",
              "관측 성과"
            ],
            "display": "body"
          },
          {
            "id": "time-calculation",
            "kind": "calculation",
            "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
            "anchors": [
              "월 400건",
              "건당 12분",
              "건당 8분",
              "월 1,600분"
            ],
            "display": "body"
          },
          {
            "id": "pilot-scope",
            "kind": "condition",
            "quote": "6주 시범 운영, 상담원 6명.",
            "anchors": [
              "6주",
              "상담원 6명"
            ],
            "display": "body"
          },
          {
            "id": "cost-scope",
            "kind": "condition",
            "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
            "anchors": [
              "월 20만 원",
              "인건비",
              "교육비",
              "구축비"
            ],
            "display": "body"
          },
          {
            "id": "privacy",
            "kind": "condition",
            "quote": "개인정보는 외부 전송하지 않습니다.",
            "anchors": [
              "개인정보",
              "외부 전송"
            ],
            "display": "body"
          },
          {
            "id": "expansion-criteria",
            "kind": "decision",
            "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
            "anchors": [
              "처리시간",
              "8분 이하",
              "재문의율",
              "기존보다 높아지지"
            ],
            "display": "body"
          },
          {
            "id": "reversal",
            "kind": "decision",
            "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
            "anchors": [
              "기준 미충족",
              "전면 확대",
              "보류",
              "원인별"
            ],
            "display": "body"
          },
          {
            "id": "source-status",
            "kind": "fact",
            "quote": "가상 조직의 제공된 실험 조건입니다.",
            "anchors": [
              "가상 조직",
              "실험 조건"
            ],
            "display": "notes"
          }
        ],
        "comparisonDimensions": [
          "처리시간",
          "재문의율",
          "도구 비용",
          "개인정보"
        ]
      }
    },
    {
      "index": 2,
      "section": "비교",
      "message": "현재와 개선안은 같은 업무 범위에서 시간·비용·개인정보 기준으로 비교합니다",
      "contentHint": "비교 축: 처리시간·도구 비용·개인정보. 현재 12분, 개선 8분 가정. 월20만원은 도구 비용만이며 전체 비용으로 해석하지 않음.\n제공된 자료: 가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다. 6주 시범 운영, 상담원 6명. 도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다. 개인정보는 외부 전송하지 않습니다. 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. 모두 합성 가정이며 관측 성과가 아닙니다.",
      "role": "비교",
      "evidenceRefs": [
        "1"
      ],
      "claimType": "추론",
      "contentContract": {
        "version": 1,
        "requirements": [
          {
            "id": "scope",
            "kind": "comparison",
            "quote": "현재와 개선안은 같은 업무 범위에서 시간·비용·개인정보 기준으로 비교합니다",
            "anchors": [
              "같은 업무 범위",
              "시간",
              "비용",
              "개인정보"
            ],
            "display": "body"
          },
          {
            "id": "time",
            "kind": "calculation",
            "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
            "anchors": [
              "월 400건",
              "건당 12분",
              "건당 8분 가정",
              "월 1,600분"
            ],
            "display": "body"
          },
          {
            "id": "pilot",
            "kind": "condition",
            "quote": "6주 시범 운영, 상담원 6명.",
            "anchors": [
              "6주",
              "시범 운영",
              "상담원 6명"
            ],
            "display": "body"
          },
          {
            "id": "cost",
            "kind": "condition",
            "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
            "anchors": [
              "도구 비용",
              "월 20만 원 가정",
              "인건비·교육비·구축비",
              "제외"
            ],
            "display": "body"
          },
          {
            "id": "privacy",
            "kind": "condition",
            "quote": "개인정보는 외부 전송하지 않습니다.",
            "anchors": [
              "개인정보",
              "외부 전송"
            ],
            "display": "body"
          },
          {
            "id": "decision",
            "kind": "decision",
            "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
            "anchors": [
              "실제 처리시간 8분 이하",
              "재문의율",
              "기존보다 높아지지 않을 때",
              "기준 미충족"
            ],
            "display": "body"
          },
          {
            "id": "assumption",
            "kind": "condition",
            "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
            "anchors": [
              "합성 가정",
              "관측 성과"
            ],
            "display": "body"
          }
        ],
        "comparisonDimensions": [
          "처리시간",
          "도구 비용",
          "개인정보",
          "재문의율"
        ]
      }
    },
    {
      "index": 3,
      "section": "계산",
      "message": "월 400건의 처리시간이 4분 줄면 1,600분을 절감하는 가정입니다",
      "contentHint": "400×(12−8)=1,600분/월. 도구 비용 월20만원 가정, 인건비·교육비·구축비 제외. 절감 시간은 실적이 아님.\n제공된 자료: 가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다. 6주 시범 운영, 상담원 6명. 도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다. 개인정보는 외부 전송하지 않습니다. 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. 모두 합성 가정이며 관측 성과가 아닙니다.",
      "role": "계산",
      "evidenceRefs": [
        "1"
      ],
      "calculation": {
        "title": "월 절감 시간",
        "assumptions": [
          {
            "name": "count",
            "label": "월 처리 건수",
            "value": 400,
            "unit": "건",
            "basis": "합성 브리프",
            "evidenceRefs": [
              "1"
            ],
            "origin": "가정"
          },
          {
            "name": "before",
            "label": "현재 건당 시간",
            "value": 12,
            "unit": "분",
            "basis": "합성 브리프",
            "evidenceRefs": [
              "1"
            ],
            "origin": "가정"
          },
          {
            "name": "after",
            "label": "개선 건당 시간",
            "value": 8,
            "unit": "분",
            "basis": "합성 브리프",
            "evidenceRefs": [
              "1"
            ],
            "origin": "가정"
          }
        ],
        "steps": [
          {
            "name": "difference",
            "label": "건당 절감",
            "operation": "subtract",
            "operands": [
              "before",
              "after"
            ],
            "unit": "분"
          },
          {
            "name": "saved",
            "label": "월 절감 시간",
            "operation": "multiply",
            "operands": [
              "count",
              "difference"
            ],
            "unit": "분"
          }
        ],
        "interpretation": "월 1,600분 절감 가정. 도구 비용 월20만원, 인건비·교육비·구축비 제외. 관측 성과 아님."
      },
      "claimType": "추론",
      "contentContract": {
        "version": 1,
        "requirements": [
          {
            "id": "calc",
            "kind": "calculation",
            "quote": "400×(12−8)=1,600분/월.",
            "anchors": [
              "400",
              "12−8",
              "1,600분/월"
            ],
            "display": "body"
          },
          {
            "id": "inputs",
            "kind": "condition",
            "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
            "anchors": [
              "월 400건",
              "현재 건당 12분",
              "건당 8분",
              "가정"
            ],
            "display": "body"
          },
          {
            "id": "cost",
            "kind": "condition",
            "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
            "anchors": [
              "월 20만 원",
              "인건비·교육비·구축비",
              "제외"
            ],
            "display": "body"
          },
          {
            "id": "status",
            "kind": "condition",
            "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
            "anchors": [
              "합성 가정",
              "관측 성과"
            ],
            "display": "body"
          },
          {
            "id": "pilot",
            "kind": "condition",
            "quote": "6주 시범 운영, 상담원 6명.",
            "anchors": [
              "6주",
              "상담원 6명"
            ],
            "display": "body"
          },
          {
            "id": "expand",
            "kind": "decision",
            "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
            "anchors": [
              "처리시간 8분 이하",
              "재문의율",
              "기존보다 높아지지",
              "기준 미충족"
            ],
            "display": "body"
          },
          {
            "id": "privacy",
            "kind": "condition",
            "quote": "개인정보는 외부 전송하지 않습니다.",
            "anchors": [
              "개인정보",
              "외부 전송"
            ],
            "display": "body"
          }
        ],
        "comparisonDimensions": [
          "건당",
          "도구 비용",
          "재문의율"
        ]
      }
    },
    {
      "index": 4,
      "section": "결론",
      "message": "6주 검증에서 8분 이하·재문의율 유지 조건을 충족하면 확대합니다",
      "contentHint": "6주·상담원6명. 개인정보 외부 전송 없음. 8분 이하·재문의율이 기존보다 높아지지 않음 동시 충족 시 확대, 미충족이면 원인별 수정.\n제공된 자료: 가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다. 6주 시범 운영, 상담원 6명. 도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다. 개인정보는 외부 전송하지 않습니다. 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. 모두 합성 가정이며 관측 성과가 아닙니다.",
      "role": "판단",
      "evidenceRefs": [
        "1"
      ],
      "claimType": "추론",
      "contentContract": {
        "version": 1,
        "requirements": [
          {
            "id": "pilot_scope",
            "kind": "condition",
            "quote": "6주 시범 운영, 상담원 6명.",
            "anchors": [
              "6주",
              "상담원 6명"
            ],
            "display": "body"
          },
          {
            "id": "privacy",
            "kind": "condition",
            "quote": "개인정보는 외부 전송하지 않습니다.",
            "anchors": [
              "개인정보",
              "외부 전송"
            ],
            "display": "body"
          },
          {
            "id": "expansion_criteria",
            "kind": "decision",
            "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
            "anchors": [
              "실제 처리시간",
              "8분 이하",
              "재문의율",
              "기존보다 높아지지"
            ],
            "display": "body"
          },
          {
            "id": "criteria_unmet",
            "kind": "decision",
            "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
            "anchors": [
              "기준 미충족",
              "전면 확대",
              "보류",
              "원인별"
            ],
            "display": "body"
          },
          {
            "id": "assumption_status",
            "kind": "fact",
            "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
            "anchors": [
              "합성 가정",
              "관측 성과"
            ],
            "display": "body"
          }
        ],
        "comparisonDimensions": [
          "실제 처리시간",
          "재문의율",
          "개인정보"
        ]
      }
    }
  ],
  "research": [],
  "researchRecord": {
    "evidence": [
      {
        "id": "1",
        "claim": "가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다. 6주 시범 운영, 상담원 6명. 도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다. 개인정보는 외부 전송하지 않습니다. 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. 모두 합성 가정이며 관측 성과가 아닙니다.",
        "title": "합성 검증용 운영 브리프",
        "url": "",
        "checkedAt": "2026-11-13",
        "kind": "내부 전제",
        "locator": "합성 브리프 1문단",
        "originalText": "가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다. 6주 시범 운영, 상담원 6명. 도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다. 개인정보는 외부 전송하지 않습니다. 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. 모두 합성 가정이며 관측 성과가 아닙니다.",
        "originalVerified": false
      }
    ],
    "searchStatus": "not-requested",
    "notice": "실제 조직의 측정 결과가 아닌 합성 검증 데이터입니다.",
    "query": "제공된 합성 브리프만 사용",
    "acceptedLimits": true
  },
  "candidates": {
    "0": [
      {
        "layoutId": "c-cover",
        "section": "표지",
        "headline": "운영팀은 합성 가정을 바탕으로 6주 시범 검증을 우선해야 합니다.",
        "data": {
          "eyebrow": "분석 보고서",
          "title": "고객지원 접수 업무 개선 시범안",
          "subtitle": "6주 시범 운영, 상담원 6명\n비교 기준, 처리시간·재문의율·도구 비용·개인정보\n도구 비용 월 20만 원 가정\n모두 합성 가정, 관측 성과 아님\n개인정보 외부 전송 없음",
          "author": "운영팀 검토용",
          "coverStyle": "photo"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "purpose",
              "kind": "fact",
              "quote": "고객지원 접수 업무 개선 시범안",
              "anchors": [
                "고객지원",
                "접수 업무",
                "시범안"
              ],
              "display": "body"
            },
            {
              "id": "scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "assumption",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "timecalc",
              "kind": "calculation",
              "quote": "가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분",
                "월 1,600분"
              ],
              "display": "notes"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "도구 비용",
                "월 20만 원",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "notes"
            },
            {
              "id": "decision",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "처리시간 8분 이하",
                "재문의율",
                "기준 미충족",
                "전면 확대"
              ],
              "display": "notes"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "재문의율",
            "도구 비용",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.3019163616475241,
          "attempts": 1
        }
      },
      {
        "layoutId": "c-cover",
        "section": "표지",
        "headline": "고객 재문의까지 살피는 접수 개선",
        "data": {
          "eyebrow": "분석 보고서",
          "title": "고객 재문의까지 살피는 접수 개선",
          "subtitle": "6주 시범 운영, 상담원 6명\n처리시간 8분 이하·재문의율 유지 시 확대\n모두 합성 가정, 관측 성과 아님\n개인정보 외부 전송 없음",
          "author": "운영팀 검토용",
          "coverStyle": "white"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "purpose",
              "kind": "fact",
              "quote": "고객지원 접수 업무 개선 시범안",
              "anchors": [
                "고객지원",
                "접수 업무",
                "시범안"
              ],
              "display": "body"
            },
            {
              "id": "scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "assumption",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "timecalc",
              "kind": "calculation",
              "quote": "가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분",
                "월 1,600분"
              ],
              "display": "notes"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "도구 비용",
                "월 20만 원",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "notes"
            },
            {
              "id": "decision",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "처리시간 8분 이하",
                "재문의율",
                "기준 미충족",
                "전면 확대"
              ],
              "display": "notes"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "재문의율",
            "도구 비용",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [
            "필수 내용 purpose 누락: 고객지원 접수 업무 개선 시범안 (본문 확인 단서: 고객지원 / 접수 업무 / 시범안). 노트만으로 완료 처리하지 말고 조건·근거의 뜻을 보존해 본문에 배치하세요."
          ],
          "rendererWarnings": [],
          "fillRatio": 0.2396765455785145,
          "attempts": 0
        }
      },
      {
        "layoutId": "c-cover",
        "section": "표지",
        "headline": "고객지원 접수 품질 검증 제안",
        "data": {
          "eyebrow": "분석 보고서",
          "title": "고객지원 접수 품질 검증 제안",
          "subtitle": "6주 시범 운영, 상담원 6명\n시간 단축과 재문의율 유지의 동시 검증\n기준 미충족 시 전면 확대 보류, 원인별 수정\n모두 합성 가정, 관측 성과 아님\n개인정보 외부 전송 없음",
          "author": "운영팀 검토용",
          "coverStyle": "type"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "purpose",
              "kind": "fact",
              "quote": "고객지원 접수 업무 개선 시범안",
              "anchors": [
                "고객지원",
                "접수 업무",
                "시범안"
              ],
              "display": "body"
            },
            {
              "id": "scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "assumption",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "timecalc",
              "kind": "calculation",
              "quote": "가상 조직의 제공된 실험 조건입니다. 월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분",
                "월 1,600분"
              ],
              "display": "notes"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "도구 비용",
                "월 20만 원",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "notes"
            },
            {
              "id": "decision",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "처리시간 8분 이하",
                "재문의율",
                "기준 미충족",
                "전면 확대"
              ],
              "display": "notes"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "재문의율",
            "도구 비용",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [
            "필수 내용 purpose 누락: 고객지원 접수 업무 개선 시범안 (본문 확인 단서: 고객지원 / 접수 업무 / 시범안). 노트만으로 완료 처리하지 말고 조건·근거의 뜻을 보존해 본문에 배치하세요."
          ],
          "rendererWarnings": [],
          "fillRatio": 0.3079077081102854,
          "attempts": 0
        }
      }
    ],
    "1": [
      {
        "layoutId": "c-comparison-table",
        "section": "요약",
        "headline": "운영팀은 처리시간 8분 이하와 재문의율 유지 조건을 함께 충족할 때 확대합니다",
        "data": {
          "criteria": [
            "처리시간",
            "재문의율",
            "도구 비용",
            "개인정보"
          ],
          "alternatives": [
            {
              "name": "시범 운영 조건",
              "values": [
                "월 400건, 현재 건당 12분·개선 건당 8분 가정",
                "기존 대비 상승 여부 측정",
                "월 20만 원 가정, 인건비·교육비·구축비 제외",
                "개인정보 외부 전송 없음"
              ]
            },
            {
              "name": "확대 판단",
              "values": [
                "실제 처리시간 8분 이하",
                "기존보다 높아지지 않을 때 확대",
                "도구 비용만 포함, 전체 비용 판단 제외",
                "개인정보 외부 전송 금지 유지"
              ]
            }
          ],
          "takeaway": "6주 시범 운영, 상담원 6명. 모두 합성 가정, 관측 성과 아님. 월 400건 × (12분 − 8분) = 월 1,600분 절감 예시. 기준 미충족 시 전면 확대 보류, 원인별 수정"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "assumptions",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "time-calculation",
              "kind": "calculation",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분",
                "월 1,600분"
              ],
              "display": "body"
            },
            {
              "id": "pilot-scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "cost-scope",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "월 20만 원",
                "인건비",
                "교육비",
                "구축비"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "expansion-criteria",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
              "anchors": [
                "처리시간",
                "8분 이하",
                "재문의율",
                "기존보다 높아지지"
              ],
              "display": "body"
            },
            {
              "id": "reversal",
              "kind": "decision",
              "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "기준 미충족",
                "전면 확대",
                "보류",
                "원인별"
              ],
              "display": "body"
            },
            {
              "id": "source-status",
              "kind": "fact",
              "quote": "가상 조직의 제공된 실험 조건입니다.",
              "anchors": [
                "가상 조직",
                "실험 조건"
              ],
              "display": "notes"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "재문의율",
            "도구 비용",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.5049904829525655,
          "attempts": 0
        }
      },
      {
        "layoutId": "c-quadrants",
        "section": "요약",
        "headline": "운영팀은 처리시간 8분 이하라도 재문의율이 높아지면 확대를 보류합니다",
        "data": {
          "xAxis": "실제 처리시간, 건당 8분 이하 충족 여부",
          "yAxis": "재문의율, 기존보다 높아지지 않는 조건 충족 여부",
          "cells": [
            {
              "title": "시간 미충족·재문의율 충족",
              "body": "전면 확대 보류, 시간 지연 원인별 수정\n6주 시범 운영, 상담원 6명"
            },
            {
              "title": "두 조건 충족",
              "body": "확대 대상\n개인정보 외부 전송 없음\n도구 비용 월 20만 원 가정, 인건비·교육비·구축비 제외"
            },
            {
              "title": "두 조건 미충족",
              "body": "전면 확대 보류, 원인별 수정\n모두 합성 가정, 관측 성과 아님"
            },
            {
              "title": "시간 충족·재문의율 미충족",
              "body": "전면 확대 보류, 재문의 원인별 수정\n월 400건, 현재 건당 12분·개선 건당 8분 가정\n400건 × (12분 − 8분) = 월 1,600분 절감 예시"
            }
          ],
          "takeaway": "실제 처리시간 8분 이하와 재문의율 유지의 동시 충족 시 확대, 기준 미충족 시 전면 확대 보류·원인별 수정"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "assumptions",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "time-calculation",
              "kind": "calculation",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분",
                "월 1,600분"
              ],
              "display": "body"
            },
            {
              "id": "pilot-scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "cost-scope",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "월 20만 원",
                "인건비",
                "교육비",
                "구축비"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "expansion-criteria",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
              "anchors": [
                "처리시간",
                "8분 이하",
                "재문의율",
                "기존보다 높아지지"
              ],
              "display": "body"
            },
            {
              "id": "reversal",
              "kind": "decision",
              "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "기준 미충족",
                "전면 확대",
                "보류",
                "원인별"
              ],
              "display": "body"
            },
            {
              "id": "source-status",
              "kind": "fact",
              "quote": "가상 조직의 제공된 실험 조건입니다.",
              "anchors": [
                "가상 조직",
                "실험 조건"
              ],
              "display": "notes"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "재문의율",
            "도구 비용",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.5345667720699496,
          "attempts": 0
        }
      },
      {
        "layoutId": "c-argument-board",
        "section": "요약",
        "headline": "운영팀의 확대 기준은 월 1,600분 절감 가정과 별개로 시간과 재문의율의 동시 충족입니다",
        "data": {
          "insight": "모두 합성 가정, 관측 성과 아님",
          "panels": [
            {
              "kind": "산식",
              "title": "월간 절감 계산 예시",
              "rows": [
                {
                  "label": "접수량",
                  "value": "월 400건",
                  "detail": "월간 처리량 가정"
                },
                {
                  "label": "건당 처리시간",
                  "value": "12분·8분",
                  "detail": "현재 건당 12분, 개선 건당 8분 가정"
                },
                {
                  "label": "월간 절감시간",
                  "value": "1,600분",
                  "detail": "월 400건 × (12분 − 8분)"
                }
              ],
              "assumption": "제공된 변수 모두 합성 가정"
            },
            {
              "kind": "목록",
              "title": "시범 운영 범위",
              "rows": [
                {
                  "label": "기간·인원",
                  "value": "6주·6명",
                  "detail": "6주 시범 운영, 상담원 6명"
                },
                {
                  "label": "도구 비용",
                  "value": "월 20만 원",
                  "detail": "가정 금액, 인건비·교육비·구축비 제외"
                },
                {
                  "label": "개인정보",
                  "value": "외부 전송 없음",
                  "detail": "시범 운영의 개인정보 처리 조건"
                }
              ],
              "assumption": "도구 비용만 포함, 전체 비용과 구분"
            },
            {
              "kind": "목록",
              "title": "운영팀의 확대 판단",
              "rows": [
                {
                  "label": "처리시간",
                  "value": "8분 이하",
                  "detail": "실제 건당 처리시간 기준"
                },
                {
                  "label": "재문의율",
                  "value": "기존 수준 이하",
                  "detail": "기존보다 높아지지 않는 조건"
                },
                {
                  "label": "동시 충족",
                  "value": "확대",
                  "detail": "처리시간·재문의율 두 조건 모두 충족"
                },
                {
                  "label": "기준 미충족",
                  "value": "전면 확대 보류",
                  "detail": "원인별 수정"
                }
              ],
              "assumption": "6주 시범 운영에서 실제 지표로 판단"
            }
          ],
          "takeaway": "월 1,600분은 계산 예시, 확대 여부는 실제 처리시간 8분 이하와 재문의율 유지의 동시 충족으로 판단"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "assumptions",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "time-calculation",
              "kind": "calculation",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분",
                "월 1,600분"
              ],
              "display": "body"
            },
            {
              "id": "pilot-scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "cost-scope",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "월 20만 원",
                "인건비",
                "교육비",
                "구축비"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "expansion-criteria",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
              "anchors": [
                "처리시간",
                "8분 이하",
                "재문의율",
                "기존보다 높아지지"
              ],
              "display": "body"
            },
            {
              "id": "reversal",
              "kind": "decision",
              "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "기준 미충족",
                "전면 확대",
                "보류",
                "원인별"
              ],
              "display": "body"
            },
            {
              "id": "source-status",
              "kind": "fact",
              "quote": "가상 조직의 제공된 실험 조건입니다.",
              "anchors": [
                "가상 조직",
                "실험 조건"
              ],
              "display": "notes"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "재문의율",
            "도구 비용",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.4041371191398363,
          "attempts": 0
        }
      }
    ],
    "2": [
      {
        "layoutId": "c-before-after",
        "section": "비교",
        "headline": "이에 따라 월 1,600분 절감 여지는 있으나, 전체 비용 우위는 판단할 수 없습니다.",
        "data": {
          "beforeTitle": "현재 조건, 월 400건",
          "afterTitle": "개선안, 6주 시범 운영·상담원 6명",
          "rows": [
            {
              "label": "처리시간",
              "before": "현재 건당 12분, 월 400건\n같은 업무 범위, 합성 가정",
              "after": "건당 8분 가정, 월 400건\n400×(12−8)=월 1,600분 절감 계산 예시"
            },
            {
              "label": "도구 비용",
              "before": "기존 도구 비용 미제공\n전체 비용 우위 판단 불가",
              "after": "도구 비용 월 20만 원 가정\n인건비·교육비·구축비 제외"
            },
            {
              "label": "개인정보",
              "before": "같은 업무 범위의 비교 조건\n개인정보 외부 전송 금지",
              "after": "개인정보 외부 전송 없음\n전체 수치·조건은 합성 가정, 관측 성과 아님"
            }
          ],
          "status": "proposal",
          "takeaway": "실제 처리시간 8분 이하·재문의율이 기존보다 높아지지 않을 때 확대, 기준 미충족 시 전면 확대 보류·원인별 수정"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "비교",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "scope",
              "kind": "comparison",
              "quote": "현재와 개선안은 같은 업무 범위에서 시간·비용·개인정보 기준으로 비교합니다",
              "anchors": [
                "같은 업무 범위",
                "시간",
                "비용",
                "개인정보"
              ],
              "display": "body"
            },
            {
              "id": "time",
              "kind": "calculation",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분 가정",
                "월 1,600분"
              ],
              "display": "body"
            },
            {
              "id": "pilot",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "시범 운영",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "도구 비용",
                "월 20만 원 가정",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "decision",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "실제 처리시간 8분 이하",
                "재문의율",
                "기존보다 높아지지 않을 때",
                "기준 미충족"
              ],
              "display": "body"
            },
            {
              "id": "assumption",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "도구 비용",
            "개인정보",
            "재문의율"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.1963839720690747,
          "attempts": 2
        }
      },
      {
        "layoutId": "c-comparison-table",
        "section": "비교",
        "headline": "이에 따라 운영팀은 같은 업무 범위의 시간·비용·개인정보를 함께 비교해야 합니다",
        "data": {
          "criteria": [
            "처리시간",
            "도구 비용",
            "개인정보",
            "재문의율"
          ],
          "alternatives": [
            {
              "name": "현재 조건",
              "values": [
                "월 400건, 건당 12분\n합성 가정, 관측 성과 아님",
                "기존 도구 비용 미제공\n전체 비용의 우열 판단 불가",
                "개인정보 외부 전송 없음\n같은 업무 범위, 공통 조건",
                "기존 재문의율, 비교 기준\n합성 가정, 관측 성과 아님"
              ]
            },
            {
              "name": "개선안",
              "values": [
                "건당 8분 가정, 월 1,600분 절감 예시\n월 400건×(12−8)분",
                "월 20만 원 가정, 도구 비용만\n인건비·교육비·구축비 제외",
                "개인정보 외부 전송 없음\n6주 시범 운영, 상담원 6명",
                "실제 처리시간 8분 이하 동시 충족\n재문의율이 기존보다 높아지지 않을 때 확대"
              ]
            }
          ],
          "takeaway": "기준 미충족 시 전면 확대 보류, 원인별 수정"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "비교",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "scope",
              "kind": "comparison",
              "quote": "현재와 개선안은 같은 업무 범위에서 시간·비용·개인정보 기준으로 비교합니다",
              "anchors": [
                "같은 업무 범위",
                "시간",
                "비용",
                "개인정보"
              ],
              "display": "body"
            },
            {
              "id": "time",
              "kind": "calculation",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분 가정",
                "월 1,600분"
              ],
              "display": "body"
            },
            {
              "id": "pilot",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "시범 운영",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "도구 비용",
                "월 20만 원 가정",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "decision",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "실제 처리시간 8분 이하",
                "재문의율",
                "기존보다 높아지지 않을 때",
                "기준 미충족"
              ],
              "display": "body"
            },
            {
              "id": "assumption",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "도구 비용",
            "개인정보",
            "재문의율"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.5406429603044002,
          "attempts": 1
        }
      },
      {
        "layoutId": "c-argument-board",
        "section": "비교",
        "headline": "이에 따라 운영팀은 8분 가정만으로 개선안의 우위를 단정할 수 없습니다.",
        "data": {
          "insight": "같은 업무 범위, 처리시간·도구 비용·개인정보·재문의율 기준 비교",
          "panels": [
            {
              "kind": "비교",
              "title": "현재와 개선안의 비교",
              "rows": [
                {
                  "label": "처리시간",
                  "value": "현재 12분, 개선 8분",
                  "detail": "현재 건당 12분, 개선안 건당 8분 가정"
                },
                {
                  "label": "절감 시간",
                  "value": "월 1,600분",
                  "detail": "월 400건 기준, 400×(12−8)=1,600분/월 계산 예시"
                },
                {
                  "label": "도구 비용",
                  "value": "개선안 월 20만 원 가정",
                  "detail": "현재 비용 미제공, 인건비·교육비·구축비 제외, 전체 비용 우열 판단 불가"
                },
                {
                  "label": "개인정보",
                  "value": "외부 전송 금지",
                  "detail": "현재·개선안 공통 조건, 개인정보 외부 전송 없음"
                }
              ],
              "assumption": "모두 합성 가정, 관측 성과 아님"
            },
            {
              "kind": "목록",
              "title": "운영팀의 검증과 확대 기준",
              "rows": [
                {
                  "label": "시범 운영",
                  "value": "6주, 상담원 6명",
                  "detail": "동일 업무 범위의 처리시간·재문의율 측정 계획"
                },
                {
                  "label": "확대 조건",
                  "value": "두 기준 동시 충족",
                  "detail": "실제 처리시간 8분 이하, 재문의율이 기존보다 높아지지 않을 때 확대"
                },
                {
                  "label": "기준 미충족",
                  "value": "전면 확대 보류",
                  "detail": "원인별 수정, 처리시간·재문의율 재측정 계획"
                }
              ],
              "assumption": "재문의율의 기존 수치 미제공, 같은 집계 기준·측정 기간 적용 필요"
            }
          ],
          "takeaway": "시간 절감은 계산 예시, 전체 비용 우열은 판단 유보, 확대는 실제 처리시간·재문의율 동시 충족 조건"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "비교",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "scope",
              "kind": "comparison",
              "quote": "현재와 개선안은 같은 업무 범위에서 시간·비용·개인정보 기준으로 비교합니다",
              "anchors": [
                "같은 업무 범위",
                "시간",
                "비용",
                "개인정보"
              ],
              "display": "body"
            },
            {
              "id": "time",
              "kind": "calculation",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "건당 12분",
                "건당 8분 가정",
                "월 1,600분"
              ],
              "display": "body"
            },
            {
              "id": "pilot",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "시범 운영",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "도구 비용",
                "월 20만 원 가정",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "decision",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "실제 처리시간 8분 이하",
                "재문의율",
                "기존보다 높아지지 않을 때",
                "기준 미충족"
              ],
              "display": "body"
            },
            {
              "id": "assumption",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "처리시간",
            "도구 비용",
            "개인정보",
            "재문의율"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.4058917641974927,
          "attempts": 1
        }
      }
    ],
    "3": [
      {
        "layoutId": "c-comparison-table",
        "section": "계산",
        "headline": "이에 따라 월 1,600분 절감 가정과 월 20만 원의 도구 비용은 별도 지표입니다.",
        "data": {
          "criteria": [
            "건당 처리시간",
            "도구 비용",
            "재문의율",
            "운영 조건"
          ],
          "alternatives": [
            {
              "name": "현재 기준",
              "values": [
                "현재 건당 12분, 월 400건 가정",
                "현재 비용 미제공",
                "기존 재문의율, 수치 미제공",
                "모두 합성 가정, 관측 성과 아님"
              ]
            },
            {
              "name": "개선 시나리오",
              "values": [
                "건당 8분 가정, 건당 절감 4분",
                "월 20만 원 가정, 인건비·교육비·구축비 제외",
                "기존보다 높아지지 않을 때 확대",
                "6주 시범 운영, 상담원 6명, 개인정보 외부 전송 없음"
              ]
            },
            {
              "name": "계산·판단",
              "values": [
                "400×(12−8)=1,600분/월",
                "시간 절감과 별도 비용, 금전 편익 환산 없음",
                "실제 처리시간 8분 이하와 동시 충족",
                "기준 미충족 시 전면 확대 보류, 원인별 수정"
              ]
            }
          ],
          "takeaway": "월 1,600분은 계산 예시, 확대 여부는 실제 처리시간·재문의율의 동시 충족으로 판단."
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "계산",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "calc",
              "kind": "calculation",
              "quote": "400×(12−8)=1,600분/월.",
              "anchors": [
                "400",
                "12−8",
                "1,600분/월"
              ],
              "display": "body"
            },
            {
              "id": "inputs",
              "kind": "condition",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "현재 건당 12분",
                "건당 8분",
                "가정"
              ],
              "display": "body"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "월 20만 원",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "body"
            },
            {
              "id": "status",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "pilot",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "expand",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "처리시간 8분 이하",
                "재문의율",
                "기존보다 높아지지",
                "기준 미충족"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "건당",
            "도구 비용",
            "재문의율"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.6767389099990577,
          "attempts": 0
        }
      },
      {
        "layoutId": "c-formula-cards",
        "section": "계산",
        "headline": "이에 따라 월 1,600분 절감 가정과 월 20만 원의 도구 비용은 별도 지표입니다.",
        "data": {
          "cards": [
            {
              "title": "건당 절감",
              "assumption": "[가정] 월 처리 건수 400건 · [가정] 현재 건당 시간 12분 · [가정] 개선 건당 시간 8분",
              "formula": "현재 건당 시간 12 − 개선 건당 시간 8",
              "result": "4 분",
              "interpretation": "[계산 예시] 월 1,600분 절감 가정. 도구 비용 월20만원, 인건비·교육비·구축비 제외. 관측 성과 아님."
            },
            {
              "title": "월 절감 시간",
              "assumption": "[가정] 월 처리 건수 400건 · [가정] 현재 건당 시간 12분 · [가정] 개선 건당 시간 8분",
              "formula": "월 처리 건수 400 × 건당 절감 4",
              "result": "1,600 분",
              "interpretation": "[계산 예시] 월 1,600분 절감 가정. 도구 비용 월20만원, 인건비·교육비·구축비 제외. 관측 성과 아님."
            }
          ],
          "takeaway": "[계산] 월 1,600분 절감 가정. 도구 비용 월20만원, 인건비·교육비·구축비 제외. 관측 성과 아님."
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "계산",
        "claimType": "계산",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "calc",
              "kind": "calculation",
              "quote": "400×(12−8)=1,600분/월.",
              "anchors": [
                "400",
                "12−8",
                "1,600분/월"
              ],
              "display": "body"
            },
            {
              "id": "inputs",
              "kind": "condition",
              "quote": "월 400건, 현재 건당 12분. 개선안은 건당 8분 가정이며 월 1,600분 절감 계산 예시입니다.",
              "anchors": [
                "월 400건",
                "현재 건당 12분",
                "건당 8분",
                "가정"
              ],
              "display": "body"
            },
            {
              "id": "cost",
              "kind": "condition",
              "quote": "도구 비용은 월 20만 원 가정이며 인건비·교육비·구축비는 제외합니다.",
              "anchors": [
                "월 20만 원",
                "인건비·교육비·구축비",
                "제외"
              ],
              "display": "body"
            },
            {
              "id": "status",
              "kind": "condition",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            },
            {
              "id": "pilot",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "expand",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "처리시간 8분 이하",
                "재문의율",
                "기존보다 높아지지",
                "기준 미충족"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "건당",
            "도구 비용",
            "재문의율"
          ]
        },
        "quality": {
          "warnings": [
            "필수 내용 status 누락: 모두 합성 가정이며 관측 성과가 아닙니다. (본문 확인 단서: 합성 가정 / 관측 성과). 노트만으로 완료 처리하지 말고 조건·근거의 뜻을 보존해 본문에 배치하세요.",
            "필수 내용 pilot 누락: 6주 시범 운영, 상담원 6명. (본문 확인 단서: 6주 / 상담원 6명). 노트만으로 완료 처리하지 말고 조건·근거의 뜻을 보존해 본문에 배치하세요.",
            "필수 내용 expand 누락: 실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다. 기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다. (본문 확인 단서: 처리시간 8분 이하 / 재문의율 / 기존보다 높아지지 / 기준 미충족). 노트만으로 완료 처리하지 말고 조건·근거의 뜻을 보존해 본문에 배치하세요.",
            "필수 내용 privacy 누락: 개인정보는 외부 전송하지 않습니다. (본문 확인 단서: 개인정보 / 외부 전송). 노트만으로 완료 처리하지 말고 조건·근거의 뜻을 보존해 본문에 배치하세요."
          ],
          "rendererWarnings": [],
          "fillRatio": 0.2851261088729464,
          "attempts": 0
        }
      }
    ],
    "4": [
      {
        "layoutId": "c-argument-board",
        "section": "결론",
        "headline": "이에 따라 운영팀은 6주 검증에서 시간과 재문의율 조건을 함께 충족할 때 확대합니다.",
        "data": {
          "insight": "월 절감 시간은 계산 예시, 확대 판단은 실제 처리시간과 재문의율 기준",
          "panels": [
            {
              "kind": "숫자",
              "title": "시범 운영 조건",
              "rows": [
                {
                  "label": "운영 기간",
                  "value": "6주",
                  "detail": "상담원 6명, 시범 운영 계획"
                },
                {
                  "label": "개인정보",
                  "value": "외부 전송 없음",
                  "detail": "시범 운영 전 기간의 필수 조건"
                }
              ],
              "assumption": "모두 합성 가정, 관측 성과 아님"
            },
            {
              "kind": "비교",
              "title": "검증 후 확대 판단",
              "rows": [
                {
                  "label": "실제 처리시간",
                  "value": "8분 이하",
                  "detail": "시범 운영의 건당 처리시간 기준"
                },
                {
                  "label": "재문의율",
                  "value": "기존보다 높아지지 않음",
                  "detail": "기존과 시범 운영에 같은 산정 기준 적용"
                },
                {
                  "label": "동시 충족",
                  "value": "확대",
                  "detail": "개인정보 외부 전송 없음 조건 유지"
                },
                {
                  "label": "기준 미충족",
                  "value": "전면 확대 보류",
                  "detail": "처리시간·재문의율 원인별 수정"
                }
              ],
              "assumption": "재문의율의 분모·집계 기간은 운영 전 합의 필요"
            }
          ],
          "takeaway": "운영팀의 확대 조건은 두 지표 동시 충족, 기준 미충족 시 전면 확대 보류·원인별 수정"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "pilot_scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "expansion_criteria",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
              "anchors": [
                "실제 처리시간",
                "8분 이하",
                "재문의율",
                "기존보다 높아지지"
              ],
              "display": "body"
            },
            {
              "id": "criteria_unmet",
              "kind": "decision",
              "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "기준 미충족",
                "전면 확대",
                "보류",
                "원인별"
              ],
              "display": "body"
            },
            {
              "id": "assumption_status",
              "kind": "fact",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "실제 처리시간",
            "재문의율",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [
            "본문 채움 비율 15%가 기준 18%보다 낮습니다."
          ],
          "rendererWarnings": [
            "본문 채움 비율 15%가 기준 18%보다 낮습니다."
          ],
          "fillRatio": 0.1479842946656686,
          "attempts": 0
        }
      },
      {
        "layoutId": "c-argument-board",
        "section": "결론",
        "headline": "이에 따라 6주 검증에서 8분 이하와 재문의율 유지 조건을 함께 충족하면 확대합니다",
        "data": {
          "insight": "실제 처리시간과 재문의율, 두 기준의 동시 충족 여부로 확대 판단",
          "panels": [
            {
              "kind": "목록",
              "title": "검증 결과별 최종 판단",
              "rows": [
                {
                  "label": "두 기준 동시 충족",
                  "value": "확대",
                  "detail": "실제 처리시간 8분 이하, 재문의율 기존보다 높아지지 않음"
                },
                {
                  "label": "하나라도 기준 미충족",
                  "value": "전면 확대 보류",
                  "detail": "처리시간·재문의율의 미충족 원인별 수정"
                }
              ],
              "assumption": "동일 업무 범위·산정 기준으로 기존과 시범 운영 결과 비교"
            },
            {
              "kind": "목록",
              "title": "공통 운영 조건과 근거",
              "rows": [
                {
                  "label": "범위",
                  "value": "6주·상담원 6명",
                  "detail": "시범 운영 계획"
                },
                {
                  "label": "개인정보",
                  "value": "외부 전송 없음",
                  "detail": "시범 운영 전 과정의 공통 조건"
                },
                {
                  "label": "근거",
                  "value": "모두 합성 가정",
                  "detail": "관측 성과 아님"
                }
              ],
              "assumption": "합성 검증용 운영 브리프, 2026-11-13"
            }
          ],
          "takeaway": "두 기준 동시 충족 시 확대, 하나라도 미충족 시 전면 확대 보류·원인별 수정"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "pilot_scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "expansion_criteria",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
              "anchors": [
                "실제 처리시간",
                "8분 이하",
                "재문의율",
                "기존보다 높아지지"
              ],
              "display": "body"
            },
            {
              "id": "criteria_unmet",
              "kind": "decision",
              "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "기준 미충족",
                "전면 확대",
                "보류",
                "원인별"
              ],
              "display": "body"
            },
            {
              "id": "assumption_status",
              "kind": "fact",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "실제 처리시간",
            "재문의율",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.24875078408150714,
          "attempts": 2
        }
      },
      {
        "layoutId": "c-judgment-reversal",
        "section": "결론",
        "headline": "이에 따라 운영팀은 6주 검증에서 두 조건을 충족하면 확대하고 미충족이면 수정합니다.",
        "data": {
          "priorities": [
            {
              "name": "두 조건 충족 시 확대",
              "why": "실제 처리시간 8분 이하, 재문의율이 기존보다 높아지지 않음",
              "reversal": "어느 한 기준이라도 미충족 시 전면 확대 보류",
              "method": "6주·상담원 6명 시범 운영 계획, 기존과 같은 지표 기준으로 비교"
            },
            {
              "name": "기준 미충족 시 원인별 수정",
              "why": "처리시간 초과·재문의율 상승 원인별 수정 필요",
              "reversal": "수정 후 두 기준 동시 충족 시 확대 재검토",
              "method": "개인정보 외부 전송 없음 유지, 시간·재문의 원인별 점검"
            }
          ],
          "takeaway": "합성 가정, 관측 성과 아님. 운영팀의 확대 판단은 실제 처리시간 8분 이하·재문의율 유지 동시 충족 기준",
          "tag": "추론"
        },
        "sources": [],
        "notes": "[1] 합성 검증용 운영 브리프\n내부 자료 · 공개 URL 없음\n확인일 2026-11-13",
        "role": "판단",
        "claimType": "추론",
        "evidenceRefs": [
          "1"
        ],
        "contentContract": {
          "version": 1,
          "requirements": [
            {
              "id": "pilot_scope",
              "kind": "condition",
              "quote": "6주 시범 운영, 상담원 6명.",
              "anchors": [
                "6주",
                "상담원 6명"
              ],
              "display": "body"
            },
            {
              "id": "privacy",
              "kind": "condition",
              "quote": "개인정보는 외부 전송하지 않습니다.",
              "anchors": [
                "개인정보",
                "외부 전송"
              ],
              "display": "body"
            },
            {
              "id": "expansion_criteria",
              "kind": "decision",
              "quote": "실제 처리시간 8분 이하이고 재문의율이 기존보다 높아지지 않을 때 확대합니다.",
              "anchors": [
                "실제 처리시간",
                "8분 이하",
                "재문의율",
                "기존보다 높아지지"
              ],
              "display": "body"
            },
            {
              "id": "criteria_unmet",
              "kind": "decision",
              "quote": "기준 미충족 시 전면 확대를 보류하고 원인별로 수정합니다.",
              "anchors": [
                "기준 미충족",
                "전면 확대",
                "보류",
                "원인별"
              ],
              "display": "body"
            },
            {
              "id": "assumption_status",
              "kind": "fact",
              "quote": "모두 합성 가정이며 관측 성과가 아닙니다.",
              "anchors": [
                "합성 가정",
                "관측 성과"
              ],
              "display": "body"
            }
          ],
          "comparisonDimensions": [
            "실제 처리시간",
            "재문의율",
            "개인정보"
          ]
        },
        "quality": {
          "warnings": [],
          "rendererWarnings": [],
          "fillRatio": 0.518950667130176,
          "attempts": 0
        }
      }
    ]
  },
  "picked": {
    "0": 0,
    "1": 1,
    "2": 0,
    "3": 0,
    "4": 1
  },
  "edited": {},
  "chat": {
    "setup": [],
    "outline": [],
    "slides": {}
  },
  "demo": true
};
