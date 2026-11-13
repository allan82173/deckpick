# DeckPick app

설치·공유 범위는 상위 README.md를 참고하세요.

로컬: `npm run dev` → http://localhost:3100. 로그인된 구독 CLI만 사용하며 API 키 호출은 중지합니다. 공유 Vercel은 합성 예시의 후보 선택·직접 편집·PPTX 출력만 제공합니다.

검증: `npm test`, `npm run typecheck`, `npm run build`.

미리보기와 PPTX는 src/lib/scene.ts의 장면 정의를 공유합니다. 필수 내용 계약은 제공 자료의 인용으로 만들고 본문 누락 검사와 제한된 자동 재생성에 사용합니다. 계약 검사는 의미 전체의 정확성이나 최신 사실을 보증하지 않습니다.
