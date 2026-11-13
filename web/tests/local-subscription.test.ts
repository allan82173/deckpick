import test from "node:test";
import assert from "node:assert/strict";
import { cliEnvironment, codexArgs, extractLocalJson, isLoopbackCliRequest, localAgentsEnabled, withLocalAgentSlot, localStructuredContent } from "../src/lib/local-agent";
import { providerTimeout } from "../src/lib/run-budget";
import { connection, providerCall } from "../src/lib/ai";

function withMode<T>(fn:()=>T):T {
  const keys = ["DECKPICK_CLI_ONLY","VERCEL","NEXT_PUBLIC_DEMO_ONLY"] as const;
  const before = keys.map(key => process.env[key]);
  process.env.DECKPICK_CLI_ONLY="1"; delete process.env.VERCEL; delete process.env.NEXT_PUBLIC_DEMO_ONLY;
  try { return fn(); } finally { keys.forEach((key,i)=>{ if(before[i]===undefined) delete process.env[key]; else process.env[key]=before[i]; }); }
}
test("CLI environment excludes API keys, OAuth environment tokens and inherited provider overrides",()=>{
  const clean=cliEnvironment({ NODE_ENV:"production", PATH:"safe", USERPROFILE:"profile", OPENAI_API_KEY:"test-secret", ANTHROPIC_API_KEY:"test-secret", CODEX_API_KEY:"test-secret", CLAUDE_CODE_OAUTH_TOKEN:"test-token", ANTHROPIC_BASE_URL:"https://invalid.example", CUSTOM_SECRET:"test-secret" });
  assert.equal(clean.PATH,"safe"); assert.equal(clean.USERPROFILE,"profile");
  for(const key of ["OPENAI_API_KEY","ANTHROPIC_API_KEY","CODEX_API_KEY","CLAUDE_CODE_OAUTH_TOKEN","ANTHROPIC_BASE_URL","CUSTOM_SECRET"]) assert.equal(clean[key],undefined);
});
test("CLI requires loopback host and same-origin browser request; remote and missing origins fail",()=>{
  for(const host of ["localhost:3100","127.0.0.1:3100","[::1]:3100"]) assert.ok(isLoopbackCliRequest(new Request(`http://${host}/api/key-check`,{headers:{host,origin:`http://${host}`}})));
  for(const [host,origin] of [["localhost:3100","https://evil.example"],["evil.example","https://evil.example"],["localhost:3100",""]]) assert.equal(isLoopbackCliRequest(new Request(`http://${host}/api/key-check`,{headers:{host,...(origin?{origin}:{})}})),false);
});
test("subscription mode ignores even explicitly supplied API keys and routes Codex/Claude separately",()=>withMode(()=>{
  const request=new Request("http://localhost:3100/api/key-check",{headers:{host:"localhost:3100",origin:"http://localhost:3100","x-user-api-key":"test-secret"}});
  assert.deepEqual(connection(request,{provider:"openai",model:"default"}).localAgent,"codex");
  assert.deepEqual(connection(request,{provider:"anthropic",model:"default"}).localAgent,"claude-code");
  assert.equal(connection(request,{}).key,"");
  assert.throws(()=>connection(new Request("https://remote.example/api/key-check"),{}),/로컬/);
  process.env.VERCEL="1"; assert.equal(localAgentsEnabled(),false); assert.throws(()=>connection(request,{}),/로컬/);
}));
test("API transport cannot be invoked as a fallback in CLI-only mode",async()=>{
  const prior=process.env.DECKPICK_CLI_ONLY;process.env.DECKPICK_CLI_ONLY="1";
  const oldFetch=globalThis.fetch;let fetched=false;globalThis.fetch=async()=>{fetched=true;throw Error("must not fetch");};
  try {await assert.rejects(()=>providerCall({provider:"openai",key:"test-secret",model:"example"},{input:"hello"}),/중지/);assert.equal(fetched,false);}
  finally {globalThis.fetch=oldFetch;if(prior===undefined)delete process.env.DECKPICK_CLI_ONLY;else process.env.DECKPICK_CLI_ONLY=prior;}
});
test("Codex args disable config tool discovery and shell execution without bypass flags",()=>{
  const args=codexArgs("C:/private-job","default",false,[]);
  assert.ok(args.includes("--ignore-user-config"));assert.ok(args.includes("shell_tool"));assert.ok(args.includes("unified_exec"));assert.ok(args.includes("read-only"));assert.ok(args.includes('forced_login_method="chatgpt"'));
  assert.equal(args.some(a=>a.includes("dangerously")),false);assert.equal(args.includes("-m"),false);assert.equal(args.at(-1),"-");
});
test("CLI JSON parser preserves data and rejects empty or non-JSON failures",()=>{
  assert.deepEqual(extractLocalJson('```json\n{"ok":true}\n```'),{ok:true});
  assert.deepEqual(extractLocalJson('result: {"items":[1,2]}'),{items:[1,2]});
  assert.throws(()=>extractLocalJson("login needed"),/JSON/);
});
test("malformed CLI structured output reaches bounded schema repair without leaking a raw parser exception",()=>{
 const bad=localStructuredContent('{"summary":"invalid "quoted" value"}');
 assert.equal(bad.some(v=>v.type==="tool_use"),false);
 assert.equal(bad.some(v=>String(v.text).includes("position")),false);
 assert.deepEqual(localStructuredContent('{"ok":true}')[0].input,{ok:true});
});

test("queued CLI request starts its timeout only after the preceding slot releases, including failures",async()=>{
  let release!:()=>void, created=0;
  const held=new Promise<void>(resolve=>{release=resolve;});
  const first=withLocalAgentSlot(()=>new AbortController().signal,async()=>{await held; throw Error("first failed");});
  const observed=first.catch(()=>undefined);
  const second=withLocalAgentSlot(()=>{created++;return AbortSignal.timeout(1000);},async signal=>{assert.equal(signal.aborted,false);return "second";});
  await Promise.resolve();await Promise.resolve();assert.equal(created,0);
  release();await observed;assert.equal(await second,"second");assert.equal(created,1);
});
test("CLI gets startup-aware local budgets while production keeps API budgets",()=>withMode(()=>{
  assert.equal(providerTimeout("research"),180000);
  assert.equal(providerTimeout("story"),600000);
  process.env.VERCEL="1";assert.equal(providerTimeout("research"),75000);
}));
