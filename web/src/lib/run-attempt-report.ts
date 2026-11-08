import {storageMkdir as mkdir, storageWrite as writeFile} from "./private-storage";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Deck } from "./model";
import { generationReport,reportMarkdown,reportFileDate } from "./run-report";
export async function saveAttemptReport(deck:Deck,action:string,status:number,error?:string){
 const report=generationReport(deck);const attempt={id:randomUUID(),action,httpStatus:status,status:deck.generation?.status??(status<400?"complete":"failed"),...(error?{error:error.replace(/sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g,"[인증 값 제거]")}:{})};
 const directory=path.join(process.cwd(),"output","run-reports","attempts");await mkdir(directory,{recursive:true});
 const filename=reportFileDate(report.generatedAt)+"_"+attempt.id;
 await writeFile(path.join(directory,filename+".json"),JSON.stringify({...report,attempt},null,2),{mode:0o600});
 await writeFile(path.join(directory,filename+".md"),reportMarkdown(report)+"\n## 실행 상태\n\n```json\n"+JSON.stringify({generation:report.generation,rejectedRows:report.rejectedRows,attempt},null,2)+"\n```\n",{mode:0o600});
 return filename;
}
