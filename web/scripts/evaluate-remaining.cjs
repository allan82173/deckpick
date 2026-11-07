const fs=require('node:fs/promises'),{spawn}=require('node:child_process');
(async()=>{
 const fixtures=JSON.parse(await fs.readFile('tests/fixtures/general-decks.json','utf8'));
 const jobs=['B','C'].flatMap(profile=>fixtures.slice(1).map(f=>({profile,id:f.id})));
 let cursor=0,stopped=false;
 async function worker(){while(!stopped&&cursor<jobs.length){const job=jobs[cursor++],file=`output/quality-execution/${job.profile}/${job.id}.json`;try{await fs.access(file);continue;}catch{}
  await new Promise(resolve=>{const child=spawn(process.execPath,['--import','tsx','scripts/evaluate-generation.ts',job.profile,job.id],{stdio:['ignore','pipe','pipe'],windowsHide:true});child.stdout.on('data',data=>process.stdout.write(data));child.stderr.on('data',data=>process.stderr.write(data));child.on('exit',resolve);});
  try{const result=JSON.parse(await fs.readFile(file,'utf8'));if(result.calls.some(c=>[401,403,429].includes(c.status)))stopped=true;}catch{}
 }}
 await Promise.all([worker(),worker()]);console.log(JSON.stringify({evaluationQueueFinished:true,stoppedForAccessOrQuota:stopped}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
