import test from "node:test";
import assert from "node:assert/strict";
import {calculationLayoutFits} from "../src/lib/scenario-calculation";
import type {Calculation} from "../src/lib/task-model";
const basic:Calculation={title:"비교 예시",assumptions:[{name:"n",label:"수량",value:10,unit:"개",basis:"가정",evidenceRefs:[],origin:"가정"},{name:"p",label:"단가",value:5,unit:"원/개",basis:"가정",evidenceRefs:[],origin:"가정"}],steps:[{name:"a",label:"합계",operation:"multiply",operands:["n","p"],unit:"원"},{name:"b",label:"추가",operation:"add",operands:["a","a"],unit:"원"}],interpretation:"가정 기반 예시"};
test("calculation layout fit includes immutable assumption line capacity",()=>{assert.equal(calculationLayoutFits("c-horizontal-formula",basic),true);const long={...basic,assumptions:basic.assumptions.map(v=>({...v,label:v.label+"조건을 유지해야 하는 상세 설명 ".repeat(15)}))};assert.equal(calculationLayoutFits("c-horizontal-formula",long),false);assert.equal(calculationLayoutFits("c-formula-cards",long),false);assert.equal(calculationLayoutFits("c-comparison-table",long),true);});
test("formula cards reject full interpretation overflow before generation",()=>{assert.equal(calculationLayoutFits("c-formula-cards",basic),true);assert.equal(calculationLayoutFits("c-formula-cards",{...basic,interpretation:"조건 ".repeat(100)}),false);});
