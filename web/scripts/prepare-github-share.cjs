const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve('output/github-share'),app=path.resolve('.');
async function copyTree(src,dest){await fs.mkdir(dest,{recursive:true});for(const e of await fs.readdir(src,{withFileTypes:true})){const s=path.join(src,e.name),d=path.join(dest,e.name);if(e.isDirectory())await copyTree(s,d);else await fs.copyFile(s,d);}}
(async()=>{
 await fs.mkdir(root,{recursive:true});await copyTree(path.join(app,'src'),path.join(root,'web/src'));await copyTree(path.join(app,'public'),path.join(root,'web/public'));await fs.mkdir(path.join(root,'web/tests/fixtures'),{recursive:true});
 for(const name of await fs.readdir(path.join(app,'tests'))){if(name.endsWith('.test.ts')||name==='pipeline-fixture.ts')await fs.copyFile(path.join(app,'tests',name),path.join(root,'web/tests',name));}
 await copyTree(path.join(app,'tests/fixtures'),path.join(root,'web/tests/fixtures'));
 for(const name of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs']){try{await fs.copyFile(path.join(app,name),path.join(root,'web',name));}catch(e){if(e.code!=='ENOENT')throw e;}}
 await fs.mkdir(path.join(root,'web/scripts'),{recursive:true});for(const name of ['export-prompts.cjs','make-sample-screen.cjs'])await fs.copyFile(path.join(app,'scripts',name),path.join(root,'web/scripts',name));
 const env='OPENAI_API_KEY=\nOPENAI_MODEL=gpt-6-luna\nANTHROPIC_API_KEY=\nNEXT_PUBLIC_DEMO_ONLY=0\nNEXT_PUBLIC_SHOWCASE_ONLY=0\n';await fs.writeFile(path.join(root,'web/.env.example'),env);
 await fs.writeFile(path.join(root,'.gitignore'),'**/node_modules/\n**/.next/\n**/.attachments/\n**/.generation-runs/\n**/.env*\n!**/.env.example\n**/.vercel/\n**/*.tsbuildinfo\n**/output/\n');
 const readme=`# DeckPick

AI와 발표의 흐름을 정리하고, 장표 구성을 비교·편집하는 로컬 웹 앱입니다.

## 들어 있는 기능

- 배치 유형 **56개**, 컨설팅·마케팅 구현 ID **95개**
- 과제 해석 → 공개 조사 → 현재 판단·반전 조건 → 초안 → 전체 검토
- 장별 후보 3개, 직접 편집, 문서·사진 첨부, 장별 AI 대화
- PPTX 다운로드와 편집 가능한 PowerPoint 원본 차트
- 단계별 effort·출력 한도, 질문별 조사·원문 PDF 대조, 전체 첨부 근거표
- 장표 PNG 시각 검수와 생성 리포트(Markdown + JSON) 자동 저장·다운로드
- 가상 페르소나 표시, 조사 표본·기간 검사, 날짜 기반 일정·시나리오 계산

## 실행

Node.js 22 이상을 설치한 뒤 저장소를 내려받습니다.

\`\`\`text
cd web
npm ci
npm run dev
\`\`\`

브라우저에서 http://localhost:3100 을 엽니다. 키 없이 데모·편집·다운로드를 사용할 수 있습니다. 실제 AI 기능을 쓰려면 화면의 AI 연결 설정에 **본인의 API 키**를 넣으세요. 또는 web/.env.example을 .env.local로 복사해 본인 키를 설정하고 서버를 다시 실행합니다. 제공자·모델은 화면에서 선택합니다.

이 저장소에는 작성자의 API 키가 없습니다. 친구가 사용하는 AI 비용은 친구가 연결한 키의 계정에 청구됩니다. API 키를 GitHub에 올리지 마세요.

## 디자인 현황

앱의 ‘디자인 유형’ 또는 http://localhost:3100/catalog 에서 전체 유형을 볼 수 있습니다. 루트의 design-catalog.html은 다운로드해서 브라우저로 열어도 됩니다. 예시의 수치·인물·조사·화면은 합성 데이터입니다. 실제 사례가 아닙니다.

## 검사

\`\`\`text
npm test
npm run typecheck
npm run build
\`\`\`

새 유형마다 두 가지 예시를 검사하고, 이전 49개 구현의 장면과 PPTX XML 회귀 검사를 포함합니다. 테스트는 실제 AI 호출 없이 실행합니다. Pretendard 폰트를 설치하면 웹·PowerPoint 서체를 맞출 수 있습니다.

## 생성 설정과 리포트

실행 예산은 web/src/lib/generation-config.ts에서 조정합니다. 기본 시각 검수는 켜져 있으며 같은 연결 모델의 이미지 입력을 사용하므로 추가 호출과 토큰이 듭니다. 생성 완료 시 web/output/run-reports/에 Markdown과 JSON을 저장하고 화면에서도 내려받을 수 있습니다. 실행 조건·제공자가 반환한 사용량·근거표·선택·품질 경고를 기록하며 원본 첨부와 API 키는 포함하지 않습니다. 이 폴더와 비공개 첨부 근거표 캐시는 GitHub 공유 대상이 아닙니다.

## 공유 범위와 한계

원본 참고 PPT·개인 문서·업로드 파일·로컬 작업 기록·환경변수·배포 자격증명은 포함하지 않습니다. 두 정적 공개 예시 이미지는 기존 앱에서 사용하던 파일입니다. 학습은 모델 파인튜닝이 아니라 프롬프트·스키마·레이아웃·검사 규칙을 코드에 반영했다는 뜻입니다. 원문 접근과 AI 응답에 따라 경고가 남을 수 있으니 결과를 검토해 주세요.

GitHub 주소는 코드 공유 주소이며 실행 중인 웹사이트 주소가 아닙니다. 비공개 저장소이므로 소유자가 친구를 Collaborator로 초대한 뒤 친구가 내려받아 실행해야 합니다.
`;
 await fs.writeFile(path.join(root,'README.md'),readme);await fs.copyFile(path.join(app,'output/deckpick-design-catalog.html'),path.join(root,'design-catalog.html'));
 const records=[];async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await scan(f);else{const bytes=await fs.readFile(f),p=path.relative(root,f).replaceAll('\\','/');if(/(?:^|\/)(?:\.attachments|\.generation-runs|\.vercel|node_modules|참고자료)(?:\/|$)/.test(p)||(/(?:^|\/)\.env/.test(p)&&!p.endsWith('.env.example')))throw Error('제외 대상 파일 포함: '+p);const text=bytes.toString('utf8');if(/sk-(?:proj-)?[A-Za-z0-9_-]{25,}/.test(text))throw Error('비밀키 형태 문자열: '+p);for(const name of ['OPENAI_API_KEY','ANTHROPIC_API_KEY'])if(process.env[name]&&bytes.includes(Buffer.from(process.env[name])))throw Error('실제 비밀키 포함: '+p);records.push({path:p,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),binary:/\.(png|jpg|jpeg|webp|ico)$/i.test(p)});}}}
 await scan(root);await fs.writeFile('output/layout-expansion/github-share-manifest.json',JSON.stringify({root,files:records,secretScan:'passed'},null,2));console.log(JSON.stringify({files:records.length,bytes:records.reduce((s,r)=>s+r.bytes,0),secretScan:'passed',root}));
})();
