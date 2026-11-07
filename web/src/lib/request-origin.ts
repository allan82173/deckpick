/** Next may normalize request.url internally; Host is the address the browser used. */
export function isSameOriginRequest(request:Request){
  const origin=request.headers.get("origin");if(!origin)return true;
  try{return new URL(origin).host===(request.headers.get("host")??new URL(request.url).host);}catch{return false;}
}
