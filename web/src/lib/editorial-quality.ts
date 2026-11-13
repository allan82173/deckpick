import {z} from "zod";

/** Inspect audience copy, never notes or the separately stored layout rationale. */
export function visibleProductionMetaIssue(text:string,topic=""):string|null {
 const plain=text.replace(/\*\*/g,"").replace(/\s+/g," ").trim();
 const deckSelfReference=/(?:이|본|해당)\s*(?:장표|슬라이드|덱)의?\s*(?:구성|레이아웃|형식|배치|시각화)|(?:이|본|해당)\s*(?:후보|레이아웃)(?:는|은|이|가|를|을)/.test(plain);
 const designIsSubject=/발표\s*(?:디자인|형식)|장표\s*(?:디자인|형식)|프레젠테이션\s*디자인|(?:문서|UI|UX|시각|정보)\s*디자인|레이아웃\s*(?:비교|연구|평가)|가독성\s*(?:연구|평가)|목차\s*(?:유형|형식)\s*(?:비교|연구)/i.test(topic);
 // A presentation about design may legitimately compare layouts as its subject.
 if(designIsSubject&&!deckSelfReference)return null;
 const formatComparison=/(?:요약표|번호형\s*목차|카드형\s*(?:구성|배치)?|순서형\s*흐름|레이아웃|장표\s*형식)(?:에|에서는|보다|은|는|이|가)?.{0,90}(?:보다|배치|구성|시각화|읽기)/.test(plain);
 const productionVerdict=/(?:읽기|비교하기|이해하기)\s*(?:에\s*)?(?:유리|편리|쉽|좋)|(?:구성|형식|배치|시각화|후보|레이아웃)(?:이|가|는|로)?\s*(?:가장\s*)?(?:적합|적절|유리)|(?:배치|시각화)(?:했|하였|합니다|했습니다)|(?:구성|형식)입니다|(?:후보|레이아웃)(?:를|을)\s*선택/.test(plain);
 return productionVerdict&&(deckSelfReference||formatComparison)?"내용의 결론 대신 장표 형식의 선택·배치 이유를 설명합니다. 형식 선택 이유는 내부 기록에 두고 관객에게는 해당 주제의 판단을 제시하세요.":null;
}

/** Application guidance adapted from Humanizer 2.8.2, without another model call. */
export const humanizerWritingRules=`문장 퇴고 기준(Humanizer): 실제 판단·원인·수치·조건을 평이한 한국어로 씁니다. '생존의 열쇠·새로운 패러다임' 같은 포장이나 임의 브랜드명으로 분석을 대신하지 않습니다. '이에 따라·그래서'를 모든 제목에 반복하지 말고 앞 장에서 생긴 질문에 구체적인 내용으로 답합니다. 불필요한 삼단 나열·격언·과장·명사 연결·대비 구문·기계적 강조를 줄입니다. 주체와 행동을 명확히 쓰고 번역투를 피합니다. 정확한 수치·단위·비교 범위·고유명사·불확실성은 보존합니다. 전문 분석에 경험·감정·인용을 새로 만들지 않습니다. 문장을 고쳤다고 근거가 강해졌다고 평가하지 않습니다.`;

export const slideAcceptanceRules=`모든 장을 네 기준으로 판단합니다.
1. 키메시지: 이 장의 구체적 결론을 말하고, 앞뒤 장의 질문과 답이 이어지는가. 접속어만 붙였다고 연결됐다고 평가하지 않습니다.
2. 본문: 제목의 원인·크기·선택을 본문의 수치·비교·구조가 뒷받침하는가. 같은 문장을 상자에 반복한 것은 근거가 아닙니다.
3. 가시화: 그 관계를 가장 직접적으로 보여 주는 구성인가. 원인·기여분은 분해/워터폴, 기간별 변화는 시계열, 경로는 흐름/네트워크, 선택은 기준과 대안 비교로 검토합니다. 카드나 As-Is/To-Be를 기본값으로 강제하지 않습니다. 적합한 다른 구성 하나와 비교해 선택 이유 또는 바꿀 구성을 적습니다. 섹션 구분으로 본문 분석을 대체하지 않습니다.
4. 제출: 그대로 제출하기에 필요한 주요 수정이 남는가. 넘침뿐 아니라 빈약한 내용·낮은 대비·과밀·공백·무의미한 반복을 봅니다. 추상적 칭찬 대신 실제 보이는 요소를 근거로 판단합니다.
원자료가 부족하면 부족한 판단과 필요한 자료를 밝힙니다. 좋은 표현이나 형식으로 분석 공백을 통과시키지 않습니다.`;
export const acceptanceCriterionSchema=z.object({criterion:z.number().int().min(1).max(4),passed:z.boolean(),reason:z.string().min(1).max(350),improvement:z.string().max(350)});
export const acceptanceCriteriaSchema=z.array(acceptanceCriterionSchema).length(4);
export type AcceptanceCriterion=z.infer<typeof acceptanceCriterionSchema>;
export function validateAcceptanceCriteria(criteria:AcceptanceCriterion[]){if(criteria.length!==4||new Set(criteria.map(c=>c.criterion)).size!==4)throw Error("네 가지 기준을 각각 한 번씩 검사하세요.");}
export function acceptanceWarnings(criteria:AcceptanceCriterion[]){validateAcceptanceCriteria(criteria);return criteria.filter(c=>!c.passed).map(c=>`품질 기준 ${c.criterion} 미달: ${c.reason}${c.improvement?` · 수정: ${c.improvement}`:""}`);}
export function editorialCoverage(reviews:({status:string;criteria?:AcceptanceCriterion[]}|undefined)[]){
 let passed=0,failed=0,unchecked=0;
 for(const review of reviews){if(!review?.criteria||review.criteria.length!==4||new Set(review.criteria.map(c=>c.criterion)).size!==4){unchecked++;continue;}if(review.status==="passed"&&review.criteria.every(c=>c.passed))passed++;else failed++;}
 return {total:reviews.length,passed,failed,unchecked,allPagesPassed:reviews.length>0&&passed===reviews.length,notice:"모델의 네 기준 검토 기록이며 사람의 최종 제출 승인을 대신하지 않습니다."};
}
