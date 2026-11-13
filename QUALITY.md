# Generation quality / 생성 품질

DeckPick uses content-first layout selection and preserves source, unit, assumption and scope information. Each page can be reviewed against four criteria: message continuity, body support, visualization fitness compared with an alternative, and substantial changes needed before submission. Missing reviews remain unreviewed; automated checks do not replace human approval.

생성 과정에 Humanizer 기반 문체 규칙을 적용하며, 표현 수정이 사실 검증을 대신하지 않습니다. 장식형 구분 페이지는 본문 분석의 대체 후보로 자동 추천하지 않습니다. 출처 메타데이터는 간결한 원문 목록으로 출력하고 상세 적용 범위는 발표자 노트에 남깁니다.

For explicit selection-first trials, local content and geometry checks still run during generation. Image and whole-deck review happen after the user chooses candidates. This changes the order of review, without marking unreviewed slides as passed. Research HTTP reads can overlap across two questions while subscription CLI calls remain serialized.

The hosted preview supports the prepared synthetic example, editing and PPTX export. Real research/generation requires the local subscription CLI workflow. No owner's API key is provided. Private source decks, attachments, execution reports, CLI jobs and authentication files are excluded from this repository/deployment.

현재 개선의 전체 덱 품질·시간 절감률은 새로운 실측으로 확인해야 합니다. 오프라인 테스트 통과와 제출 수준 검증은 별개입니다.

Original-source recovery: query results are genuinely interleaved, blocked pages do not consume the successful-page target, and a bounded next-source retry follows real report/document links. The direct document URL and discovery origin are recorded separately. Empty fact extraction can use the remaining research round; download listings alone are not treated as substantive task evidence. A controlled same-input recovery can reuse discovered URLs without repeating the initial searches.

Local structured output uses Codex native `--output-schema` for closed schemas, with optional-field restoration and the existing Zod checks. Dynamic record payloads retain validated JSON fallback. Story layout metadata is normalized without dropping role mappings or registry details, and requested slide count is explicit in the wire schema. Bibliography display measures long titles and keeps full titles/links in the original data and notes. These checks do not establish a new full-deck quality score.
