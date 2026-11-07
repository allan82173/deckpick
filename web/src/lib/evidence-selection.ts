import { GENERATION_CONFIG } from "./generation-config";
import type { Evidence,ResearchRecord } from "./evidence-model";
import type { OutlineItem } from "./model";
import { materialTypes } from "./task-model";
const normalized=(value:string)=>value.normalize("NFKC").replace(/\s+/g," ").trim().toLowerCase();
export function deduplicateDecisions<T extends {text:string}>(rows:readonly T[]=[]):T[]{return [...new Map([...rows].reverse().map(r=>[normalized(r.text),r])).values()].reverse();}
export function internalEvidence(rows:readonly Evidence[]){return [...new Map(rows.filter(r=>r.kind==="내부 전제").map(r=>[normalized(r.locator??"")+"|"+normalized(r.claim),r])).values()];}
export function slideEvidenceIds(item:OutlineItem){return [...new Set([...(item.evidenceRefs??[]),...(item.argument?.support.flatMap(s=>s.evidenceRefs)??[]),...(item.calculation?.assumptions.flatMap(a=>a.evidenceRefs)??[])])];}
export function slideEvidence(rows:readonly Evidence[],refs:readonly string[]=[]){const wanted=new Set(refs);return rows.filter(r=>wanted.has(r.id)||r.aliasIds?.some(id=>wanted.has(id)));}
function rank(a:Evidence,b:Evidence){const match=(e:Evidence)=>e.contextMatch==="일치"?3:e.contextMatch==="부분 일치"?2:e.contextMatch==="비교 참고"?1:0;return match(b)-match(a)||Number(!!b.originalVerified)-Number(!!a.originalVerified)||(materialTypes.indexOf(a.materialType??"블로그·커뮤니티")-materialTypes.indexOf(b.materialType??"블로그·커뮤니티"))||((Date.parse(b.publishedAt??"")||0)-(Date.parse(a.publishedAt??"")||0));}
export function verifiedQuestionEvidence(e:Evidence,questionId:string){return [{...e,questionIds:e.primaryQuestionIds??e.questionIds},...(e.relatedFacts??[])].some(f=>f.questionIds?.includes(questionId)&&f.originalVerified&&f.contextMatch==="일치");}
export function deduplicateEvidence(rows:readonly Evidence[]):Evidence[]{
 const groups=new Map<string,Evidence[]>();const known=new Map<string,string>();
 for(const row of rows){let key=row.kind==="내부 전제"?"internal:"+normalized(row.locator??"")+"|"+normalized(row.claim):row.url;try{const parsed=new URL(key);parsed.hash="";for(const name of [...parsed.searchParams.keys()])if(/^utm_/i.test(name))parsed.searchParams.delete(name);key=parsed.href;}catch{}
  const sameSource=row.publishedAt&&row.title.length>=8?normalized(row.title)+"|"+row.publishedAt+"|"+normalized(row.claim):undefined;
  key=(sameSource&&known.get(sameSource))||key;if(sameSource)known.set(sameSource,key);const group=groups.get(key)??[];group.push(row);groups.set(key,group);
 }
 return [...groups.values()].map(group=>{const sorted=[...group].sort(rank),main=sorted[0];const facts=[...new Map([...sorted.flatMap(e=>[{claim:e.claim,originalText:e.originalText,originalVerified:e.originalVerified,verificationStatus:e.verificationStatus,contextMatch:e.contextMatch,contextReason:e.contextReason,questionIds:e.primaryQuestionIds??e.questionIds,locator:e.locator,publishedAt:e.publishedAt},...(e.relatedFacts??[])])].reverse().map(f=>[normalized(f.claim)+"|"+(f.questionIds??[]).join(","),f])).values()].reverse();return {...main,id:group[0].id,primaryQuestionIds:main.primaryQuestionIds??main.questionIds,questionIds:[...new Set(group.flatMap(e=>e.questionIds??[]))],aliasIds:[...new Set(group.flatMap(e=>[e.id,...(e.aliasIds??[])]))].filter(id=>id!==group[0].id),...(facts.length>1?{relatedFacts:facts.slice(1)}:{})};});
}
export function topQuestionEvidence(record:ResearchRecord){const selected=new Map<string,Evidence>();for(const q of record.analysis?.questions??[]){for(const e of record.evidence.filter(e=>e.kind!=="내부 전제"&&e.questionIds?.includes(q.id)).sort(rank).slice(0,GENERATION_CONFIG.efficiency.evidencePerQuestion))selected.set(e.id,e);}return [...internalEvidence(record.evidence),...selected.values()];}
export function sourceFactsForPrompt(rows:readonly Evidence[]){return rows.map(row=>{if(row.kind==="내부 전제")return row;const {originalText:_originalText,...rest}=row;return {...rest,...(row.relatedFacts?{relatedFacts:row.relatedFacts.slice(0,GENERATION_CONFIG.efficiency.factsPerSourceInPrompt-1).map(({originalText:_quote,...fact})=>fact)}:{})};});}
export function evidenceExcerpt(text:string,query:string,maximum=GENERATION_CONFIG.efficiency.excerptCharactersPerPage){
 if(text.length<=maximum)return text;
 const paragraphs=text.split(/\n\s*\n|(?<=[.!?。！？])\s+/u).map(s=>s.trim()).filter(Boolean).flatMap(p=>Array.from({length:Math.ceil(p.length/GENERATION_CONFIG.efficiency.paragraphChunkCharacters)},(_,i)=>p.slice(i*GENERATION_CONFIG.efficiency.paragraphChunkCharacters,(i+1)*GENERATION_CONFIG.efficiency.paragraphChunkCharacters)));
 const terms=[...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)??[]))];
 const ranked=paragraphs.map((text,index)=>({text,index,score:terms.reduce((n,term)=>n+(text.toLowerCase().includes(term)?1:0),0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
 const selected=new Set<number>();let size=0;for(const p of ranked){if(!p.score&&selected.size)break;const group:number[]=[];for(let i=Math.max(0,p.index-GENERATION_CONFIG.efficiency.adjacentParagraphs);i<=Math.min(paragraphs.length-1,p.index+GENERATION_CONFIG.efficiency.adjacentParagraphs);i++)if(!selected.has(i))group.push(i);const amount=group.reduce((n,i)=>n+paragraphs[i].length+2,0);if(size+amount>maximum&&selected.size)continue;for(const i of group)selected.add(i);size+=amount;if(size>=maximum)break;}
 return [...selected].sort((a,b)=>a-b).map(i=>paragraphs[i]).join("\n\n").slice(0,maximum);
}
