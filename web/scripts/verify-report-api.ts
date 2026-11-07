import { readFile,writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
async function main(){
 const run=JSON.parse(await readFile("output/quality-execution/C/market-entry.json","utf8"));
 const body=JSON.stringify({deck:run.deck});
 const response=await fetch("http://localhost:3100/api/run-report",{method:"POST",headers:{"Content-Type":"application/json",Origin:"http://localhost:3100"},body});
 assert.equal(response.status,200);const saved=await response.json();
 const report=JSON.parse(await readFile(saved.paths.json,"utf8"));const markdown=await readFile(saved.paths.markdown,"utf8");
 assert.deepEqual(report,JSON.parse(saved.json));assert.equal(markdown,saved.markdown);assert.equal(report.execution.calls.length,run.deck.execution.calls.length);
 const blocked=await fetch("http://localhost:3100/api/run-report",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://example.invalid"},body});assert.equal(blocked.status,403);
 const result={status:response.status,crossOriginStatus:blocked.status,filename:saved.filename,calls:report.execution.calls.length,slides:report.slides.length,identicalStoredContent:true};await writeFile("output/quality-execution/report-api-smoke.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
