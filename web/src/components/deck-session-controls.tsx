"use client";
import {ChevronDown,FolderOpen,Plus,Trash2} from "lucide-react";
type SavedTask={id:string;topic:string;savedAt:string};
export function DeckSessionControls({archives,disabled,onNew,onRestore,onDelete}:{archives:SavedTask[];disabled:boolean;onNew:()=>void;onRestore:(id:string)=>void;onDelete:(id:string)=>void}){
 return <section className="deck-session-controls" aria-label="작업 전환">
  <button type="button" className="button new-topic-button" disabled={disabled} onClick={onNew}><Plus size={16}/>새 주제로 시작</button>
  {archives.length>0&&<details className="saved-task-picker">
   <summary aria-disabled={disabled} onClick={e=>{if(disabled)e.preventDefault();}}><span><FolderOpen size={16}/>보관된 작업 <small>{archives.length}개</small></span><ChevronDown size={16}/></summary>
   <div className="saved-task-panel"><p>불러올 작업을 골라 주세요. 현재 작업도 자동으로 보관됩니다.</p>
    <ul>{archives.map(task=><li key={task.id}><div><strong title={task.topic}>{task.topic||"제목 없는 작업"}</strong><small>{Number.isNaN(Date.parse(task.savedAt))?"저장된 작업":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",dateStyle:"short",timeStyle:"short"}).format(new Date(task.savedAt))}</small></div><div className="saved-task-actions"><button type="button" className="button" disabled={disabled} aria-label={`${task.topic||"제목 없는 작업"} 불러오기`} onClick={()=>onRestore(task.id)}>불러오기</button><button type="button" className="button saved-task-delete" disabled={disabled} aria-label={`${task.topic||"제목 없는 작업"} 삭제`} onClick={()=>onDelete(task.id)}><Trash2 size={14}/>삭제</button></div></li>)}</ul>
   </div>
  </details>}
 </section>;
}
