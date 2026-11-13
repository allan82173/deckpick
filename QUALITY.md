# Quality and sharing status · 2026-11-13

- 필수 사실·기간·단위·가정·비교 범위를 자료 인용으로 저장하고 본문 누락을 검사합니다.
- 순위 막대, 근거 없는 점수, 샘플 숫자는 제한된 보완 뒤에도 남으면 후보에서 제외합니다. 적합 후보가 2개면 2개만 표시합니다. 실제 측정값이 1~4인 차트는 허용합니다.
- 자동 보완이 필수 내용 누락과 넘침을 늘리면 기존 후보를 보존합니다. 직접 편집은 보호합니다.
- 구독 CLI로 투자 8장, 금융 요약 5장, 합성 업무 개선 5장을 생성·검토했습니다. API 호출은 사용하지 않았습니다.
- 투자 단일 사례의 추가 수정은 이전 14필드/후보 변경2회에서 7필드/1회였습니다. 같은 동결 설계·근거를 사용했으나 진단 도구가 경고 적은 후보를 처음 골랐으므로 기본 첫 후보 UI와 동일한 실험은 아닙니다. 범용 개선율을 보장하지 않습니다.
- 금융 사례는 여전히 미해결 내용·인용 지적이 있습니다. 계약 검사는 표현 차이를 누락으로 오인할 수 있습니다. 검토 통과는 사실 정확성이나 투자 적합성을 보증하지 않습니다.
- 준비된 합성 예시 5장/14후보와 최종 투자 8장을 실제 PowerPoint로 렌더링해 확인했습니다. 원본 자료·실행 기록·개인정보는 이 저장소에 포함하지 않습니다.

## Hosted versus local

The hosted site offers a prepared synthetic example: layout selection, direct editing and editable PPTX export. It does not run AI generation, research or slide chat. Work stays in the browser. Local generation uses your own signed-in Codex/Claude Code subscription CLI, with API calls and fallback disabled. Subscription quotas still apply.

Ordinal rankings are not quantitative magnitudes. Candidate validation rejects ordinal bar charts, unsupported scores and placeholder data after bounded repair. Genuine small counts, grounded scores and ranking histories remain available. A two-choice result is retained rather than filled with a misleading third option.

The investment comparison is a single diagnostic case, not a controlled cross-topic quality guarantee. Finance-summary failures and lexical false positives remain. Always verify facts, assumptions and the rendered deck before use.
