import {persistedDeckSchema,type Deck,type DeckInput} from "./model";
import {design} from "./design";
const prefix="deckpick-saved-deck:";
type Shelf=Pick<Storage,"getItem"|"setItem"|"key"|"length">;
export function hasDeckContext(d:Deck){return !!(d.chat.setup.length||d.chat.outline.length||Object.values(d.chat.slides).some(log=>log.length)||d.attachments?.length||d.research.length||d.researchRecord||d.outline.length||Object.keys(d.candidates).length||Object.keys(d.edited).length||d.generation||d.execution);}
export function topicChangesSession(d:Deck,patch:Partial<DeckInput>,keepConversation=false){return !keepConversation&&patch.topic!==undefined&&patch.topic.trim()!==d.input.topic.trim()&&hasDeckContext(d);}
export function updateSetupInput(d:Deck,patch:Partial<DeckInput>,keepConversation=false):Deck{
 const input={...d.input,...patch},ds="designSystemId" in patch||"customPrimary" in patch?design(input.designSystemId,input.customPrimary):d.designSystem;
 if(!topicChangesSession(d,patch,keepConversation))return {...d,input,designSystem:ds};
 return {id:crypto.randomUUID(),input:{...input,purpose:patch.purpose??"",audience:patch.audience??"",publicSearchTopic:patch.publicSearchTopic??""},designSystem:structuredClone(ds),research:[],outline:[],candidates:{},picked:{},edited:{},chat:{setup:[],outline:[],slides:{}},demo:d.demo};
}
export function saveDeckArchive(storage:Shelf,deck:Deck){storage.setItem(prefix+deck.id,JSON.stringify({savedAt:new Date().toISOString(),deck}));}
export function loadDeckArchive(storage:Shelf,id:string):Deck|undefined{try{const raw=storage.getItem(prefix+id);if(!raw)return;const parsed=persistedDeckSchema.safeParse(JSON.parse(raw).deck);if(parsed.success&&parsed.data.id===id)return parsed.data as Deck;}catch{} }
export function listDeckArchives(storage:Shelf){const result:{id:string;topic:string;savedAt:string}[]=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(prefix))continue;try{const raw=JSON.parse(storage.getItem(key)??"null"),deck=loadDeckArchive(storage,key.slice(prefix.length));if(deck)result.push({id:deck.id,topic:deck.input.topic,savedAt:typeof raw.savedAt==="string"?raw.savedAt:""});}catch{}}return result.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));}
/** A response from a previous topic may finish after the user has switched tasks. */
export function appendSessionMessages(d:Deck|null,id:string,context:"setup"|"outline"|"slide",index:number,messages:Deck["chat"]["setup"]):Deck|null{if(!d||d.id!==id)return d;const chat={...d.chat};if(context==="slide")chat.slides={...chat.slides,[index]:[...(chat.slides[index]??[]),...messages]};else chat[context]=[...chat[context],...messages];return {...d,chat};}

/** Delete only a confirmed archived copy, never the active deck or uploaded files. */
export function deleteDeckArchive(storage:Shelf&Pick<Storage,"removeItem">,id:string,activeId:string|undefined,confirmDelete:(topic:string)=>boolean){
 if(id===activeId)return false;
 const archived=loadDeckArchive(storage,id);if(!archived||!confirmDelete(archived.input.topic||"제목 없는 작업"))return false;
 storage.removeItem(prefix+id);return true;
}
