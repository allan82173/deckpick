# DeckPick

발표 초안을 만들고 장별 후보를 비교·편집하는 작업공간입니다.
A presentation workspace for drafting, comparing layouts and editing slides.

[공유 작업공간 / Shared workspace](https://deckpick.vercel.app)

## 공유 링크에서 가능한 것

준비된 **합성 예시**의 장별 후보 비교, 텍스트·도형 편집, PPTX 다운로드를 제공합니다. 작업은 현재 브라우저에 저장됩니다. 새 자료의 AI 생성·조사·장별 AI 대화는 이 공유 링크에서 실행되지 않습니다. 방문자나 작성자의 API 크레딧을 사용하지 않으며 구독 로그인을 인터넷에 연결하지 않습니다.

## 로컬 AI 사용

본인 컴퓨터에 로그인된 Codex 또는 Claude Code 구독 CLI를 사용합니다. API 키 호출과 API 우회 경로는 꺼져 있습니다. 구독 사용 한도는 적용되며, 코드를 다운로드하는 것만으로 AI 구독이 제공되지는 않습니다.

```sh
git clone https://github.com/allan82173/deckpick.git
cd deckpick/web
npm ci
```

`.env.example`을 `.env.local`로 복사하고 구독 CLI에 로그인한 뒤 `npm run dev`를 실행합니다. http://localhost:3100 에서 AI 연결 설정의 로컬 CLI를 선택하세요. CLI가 PATH에 없다면 절대 실행 경로를 로컬 환경설정에 지정할 수 있습니다. 인증 파일과 개인 자료를 저장소에 올리지 마세요.

## English

The shared site provides a **synthetic example** with alternative layouts, direct editing and editable PPTX export. Work is stored in the current browser. AI generation, research and slide chat are unavailable on this hosted link; it uses no API credits or subscription credentials.

For local AI, install and sign into your own Codex or Claude Code subscription CLI. Copy `web/.env.example` to `.env.local`, then run `npm ci` and `npm run dev` from `web/`. Subscription limits apply. API-key calls and fallback are disabled in this configuration.

## Development

```sh
npm test
npm run typecheck
npm run build
```

Built with Next.js, TypeScript, Zod and PptxGenJS. The same scene definitions drive previews and editable PPTX output. Install Pretendard for matching PowerPoint typography. Verify generated facts and calculations before use. Original reference decks, private research, run records and credentials are excluded.
