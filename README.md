# DeckPick

**발표의 초안을 만들고, 장별 구성을 비교하며 다듬는 AI 프레젠테이션 도구.**  
**An AI presentation workspace for drafting, comparing layouts, and refining slides.**

[웹에서 사용 / Open app](https://deckpick.vercel.app) · [English ↓](#english)

## 한국어

설치 없이 웹에서 사용할 수 있습니다. **AI 기능에는 본인의 OpenAI 또는 Anthropic API 키가 필요하며, 해당 계정에 비용이 청구됩니다.** ChatGPT·Claude 구독과 API 결제는 별개입니다.

1. **새 덱 만들기**에서 주제·목적·발표자료 언어를 설정합니다.
2. **AI와 대화 → AI 연결 설정**에 API 키를 입력합니다.
3. 자료를 첨부하고 초안을 생성한 뒤, 장별 후보 비교·직접 편집·PPTX 다운로드로 완성합니다.

화면 상단에서 **한국어 / English**를 전환할 수 있습니다. 화면 언어와 생성할 발표자료의 언어는 별도로 선택합니다. 키는 브라우저 세션에 보관되며 서버를 거쳐 선택한 제공자로 전송됩니다. 공유 기기에서는 사용 후 키를 지우세요.

주요 기능: 공개 자료 조사와 출처·생성 리포트, 장별 최대 3개 후보, 텍스트·도형 편집, 파일·이미지 첨부, 장별 AI 대화, 편집 가능한 PPTX 내보내기. 작업은 현재 브라우저에 저장됩니다. 생성 결과의 사실·출처는 최종 확인이 필요합니다.

## English

Use the web app without installation. **AI features require your own OpenAI or Anthropic API key and are billed to that account.** ChatGPT/Claude subscriptions do not include API billing.

1. Create a deck and set the topic, purpose, and presentation language.
2. Open **AI chat → AI connection settings** and enter your API key.
3. Add references, generate a draft, compare layouts, edit slides, and download an editable PPTX.

Switch **한국어 / English** in the header. Interface language and presentation language are independent. Your key stays in browser session storage and is sent through the server to your chosen provider. Clear it after using a shared device.

Features include public-source research, citations and generation reports, up to three candidates per slide, text/shape editing, file/image attachments, slide-level AI chat, and editable PPTX export. Work is saved in the current browser. Verify generated claims and sources before presenting.

## Local development

Node.js 20.9+ and npm are required. Use the app link above if you do not need to modify the code.

```sh
git clone https://github.com/allan82173/deckpick.git
cd deckpick/web
npm ci
npm run dev
```

Open http://localhost:3100. Enter your API key in the app; downloading the code does not remove the API requirement.

```sh
npm test
npm run typecheck
npm run build
```

Built with Next.js, React, TypeScript, Zod and PptxGenJS. Original reference decks, personal work records and credentials are excluded from this repository. Install Pretendard for matching typography in PowerPoint; line breaks may vary between browser and PowerPoint.
