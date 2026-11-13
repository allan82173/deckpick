import type {DeckInput,OutlineItem,SlideSpec} from "./model";
import type {Evidence} from "./evidence-model";
const displayDate=(value:string)=>/^\d{4}-\d{2}-\d{2}/.exec(value)?.[0]??value;

/** Source metadata already exists; do not ask a model to invent another table. */
export function sourceBibliography(input:DeckInput,item:OutlineItem,evidence:Evidence[]):SlideSpec|undefined{
 if(!input.appendSources||item.index!==input.slideCount-1)return;
 const rows=[...new Map(evidence.filter(e=>e.kind==="공개 사실"&&/^https?:\/\//.test(e.url)).map(e=>[e.url,e])).values()];
 if(!rows.length||rows.length>14)return;
 return {layoutId:input.deckType==="consulting"?"c-evidence-scope":"m-evidence-scope",section:"출처",headline:"이 발표에서 검토한 원문 자료입니다.",role:"근거",contentContract:item.contentContract,evidenceRefs:rows.map(e=>e.id),
  data:{mode:"bibliography",rows:rows.map(e=>({code:e.id,material:e.title,supports:"원문 자료",limits:e.originalVerified?"사용 범위는 발표자 노트 참고":"원문 대조 미완료",url:e.url,dateLabel:e.publishedAt?`발행 ${displayDate(e.publishedAt)}`:`확인 ${displayDate(e.checkedAt)}`})),takeaway:"원문 링크를 클릭해 자료를 확인할 수 있습니다. 적용 범위는 발표자 노트에 수록했습니다."},
  sources:rows.map(e=>({title:e.title.slice(0,120),url:e.url,usedFor:e.claim})),notes:rows.map(e=>`[${e.id}] ${e.title}\n${e.url}\n발행일 ${e.publishedAt||"미확인"} · 확인일 ${e.checkedAt}\n적용 범위: ${e.claim}\n${e.originalVerified?"원문 대조 완료":"원문 대조 미완료"}`).join("\n\n")};
}
