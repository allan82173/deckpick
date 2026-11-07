import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Deck } from "./model";
import { generationReport,reportMarkdown,reportFileDate } from "./run-report";
import { GENERATION_CONFIG } from "./generation-config";
export async function saveGenerationReport(deck:Deck){
 const report=generationReport(deck),json=JSON.stringify(report,null,2),markdown=reportMarkdown(report);
 const day=reportFileDate(report.generatedAt);
 const topic=report.topic.replace(/[<>:"/\\|?*\x00-\x1f]/g,"_").slice(0,GENERATION_CONFIG.reports.topicCharacters)||"untitled";
 const safeId=createHash("sha256").update(deck.id).digest("hex").slice(0,10),base=`${day}_${topic}_${safeId}`;
 const directory=path.join(process.cwd(),"output","run-reports");await mkdir(directory,{recursive:true});
 const mdPath=path.join(directory,base+".md"),jsonPath=path.join(directory,base+".json");
 // Same deck updates the same two files; different decks cannot collide by topic.
 await writeFile(mdPath,markdown,{encoding:"utf8",mode:0o600});await writeFile(jsonPath,json,{encoding:"utf8",mode:0o600});
 return {filename:base,markdown,json,paths:{markdown:mdPath,json:jsonPath}};
}
