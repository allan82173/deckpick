import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {privateKey} from "../src/lib/private-storage";
test("private storage keys are portable and cannot escape the application namespace",()=>{
 assert.equal(privateKey(path.join(process.cwd(),".attachments","abc.json")),"deckpick/.attachments/abc.json");
 assert.throws(()=>privateKey(path.resolve(process.cwd(),"..","private-key.txt")),/허용되지 않은 저장 위치/);
});
