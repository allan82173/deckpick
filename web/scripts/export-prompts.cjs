const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const web = path.resolve(__dirname, '..');
const root = path.resolve(web, '..');
const output = path.join(root, 'docs', 'DeckPick-전체-프롬프트.md');
const files = [];
function walk(directory) { for (const entry of fs.readdirSync(directory, {withFileTypes:true})) { const p=path.join(directory,entry.name); if(entry.isDirectory()) walk(p); else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(p); } }
walk(path.join(web, 'src'));
const documents = files.map(file => ({file, text: fs.readFileSync(file,'utf8'), source: ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)}));
const relative = file => 'web/' + path.relative(web,file).replaceAll('\\','/');
const lineOf = (document,node) => document.source.getLineAndCharacterOfPosition(node.getStart(document.source)).line + 1;
const block = (language, source) => { const runs=String(source).match(/`{3,}/g)??[];const fence='`'.repeat(Math.max(3,...runs.map(run=>run.length+1)));return fence+language+'\n'+source+'\n'+fence+'\n'; };
function declaration(document, name) { let value; function visit(node) { if(ts.isVariableDeclaration(node) && node.name.getText(document.source)===name) value=node; ts.forEachChild(node,visit); } visit(document.source); return value; }
function functionNode(document,name) { let value;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)value=node;ts.forEachChild(node,visit);}visit(document.source);return value;}
const descriptions = {
  'interpretTask':'과제 해석', 'planResearch':'핵심 질문별 조사 계획', 'runResearch':'후속 검색 / 원문 근거표 추출',
  'createStoryline':'현재 판단 / 장별 주장 지도 / 제목 개별 교정', 'assessDeck':'덱 전체 논리 검토',
  'slideConversation':'장별 AI 대화·문구 수정', 'generateCandidateBatch':'장별 후보 내용 생성',
  'generateCandidates':'삽입 장의 역할·근거 선택 / 후보 품질 보완', 'generateOutline':'구형 목차 생성 함수 — 현재 앱 경로에서 미사용',
};
function enclosingFunction(node, source) { let p=node.parent; while(p) { if(ts.isFunctionDeclaration(p)) return p.name?.text || '(익명 함수)'; if(ts.isArrowFunction(p)||ts.isFunctionExpression(p)) { if(ts.isVariableDeclaration(p.parent))return p.parent.name.getText(source); } p=p.parent; } return '(모듈)'; }
const sections=[];
sections.push('# DeckPick 전체 프롬프트와 생성 계약\n');
sections.push('추출 기준일: 2026-11-14. 이 문서는 현재 앱 소스에서 자동 추출한 원문과 동적 조합식을 함께 제공합니다. 실제 API 키·토큰·인증 헤더 값·사용자의 첨부 원문·실제 대화·모델 응답 로그는 포함하지 않습니다. 앱의 코드는 변경하지 않습니다.\n');
sections.push('## 읽는 방법\n\n한 개의 긴 시스템 프롬프트로 모두 보내는 구조가 아닙니다. 같은 선택 모델을 과제 해석 → 조사 계획 → 전체 첨부 근거표·질문별 두 언어 검색(generation-config.ts에 지정된 라운드)과 원문 근거표 → 판단 → 스토리라인 → 장별 후보 생성 → 검사·수정에 여러 번 호출합니다. 단계마다 아래의 서로 다른 프롬프트와 JSON 데이터가 들어갑니다.\n\n- `text` 블록은 문구 원문입니다.\n- `ts` 블록은 실제로 전송 문자열을 조합하는 코드입니다. `${...}`·변수·`JSON.stringify(...)`는 실행 때 현재 입력으로 채워집니다. 이 문서에 임의의 프로젝트 내용을 채우지 않았습니다.\n- 출력 JSON 스키마·허용 레이아웃·검사기는 프롬프트와 함께 결과를 제한합니다. 프롬프트만 Claude에 붙이는 실험은 같은 렌더러·검색 도구·첨부 추출·검사 조건을 재현하지 않습니다.\n- `generateOutline()`은 보존된 구형 함수이며 현재 UI/API의 새 생성은 `prepareTask/runResearch/createStoryline` 경로입니다. 구형 함수는 아래에서 따로 표시합니다.\n');
sections.push('## 1. 공통 시스템 프롬프트\n');
for (const name of ['baseSystem','slideCompositionPrompt','consultingStylePrompt','consultingAnalysisRules','humanizerWritingRules','slideAcceptanceRules','systemFor']) {
 const document=documents.find(d=>declaration(d,name));if(!document)continue;const node=declaration(document,name);const value=node.initializer;
 sections.push(`### ${name}\n\n출처: \`${relative(document.file)}:${lineOf(document,node)}\`\n`);
 if(ts.isStringLiteral(value)||ts.isNoSubstitutionTemplateLiteral(value)) sections.push(block('text',value.text));else sections.push(block('ts',value.getText(document.source)));
}
sections.push('### 모델 호출 조건도 비교에 포함해야 하는 이유\n\n모델명은 사용자가 연결한 설정을 사용하며 파이프라인 전체에 같은 연결을 전달합니다. 현재 단계별 effort·출력 한도는 아래 generation-config.ts 실제 설정을 따릅니다. Luna와 Claude native structured 출력 분기 모두 같은 단계 설정을 적용합니다. 프롬프트를 옮길 때 모델·추론 강도·출력 한도·검색 지원이 다르면 같은 결과를 기대할 수 없습니다. 아래는 인증 값을 제외한 실제 요청 본문 조합식입니다.\n');
const transportDocument=documents.find(d=>d.file.endsWith(path.sep+'ai.ts'));
const transportFunction=functionNode(transportDocument,'providerCall');
if(transportFunction){let requestBody;function findBody(node){if(ts.isPropertyAssignment(node)&&node.name.getText(transportDocument.source)==='body')requestBody=node.initializer;ts.forEachChild(node,findBody);}findBody(transportFunction);if(requestBody)sections.push(`출처: \`${relative(transportDocument.file)}:${lineOf(transportDocument,requestBody)}\`\n`+block('ts',requestBody.getText(transportDocument.source)));}
sections.push('## 2. 공개 검색 프롬프트·도구\n');
const ai=documents.find(d=>d.file.endsWith(path.sep+'ai.ts'));
for(const name of ['research','keyCheck']) {const node=functionNode(ai,name);sections.push(`### ${name}\n\n출처: \`${relative(ai.file)}:${lineOf(ai,node)}\`\n${name==='keyCheck'?'연결 검사만 수행합니다. 발표 제작 프롬프트가 아닙니다.':'실제 공개 검색에 전달되는 문구와 제공자별 검색 도구 설정입니다. query는 공개 맥락만으로 만들어집니다.'}\n`);sections.push(block('ts',node.getText(ai.source)));}
sections.push('## 3. 단계별 모델 호출 원문과 동적 입력\n');
let ordinal=0;
const legacy=[];
for(const document of documents) {function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(document.source)==='structured'&&node.arguments.length>=4){const fn=enclosingFunction(node,document.source);const info={doc:document,node,fn};if(fn==='generateOutline')legacy.push(info);else emit(info);}ts.forEachChild(node,visit);}function emit(info){const {doc,node,fn}=info;ordinal++;sections.push(`### ${ordinal}. ${descriptions[fn]??fn}\n\n호출 위치: \`${relative(doc.file)}:${lineOf(doc,node)}\` / 함수 \`${fn}\`\n`);const sys=node.arguments[2];sections.push('시스템 지시문\n');if(ts.isStringLiteral(sys)||ts.isNoSubstitutionTemplateLiteral(sys))sections.push(block('text',sys.text));else sections.push(block('ts',sys.getText(doc.source)));sections.push('동적 사용자 입력·공유 맥락\n'+block('ts',node.arguments[3].getText(doc.source)));sections.push('응답 계약\n'+block('ts',node.arguments[1].getText(doc.source)));if(node.arguments[4])sections.push('해당 호출의 추가 검증. 실패 시 아래의 형식 재시도 문구에 오류 이유가 붙습니다.\n'+block('ts',node.arguments[4].getText(doc.source)));}visit(document.source);}
sections.push('## 4. 화면·재생성이 덧붙이는 지시문\n');
let extras=0;
for(const document of documents){function visit(node){let name=null,value=null;if(ts.isPropertyAssignment(node)&&node.name.getText(document.source)==='instruction'){name='instruction';value=node.initializer;}if(ts.isVariableDeclaration(node)&&['repairInstruction'].includes(node.name.getText(document.source))){name=node.name.getText(document.source);value=node.initializer;}if(ts.isCallExpression(node)&&['generateCandidates','generateCandidateBatch'].includes(node.expression.getText(document.source))&&node.arguments.length>=5){const v=node.arguments[4];if(ts.isTemplateExpression(v)||ts.isStringLiteral(v)){name='후보 생성에 넘기는 수정 지시';value=v;}}if(ts.isBinaryExpression(node)&&node.left.getText(document.source)==='value'&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isBinaryExpression(node.right)&&node.right.operatorToken.kind===ts.SyntaxKind.BarBarToken&&ts.isStringLiteral(node.right.right)&&node.right.right.text.includes('첨부한 사진')){name='사진만 첨부한 경우 기본 요청';value=node.right.right;}if(name&&value){extras++;sections.push(`### ${extras}. ${name}\n\n출처: \`${relative(document.file)}:${lineOf(document,node)}\`\n`);sections.push(block(ts.isStringLiteral(value)?'text':'ts',ts.isStringLiteral(value)?value.text:value.getText(document.source)));}ts.forEachChild(node,visit);}visit(document.source);}
sections.push('## 5. 이미지 첨부에 추가되는 문구\n');
const vision=documents.find(d=>d.file.endsWith(path.sep+'vision.ts'));const visionFn=functionNode(vision,'withImageInputs');sections.push(`출처: \`${relative(vision.file)}:${lineOf(vision,visionFn)}\`. 아래 base64 변수는 이미지 전달 형식을 설명하는 코드이며 실제 이미지·내용은 아닙니다.\n`+block('ts',visionFn.getText(vision.source)));
sections.push('## 6. 공통 형식 오류·검증 재시도\n');
const structured=functionNode(ai,'structured');sections.push(`출처: \`${relative(ai.file)}:${lineOf(ai,structured)}\`. 최초 응답 뒤 JSON·스키마·검증 실패 이유를 추가하여 같은 모델에 요청합니다. 구조 검증 재시도와 장별 품질 수정 예산은 별개입니다.\n`+block('ts',structured.getText(ai.source)));
sections.push('## 7. 장 역할·출력 스키마·레이아웃 정보\n\n장 역할 → 허용 레이아웃 매핑과 각 레이아웃 데이터 스키마가 입력에 함께 들어갑니다. 후보를 고르는 코드의 조건도 프롬프트의 효력을 제한하므로 같이 제공합니다.\n');
for(const filename of ['task-model.ts','evidence-model.ts','consulting-policy.ts','consulting-visuals.ts','content-contract.ts','copy-budgets.ts','candidate-plan.ts','candidate-usability.ts','slide-quality.ts','editorial-quality.ts','chart-semantics.ts','source-bibliography.ts','evidence-selection.ts','concurrency.ts','run-budget.ts','run-checkpoints.ts']){const document=documents.find(d=>d.file.endsWith(path.sep+filename));if(!document)continue;sections.push(`### ${filename}\n\n출처: \`${relative(document.file)}:1\`\n`+block('ts',document.text));}
sections.push('### 출력 스키마 파일과 동적 레지스트리\n\n- `web/src/lib/model.ts`: DeckInput, OutlineItem, SlideSpec 및 기존 레이아웃 dataSchemas.\n- `web/src/lib/analytical-layouts.ts`, `visual-model.ts`: 공용 본문 구조의 필드·최소/최대 데이터.\n- 새 확장 레이아웃·메타데이터는 아래 자동 스키마 부록과 다음 절에 포함됩니다.\n');
try {
 const model=require(path.join(web,'src/lib/model.ts')); const demo=require(path.join(web,'src/lib/demo.ts'));const quality=require(path.join(web,'src/lib/slide-quality.ts'));const evidence=require(path.join(web,'src/lib/evidence-model.ts'));const z=require('zod');
 const roles={};for(const type of ['consulting','marketing'])roles[type]=Object.fromEntries(evidence.slideRoles.map(role=>[role,quality.roleLayouts(type,role)]));
 sections.push('### 실행 시점 장 역할 매핑\n'+block('json',JSON.stringify(roles,null,2)));
 const neutral={index:2,section:'분석',message:'제공된 근거에 따라 현재의 선택과 한계를 구분합니다.',contentHint:'중립적인 구성 예시이며 실제 프로젝트 결과가 아닙니다.'};
 const registry=model.layoutIds.map(id=>({id,name:model.layoutNames[id],schema:z.z.toJSONSchema(model.dataSchemas[id],{unrepresentable:'any'}),syntheticExample:demo.sampleData(id,neutral)}));
 sections.push('### 전체 레이아웃의 실제 데이터 계약·중립 예시\n\n아래는 실제 사용자 입력이 아닌 `sampleData()`에 중립 문장을 전달해 얻은 합성 예시입니다. 생성 단계는 전체가 아니라 해당 호출에서 허용된 레이아웃의 schema/example만 전송합니다.\n'+block('json',JSON.stringify(registry,null,2)));
} catch(error) {throw Error('전체 스키마를 읽지 못했습니다. node --import tsx scripts/export-prompts.cjs 로 실행하세요. '+String(error.message));}
sections.push('## 8. 이번 레이아웃 확장 시 추가·변경된 지시문\n\n이 절은 구현 완료 후 exporter를 재실행하면 새 코드의 structured 호출·역할 매핑·스키마를 위 절에 반영합니다. 레지스트리의 “역할 / 쓸 때 / 쓰지 않을 때 / 최소 데이터”가 실제 생성 payload에 포함되는지도 함께 확인해야 합니다. 숫자·날짜·이미지·표본 정보 부족 시 레이아웃이 실패하는 검사 규칙도 프롬프트와 별개로 작동합니다.\n');
const expandedFile = path.join(web,'src/lib/expanded-layouts.ts');
if(fs.existsSync(expandedFile)) {
 sections.push('### expanded-layouts.ts — 새 레이아웃 스키마·레지스트리 원문\n\n출처: `web/src/lib/expanded-layouts.ts:1`\n'+block('ts',fs.readFileSync(expandedFile,'utf8')));
 try {
  const expanded=require(expandedFile); const metadata=Object.fromEntries(Object.entries(expanded).filter(([key,value])=>/registry|metadata|descriptions|definitions/i.test(key)&&typeof value!=='function'));
  sections.push('### 새 레이아웃 메타데이터 실행 시점 스냅샷\n'+block('json',JSON.stringify(metadata,null,2)));
 } catch(error) {throw Error('확장 레지스트리를 읽지 못했습니다. '+String(error.message));}
}
const executionConfigFile=path.join(web,'src/lib/generation-config.ts');
if(fs.existsSync(executionConfigFile))sections.push('## 실행 조건 · 실제 설정 원문\n\n'+block('ts',fs.readFileSync(executionConfigFile,'utf8')));
sections.push('## 9. 구형·현재 미사용 프롬프트\n\n다음 함수는 소스에 남아 있지만 현재 앱 소스의 호출 참조가 확인되지 않았습니다. 새 파이프라인의 기본 프롬프트로 섞지 마세요.\n');for(const {doc,node,fn}of legacy){const whole=functionNode(doc,fn);sections.push(`### ${fn}\n\n출처: \`${relative(doc.file)}:${lineOf(doc,whole)}\`\n`+block('ts',whole.getText(doc.source)));}
sections.push('## 10. 코드로 옮긴 참고 지침과 원본의 구분\n\n아래 문서는 작업·설계 기준입니다. 문서 전체가 매 API 요청에 자동으로 붙는 것은 아닙니다. 실제로 붙는 내용은 1~7절의 코드 원문입니다. Claude 원본 스킬셋과 참고 PPT 원문은 이 내보내기에 복제하지 않았습니다.\n');
for(const name of ['consulting-output-contract.md','Claude-PPT-스킬셋-적용기준.md','장표-구성-원칙.md','범용-생성품질-요구사항-2026-11-06.md','컨설팅스타일분석.md','마케팅스타일분석.md']){const file=path.join(root,'docs',name);if(fs.existsSync(file)) sections.push(`### ${name}\n\n출처: \`docs/${name}:1\` / 역할: 참고 지침\n`+block('markdown',fs.readFileSync(file,'utf8')));}
sections.push('## 비교할 때 특히 볼 차이\n\n1. Claude가 자료 전체와 대화 전체를 보고 있는지, DeckPick이 추출·선택한 발췌만 보는지 비교합니다.\n2. 검색 도구·원문 접근·최신 출처 확인이 양쪽에서 같은 조건인지 비교합니다.\n3. 허용 레이아웃과 구조화 출력 schema가 다른지 비교합니다.\n4. “원하는 스타일”이라는 문구 외에 판단·반전 조건·근거 강도·계산 단위·인용 검증이 실제 코드로 연결되어 있는지 비교합니다.\n5. 프롬프트 지침과 코드의 검사·재시도·렌더링 제약을 구분합니다.\n\n이 문서는 학습 완료·파인튜닝·모든 결과의 품질 보증을 뜻하지 않습니다. 현재 앱에 전달되는 지침·계약을 검토할 수 있도록 추출한 문서입니다.\n');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,sections.join('\n'),'utf8');
const compact=[];let skip=false;
for(const section of sections){if(section.startsWith('## 7.'))skip=true;if(section.startsWith('## 8.'))skip=false;if(!skip&&!section.startsWith('### expanded-layouts.ts')&&!section.startsWith('### 새 레이아웃 메타데이터'))compact.push(section);}
const compactOutput=path.join(root,'docs','DeckPick-프롬프트-비교용.md');
fs.writeFileSync(compactOutput,compact.join('\n').replace('# DeckPick 전체 프롬프트와 생성 계약','# DeckPick 프롬프트 비교용 — 본문·동적 입력 중심')+'\n전체 레이아웃 스키마·검사기 원문·실행 시점 역할 매핑은 `DeckPick-전체-프롬프트.md`에 있습니다. 이 비교용은 그 대용량 구조 부록만 덜어낸 판본입니다.\n','utf8');
console.log(JSON.stringify({output,structuredCalls:ordinal,extraInstructions:extras,bytes:fs.statSync(output).size}));
