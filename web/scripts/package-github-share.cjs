const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),JSZip=require('jszip');
(async()=>{
 const manifest=JSON.parse(await fs.readFile('output/layout-expansion/github-share-manifest.json','utf8'));
 if(manifest.secretScan!=='passed')throw Error('Share package must pass the secret scan first.');
 const zip=new JSZip();for(const entry of manifest.files){const bytes=await fs.readFile(path.join(manifest.root,entry.path));if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Share file changed after scan: '+entry.path);zip.file(entry.path,bytes);}
 const directory='output/github-publish';await fs.mkdir(directory,{recursive:true});
 const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});await fs.writeFile(path.join(directory,'deckpick-source.zip'),bytes);
 const readme=await fs.readFile(path.join(manifest.root,'README.md'),'utf8');await fs.writeFile(path.join(directory,'README.md'),'이 비공개 저장소는 공유용 소스 패키지를 보관합니다. **deckpick-source.zip**을 내려받아 압축을 풀고 아래 실행 순서를 따라 주세요. GitHub의 Code → Download ZIP으로 받았다면, 안의 **deckpick-source.zip**도 한 번 압축을 풀어 주세요.\n\n'+readme);
 await fs.copyFile(path.join(manifest.root,'design-catalog.html'),path.join(directory,'design-catalog.html'));
 console.log(JSON.stringify({files:manifest.files.length,zipBytes:bytes.length,secretScan:manifest.secretScan}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
