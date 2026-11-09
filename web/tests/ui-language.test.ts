import test from "node:test";
import assert from "node:assert/strict";
import {translateUi} from "../src/lib/ui-language";
import {generationLanguageInstruction} from "../src/lib/generation-language";
import {deckInputSchema} from "../src/lib/model";
import {researchContextKey} from "../src/lib/generation-flow";

const input = {deckType:"consulting", designSystemId:"ict-forest", topic:"A public library proposal", purpose:"Report", slideCount:6} as const;
test("language: old decks remain valid; generation language is validated and serialized", () => {
 assert.ok(deckInputSchema.safeParse(input).success);
 assert.equal(deckInputSchema.parse({...input,language:"en"}).language,"en");
 assert.equal(deckInputSchema.safeParse({...input,language:"unknown"}).success,false);
});
test("language: labels translate in both directions without altering unknown user content", () => {
 assert.equal(translateUi("AI 연결 설정","en"),"AI connection settings");
 assert.equal(translateUi("AI 연결 설정","ko"),"AI 연결 설정");
 assert.equal(translateUi("A user's custom sentence","en"),"A user's custom sentence");
 assert.equal(translateUi("API 키","en"),"API key");
});
test("language: generation instructions preserve verbatim quotations and schema enums", () => {
 const rule=generationLanguageInstruction("en");
 assert.match(rule,/Output language: English/);
 assert.match(rule,/schema enum values/);
 assert.match(rule,/exact source quotations/);
 assert.match(generationLanguageInstruction(),/Output language: Korean/);
});
test("language: changing presentation language invalidates saved research context", async () => {
 const ko=await researchContextKey({input:{...input,language:"ko"}});
 const en=await researchContextKey({input:{...input,language:"en"}});
 assert.notEqual(ko,en);
});
test("language: interpolated labels preserve runtime values", () => {
 assert.equal(translateUi("{0}번 장의 레이아웃 후보","en",[14]),"Layout candidates for slide 14");
 assert.equal(translateUi("{0}번 장의 레이아웃 후보","ko",[14]),"14번 장의 레이아웃 후보");
});
