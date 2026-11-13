/** Synthetic replies for offline transport tests, never real deck ratings. */
export const passedCriteria=()=>[1,2,3,4].map(criterion=>({criterion,passed:true,reason:"합성 검증의 지정 기준을 충족합니다.",improvement:""}));
export function visualFixture(body:Record<string,any>,warnings:string[]=[]){
 const input=Array.isArray(body.input)?body.input.flatMap((m:any)=>m.content??[]).find((c:any)=>c.type==="input_text")?.text:body.input;
 let payload:any={};try{payload=JSON.parse(String(input));}catch{}
 if(body.text?.format?.schema?.properties?.reviews)return {warnings,reviews:(payload.candidates??[]).map((s:any)=>({index:s.index,warnings:[],criteria:passedCriteria()}))};
 return {warnings,criteria:passedCriteria()};
}
