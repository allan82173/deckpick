import test from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {codexArgs,codexOutputSchema,restoreOptionalFields} from "../src/lib/local-agent";
test("structured CLI calls bind a real output schema while keeping sandbox and login controls",()=>{
 const args=codexArgs("C:/private","gpt-6.1-sol",false,[],"C:/private/schema.json");
 assert.equal(args[args.indexOf("--output-schema")+1],"C:/private/schema.json");assert.ok(args.includes("read-only"));assert.ok(args.includes('forced_login_method="chatgpt"'));assert.ok(!args.some(a=>a.includes("dangerously")));
});
test("optional native fields can be omitted again without losing intentional null calculations",()=>{
 const original=z.toJSONSchema(z.object({title:z.string(),optional:z.object({label:z.string().optional()}).optional(),calculation:z.object({value:z.number()}).nullable(),count:z.number().optional()}));
 const native=codexOutputSchema(original)!;assert.ok(native);assert.deepEqual(native.required,["title","optional","calculation","count"]);
 const restored=restoreOptionalFields({title:"실제 제목",optional:{label:null},calculation:null,count:null},original);
 assert.deepEqual(restored,{title:"실제 제목",optional:{},calculation:null});
});
test("dynamic records stay on validated JSON fallback rather than silently dropping their keys",()=>{
 assert.equal(codexOutputSchema(z.toJSONSchema(z.object({data:z.record(z.string(),z.unknown())}))),undefined);
 assert.equal(codexOutputSchema(z.toJSONSchema(z.object({rows:z.array(z.unknown())}))),undefined);
});
test("nullable calculation objects restore their nested optional fields too",()=>{
 const schema=z.toJSONSchema(z.object({calculation:z.object({value:z.number(),evidenceRef:z.string().optional()}).nullable()}));
 assert.deepEqual(restoreOptionalFields({calculation:{value:5,evidenceRef:null}},schema),{calculation:{value:5}});
 assert.deepEqual(restoreOptionalFields({calculation:null},schema),{calculation:null});
});
