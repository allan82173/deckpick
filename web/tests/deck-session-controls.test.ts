import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {DeckSessionControls} from "../src/components/deck-session-controls";
test("saved tasks expand inline and have explicit restore buttons instead of a native select",()=>{
 const html=renderToStaticMarkup(createElement(DeckSessionControls,{archives:[{id:"saved-one",topic:"보관한 첫 작업",savedAt:"2026-11-08T01:00:00Z"}],disabled:false,onNew:()=>{},onRestore:()=>{},onDelete:()=>{}}));assert.match(html,/보관한 첫 작업 삭제/);assert.match(html,/<details/);assert.match(html,/<summary/);assert.match(html,/보관한 첫 작업 불러오기/);assert.match(html,/현재 작업도 자동으로 보관/);assert.ok(!html.includes("<select"));
});
test("no saved tasks shows only the new-topic action",()=>{const html=renderToStaticMarkup(createElement(DeckSessionControls,{archives:[],disabled:false,onNew:()=>{},onRestore:()=>{},onDelete:()=>{}}));assert.match(html,/새 주제로 시작/);assert.ok(!html.includes("<details"));});
