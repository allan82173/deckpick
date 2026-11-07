import {slideSchema,type SlideSpec} from "./model";
export const exampleTopic="동네 책방 재방문 전략";
export const exampleSections=["표지","목차","고객 여정","원인 가설","대안 비교","실행 계획"];
const notes="서비스 구성을 보여주기 위한 가상 기획 예시입니다. 실제 조사 결과나 성과를 의미하지 않습니다.";
const rows=[
{layoutId:"c-cover",section:"표지",headline:exampleTopic,data:{title:exampleTopic,subtitle:"다시 찾고 싶은 동네 책방을 위한 서비스 제안",author:"DeckPick · 가상 기획 예시",coverStyle:"white"}},
{layoutId:"c-toc",section:"목차",headline:"고객 경험에서 출발해 실행할 대안을 정합니다",data:{items:["고객 여정과 불편","원인 가설 확인","대안 비교와 실행"]}},
{layoutId:"c-journey",section:"고객 여정",headline:"방문 이후에도 이어지는 접점을 설계합니다",data:{stages:[{title:"발견",action:"추천 글에서 책방을 발견",touchpoint:"SNS · 지도",friction:"어떤 책방인지 알기 어려움"},{title:"첫 방문",action:"서가를 둘러보고 책을 선택",touchpoint:"매장 · 직원 추천",friction:"취향에 맞는 책을 찾기 어려움"},{title:"재방문",action:"다음 방문의 계기를 찾음",touchpoint:"소식 · 프로그램",friction:"다시 방문할 이유가 약함"}],focus:2,takeaway:"검토 가설: 첫 방문의 관심을 다음 방문의 이유로 연결합니다."}},
{layoutId:"c-cause-tree",section:"원인 가설",headline:"재방문의 장벽을 세 가지 가설로 나눕니다",data:{problem:"관심이 실제 재방문으로 이어지지 않는 이유는 무엇일까요?",branches:[{title:"발견의 어려움",causes:["신간 안내가 흩어짐","추천 기준이 불명확함"]},{title:"연결의 부족",causes:["방문 후 접점이 없음","개인 취향을 이어가기 어려움"]},{title:"참여의 부담",causes:["모임 정보가 부족함","첫 참여의 부담이 큼"]}],status:"hypothesis",takeaway:"가설은 고객 인터뷰와 매장 관찰로 확인해야 합니다."}},
{layoutId:"c-compare",section:"대안 비교",headline:"작게 시작할 수 있는 대안부터 비교합니다",data:{options:["취향별 추천 소식","소규모 독서 모임","방문 기록 카드"],criteria:["고객에게 줄 가치","운영 시 필요한 것","먼저 확인할 질문"],cells:[["새 책을 발견할 계기","함께 읽는 경험","취향을 돌아보는 기록"],["추천 편집과 구독 동의","진행자와 참여 시간","간단한 기록 방식"],["어떤 소식을 원할까?","첫 참여 장벽은 무엇일까?","기록을 다시 꺼내 볼까?"]],recommended:0}},
{layoutId:"c-timeline",section:"실행 계획",headline:"고객 확인부터 시작해 작게 검증합니다",data:{steps:[{label:"1단계",title:"고객 이해",body:"인터뷰로 재방문 계기와 불편을 확인"},{label:"2단계",title:"시범 운영",body:"동의한 고객에게 취향별 추천 소식을 제공"},{label:"3단계",title:"결과 검토",body:"반응과 운영 부담을 비교해 다음 실험 결정"}]}}
];
export const exampleSlides:SlideSpec[]=rows.map(row=>slideSchema.parse({...row,sources:[],notes}));
