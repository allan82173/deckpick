import {encode} from "gpt-tokenizer/encoding/o200k_base";
import {GENERATION_CONFIG} from "./generation-config";
import type {CallMetric} from "./execution-model";
/** No request text is stored: this is a length estimate, not provider billing usage. */
export function estimateRequestInput(payload:unknown,imageCount=0){
 const text=JSON.stringify(payload,(_key,value)=>typeof value==="string"&&value.startsWith("data:image/")?"[image omitted]":value);
 return {requestCharacters:text.length,estimatedInputTokens:encode(text).length+imageCount*GENERATION_CONFIG.measurement.imageInputFallbackTokens,estimationMethod:`${GENERATION_CONFIG.measurement.encoding} request JSON; image fallback ${imageCount} × ${GENERATION_CONFIG.measurement.imageInputFallbackTokens}; hidden tool context excluded`};
}
export function inputUsage(calls:CallMetric[]){const measured=calls.reduce((n,c)=>n+(c.inputTokens??0),0),estimated=calls.filter(c=>c.inputTokens===undefined).reduce((n,c)=>n+(c.estimatedInputTokens??0),0),unestimated=calls.filter(c=>c.inputTokens===undefined&&c.estimatedInputTokens===undefined).length;return {measured,estimated,total:measured+estimated,estimatedCalls:calls.filter(c=>c.inputTokens===undefined&&c.estimatedInputTokens!==undefined).length,unestimatedCalls:unestimated,label:estimated?"추정 포함":"제공자 반환값",limitations:"추정치는 요청 입력 길이 기준이며 도구 내부 검색 문맥·실제 과금량과 다를 수 있습니다."};}
