/** Keep long-running local/model requests active without repeating paid work. */
export function streamApiResponse(execute:()=>Promise<Response>,heartbeatMs:number){
 let closed=false,timer:ReturnType<typeof setInterval>|undefined;
 const encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({
  start(controller){
   const emit=(value:unknown)=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(value)+"\n"));};
   emit({type:"heartbeat"});
   timer=setInterval(()=>emit({type:"heartbeat"}),heartbeatMs);
   void (async()=>{
    try{const response=await execute();const body=await response.json();emit({type:"result",status:response.status,body});}
    catch{emit({type:"result",status:500,body:{error:"서버가 최종 응답을 만들지 못했습니다. 저장된 단계에서 이어서 생성해 주세요."}});}
    finally{clearInterval(timer);if(!closed){closed=true;controller.close();}}
   })();
  },
  // A closed tab must not cause a second execution or discard completed checkpoints.
  cancel(){closed=true;clearInterval(timer);},
 });
 return new Response(stream,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"}});
}

/** Recover the original status/body from a streamed response; old JSON routes still work. */
export async function readApiResponse(response:Response,onHeartbeat?:()=>void):Promise<Response>{
 if(!response.headers.get("Content-Type")?.includes("application/x-ndjson"))return response;
 if(!response.body)throw Error("서버 응답이 비어 있습니다. 저장된 단계에서 이어서 생성해 주세요.");
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";
 const result=(line:string)=>{
  if(!line.trim())return;
  const event=JSON.parse(line);
  if(event.type==="heartbeat"){onHeartbeat?.();return;}
  if(event.type!=="result")return;
  if(!Number.isInteger(event.status)||event.status<200||event.status>599||event.body===undefined)throw Error("서버 응답 형식을 읽지 못했습니다.");
  return Response.json(event.body,{status:event.status});
 };
 try{
  while(true){const chunk=await reader.read();buffer+=decoder.decode(chunk.value,{stream:!chunk.done});let split:number;
   while((split=buffer.indexOf("\n"))>=0){const line=buffer.slice(0,split);buffer=buffer.slice(split+1);const final=result(line);if(final){await reader.cancel();return final;}}
   if(chunk.done){const final=result(buffer);if(final)return final;break;}
  }
 }finally{reader.releaseLock();}
 throw Error("완료 응답 전에 서버 연결이 끊겼습니다. 같은 요청을 반복 전송하지 말고 저장된 단계에서 이어서 생성해 주세요.");
}
