# DeckPick 공개 데모 배포 — 2026-10-30

대표 주소: https://deckpick.vercel.app
Vercel 프로젝트: dh-a410/deckpick
배포 ID: dpl_AXaRp18kaUxFqfM54C9wBkMrMXnw

사용자가 API 없는 데모 배포를 요청하여 2번 프로젝트의 기존 배포 보류를 해제했다. 1번 프로젝트의 공개 배포 제한에는 영향을 주지 않는다.

## 제공 범위

예시 덱 생성, 테마 선택, 장별 후보 선택·교체, 문구·글자 스타일·위치·박스 크기 수정, 페이지 추가, 네이티브 PPTX 다운로드. 데모는 사용자 자료를 분석한 AI 결과가 아니다. 덱은 현재 브라우저 localStorage에 저장되며 로컬 주소의 기존 덱은 자동 이전하지 않는다.

## 배포 설정

Production의 NEXT_PUBLIC_DEMO_ONLY=1을 빌드와 실행에 적용했다. AI 설정을 숨기고 AI·첨부 업로드·첨부 읽기를 서버에서도 차단했다. 키와 사용자 원문·첨부 캐시·검증 산출물은 업로드하지 않았다. 로컬 AI 개발 기능은 유지한다. 파일 첨부는 온라인 저장 방식과 소유권 관리 연결 후 별도 제공한다.

## 확인 결과

- 72개 테스트 통과, 원격 프로덕션 빌드 성공.
- 인증 정보 없는 HTTP 요청으로 대표 주소 200 확인. API 설정은 두 제공자 모두 false, AI·첨부 업로드는 403.
- 공개 브라우저에서 로그인 없이 6장 예시 생성과 문구 직접 편집, PPTX 다운로드 성공.
- 내려받은 PPTX 내부 슬라이드 6개 및 수정 제목 반영 확인.
- 화면: web/output/screenshots/vercel-public-demo.png
- 다운로드 검증: web/output/vercel-public-demo-validation.pptx

수정은 기존 web 폴더에서 계속한다. 공개 데모 업데이트는 같은 Vercel 프로젝트에 다시 배포하며 데모 전용 설정을 유지한다. API 기능 공개 전에는 별도 사용 승인과 인증·사용량 제한·첨부 저장 설계가 필요하다.

## 첫 화면 변경 — 2026-10-30

사용자 요청으로 첫 화면 장표 예시를 ICT 경영 포지셔닝 맵(page-07.png 한 장)으로 교체했다. 원본 전체 PDF는 업로드하지 않았다. 발표 사례 표시와 대체 텍스트를 추가했으며 생성 덱에는 자동 삽입하지 않는다. 배포 dpl_Q7vHmb5Tff4wVqsA7mC3hPcCxyKp, 대표 주소 동일. 타입 검사·Vercel 빌드 통과, 공개 브라우저에서 이미지 로드(1400×788)와 첫 화면 표시 확인. 화면: web/output/screenshots/home-ict-positioning-map.png.

## 홈 장표 익명화 — 2026-10-30

상단 ICT 경영 최종 발표, 하단 발표 사례, 키메시지 서비스들의 포지셔닝 맵은 다음과 같습니다로 변경했다. 우리 솔루션 외 서비스는 플레이어 1~5로 바꾸고 오른쪽 분류도 같은 번호로 통일했다. 정적 SVG로 대체하고 공개 PNG는 제거했다(대표 주소에서 404 확인). 로컬 참고 원본은 보존한다. 배포 dpl_AFVJ7VXWgJzByfXkppFWCFWKXULz. 타입 검사·원격 빌드·실제 공개 브라우저 표시 확인. 화면: web/output/screenshots/home-positioning-anonymized.png.

## 원본 글꼴·세부 설명 복원 — 2026-10-30

사용자가 재작성된 SVG의 글꼴·디자인 변경을 지적했다. 원본 PDF 7쪽에서 요청된 텍스트 10개 스팬만 제거·교체하고, 원본의 나눔스퀘어 Regular/Bold, 글자 크기, 좌표, 도형, 기타 텍스트를 유지한 벡터 SVG를 만들었다. 변경 텍스트에는 NAVER 공식 NanumSquare_ac 글꼴을 사용하고 최종 SVG는 글자를 경로로 변환해 방문자 기기의 대체 글꼴 영향을 없앴다. 글꼴 출처: https://campaign.naver.com/nanumsquare_neo/download/NaverNanumSquare.zip .

플레이어 1~5의 국가·업무 설명 모두 원문 그대로 유지했음을 검증했다. 내부 상단은 최종발표, 외부 아이콘 옆은 컨설팅 장표 포지셔닝 맵 예시, 아래 캡션은 발표 사례다. 키메시지와 플레이어 번호는 유지한다. 원본 PDF·전체 폰트 파일·내부 가공 PDF는 배포하지 않는다. 검증 이미지: web/output/font-restoration/positioning-original-font.png.

배포 dpl_5Q3QasyvRCfUYZqyGmF3KSYbjnh7 완료. 타입 검사·Vercel 빌드 통과, 대표 주소에서 외부 라벨과 원본 글꼴·부제 표시 확인. 공개 화면 기록: web/output/screenshots/home-positioning-original-font.png.

## 선택 영역만 선명하게 표시 — 2026-10-30

사용자 요청으로 축 단어와 오른쪽 축 선택 이유(가로축·세로축·국내 해외 분류 및 설명) 패널만 선명하게 유지하고 나머지 장표 전체를 블러 처리했다. 원본 글꼴은 그대로다. SVG 필터 작업본은 배포 제외 폴더에 보관하고, 공개용 이미지는 블러 결과를 PNG 픽셀로 고정했다. CSS 블러나 공개 SVG 원본에 의존하지 않는다. 이전 선명한 SVG는 공개 소스에서 제거했다. 사이트 자체의 제목·아이콘 옆 라벨·버튼·캡션은 유지한다. 공개 자산: web/public/examples/positioning-map-blurred.png.

배포 dpl_5JPdjdPgHDzKerPhcB75rrZWC4xz 완료. 타입 검사·Vercel 빌드 및 공개 브라우저 표시 확인. 이전 선명한 SVG는 대표 주소에서 404다. 화면: web/output/screenshots/home-positioning-selective-blur.png.

## 블러 범위 재조정 — 2026-10-30

후속 요청 세 건을 함께 반영했다. (1) 첨부한 맵/오른쪽 패널 영역 밖은 블러 해제, (2) 해당 영역은 우리 솔루션·플레이어 1~5 이름과 국내·해외 분류/설명만 선명하게 보존, (3) 작은 색상 블록과 국내 서비스·해외 서비스·우리 솔루션 범례도 보존. 추가로 원래 PDF의 키메시지 두 줄을 정확히 복구한 뒤 블러 처리했다(원문 추출 비교 일치). 내부 상단 최종발표와 사이트 라벨/캡션은 선명하다. 새 가로축·세로축 설명은 이번 요청에 따라 블러다. 출력은 픽셀에 블러를 고정한 PNG이고 원본은 배포하지 않는다.

배포 dpl_DGqBDXW6WgpmqJZdBmrJKAwWmgBZ 완료. 타입 검사·Vercel 빌드 통과 및 대표 주소에서 블러 범위 시각 확인. 화면: web/output/screenshots/home-positioning-blur-final.png.

## 국내·해외 분류 추가 블러 — 2026-10-30

사용자 후속 요청으로 오른쪽 아래 국내·해외 분류 제목과 설명도 블러 처리했다. 이름 6개와 하단 색상 블록/범례만 선명하게 두고 다른 기존 설정은 유지했다. 픽셀 고정 블러 PNG를 새로 생성해 시각 확인했으며 타입 검사 통과.

배포 dpl_4xxMRt2yNdvfA8g3zuMfgJSsyBfq 완료. 공개 브라우저에서 국내·해외 분류 블러 및 이름·범례 유지 확인. 화면: web/output/screenshots/home-classification-blurred.png.

## 공개 소개 전용으로 전환 — 2026-10-30

사용자가 다른 사람은 링크로 보기만 하고 사용자는 작업을 계속할 수 있기를 요청했다. 공개 홈을 별도 서버 렌더 소개 화면으로 분리했다. 새 덱 만들기·이어서 작업·입력폼·다운로드 버튼을 제공하지 않으며 /new와 /deck/*는 CDN 설정과 서버 양쪽에서 홈으로 돌린다. 공개 루트에서는 StudioProvider를 생략해 /api/config 조회와 덱/키 브라우저 저장소 접근을 시작하지 않는다. AI·첨부 API 차단과 키 없는 배포는 유지한다. Production에 NEXT_PUBLIC_SHOWCASE_ONLY=1을 지속 설정했다.

로컬에는 이 플래그를 추가하지 않아 기존 앱 생성·편집·내려받기 기능을 유지한다. 공개 사이트 접속도 호스팅 사용량은 발생하지만, 공개 기능 요청을 줄였고 공개 사이트 한도와 로컬 실행은 별개다. 타입 검사와 기존 72개 테스트 통과.

## 단일 사례의 단계별 읽기 전용 예시 — 2026-10-30

완성 장표 한 페이지보다 상단 단계 버튼을 눌러 예시를 보려는 후속 의도를 반영했다. 하나의 가상 사례 동네 책방 재방문 전략으로 자료·대화(기본 정보와 미리 작성한 대화), 목차 조정(6장 메시지와 목차 대화), 전체 초안·수정(6장 장표·왼쪽 앵커 목록·오른쪽 후보/대화 예시)을 제공한다. 공개 홈과 예시 페이지의 단계 버튼으로 이동한다. 예시 링크 /example은 /example/input으로 연결한다. 입력폼이나 후보 적용·저장·생성·다운로드 핸들러는 없고, 모든 대화는 예시임을 표시한다.

/example/input·outline·draft는 generateStaticParams로 사전 렌더한다. 서버에서 기존 공통 장면으로 SVG를 그리므로 별도 모델 호출이나 예시용 API가 없다. 실제 앱 /new·/deck/* 리다이렉트와 AI/첨부 API 차단은 유지한다. 로컬 작업 앱은 유지한다.

최종 배포 dpl_2ysif38hdUMqPbAHgpResBWiyAVj. 타입 검사·원격 빌드 통과. 공개 홈 상단 세 링크를 실제 클릭해 각 단계 표시 확인. HTTP로 세 예시 페이지 200, 입력폼 없음, AI 경로 403 확인. 전체 초안에는 6장과 후보 예시, 왼쪽 목록을 표시하며 1265px 화면에서 가운데 장표 폭 817px 확인. 화면: web/output/screenshots/public-example-input.png, public-example-outline.png, public-example-draft.png.
