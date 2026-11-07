# OpenAI API 연결 상태

확인일: 2026-10-28.

- 사용자 승인 후 OpenAI Developers의 보안 발급 절차로 키 1개 생성.
- 키 이름: Codex. 선택한 유효기간: 20일.
- 대상: Personal / Default project.
- 저장: `web/.env.local`의 `OPENAI_API_KEY`. 기존 파일의 다른 설정은 보존했다.
- 키 값은 이 문서·대화·덱·PPTX에 기록하지 않았다. 환경설정 파일은 Git·배포 업로드에서 제외한다.
- 로컬 앱의 연결 확인 요청은 OpenAI에 도달했지만 HTTP 429를 반환했다.
- 확인된 오류: `error.code = credit_balance_exhausted`, `error.type = insufficient_quota`.
- 상태: 키 발급·로컬 설정 완료. API 크레딧 잔액 부족으로 실제 생성 검증은 완료하지 못했다. 키를 재발급하거나 같은 요청을 반복하지 않는다.
- 다음 조치: 사용자가 OpenAI Platform의 API 결제·크레딧을 확인한 후 연결을 다시 확인한다. 결제·충전은 수행하지 않았다.
- 앱에서 서버 키 설정 여부를 감지해 ‘서버 키 설정됨’과 ‘연결 확인’을 표시하도록 연결했다. 키의 존재 여부만 브라우저로 전달하며 실제 값은 전달하지 않는다. 사용 중인 덱을 AI 모드로 전환했다. 크레딧 충전 전에는 실제 답변이 생성되지 않는다.
- 이 변경의 타입 검사·프로덕션 빌드와 테스트 11개 통과. 서버 키의 비노출과 잔액 부족 오류 분류를 대체 응답으로 검증했다. 잔액 부족이 확인된 뒤 실제 API 호출을 반복하지 않았다.

공식 안내:

- 오류: https://developers.openai.com/api/docs/guides/error-codes
- API 결제: https://platform.openai.com/settings/organization/billing

사용자 요청으로 두 앱의 로컬 API 모델을 `gpt-6-luna`로 변경했다. 생성 시 추론 강도는 `low`, 짧은 키 확인은 `none`으로 설정했다. 브라우저에 저장된 예전 기본 모델도 새 기본값으로 전환하며 직접 지정한 다른 모델은 보존한다. 현재 Codex 채팅의 Sol·Medium 설정과는 별개다. 모델 변경 후 실제 생성은 크레딧 충전 전까지 검증 대기이며 결제·배포는 수행하지 않았다.

모델 변경 검증: 두 앱 테스트 총 32개, 타입 검사 및 프로덕션 빌드 통과. Luna 요청의 low 추론·출력 한도와 키 확인용 none 추론은 대체 응답으로 확인했다. DeckPick 화면의 gpt-6-luna 기본값도 확인했다. 실제 Luna 계정 접근 및 생성 품질 검증은 충전 후 진행한다.
