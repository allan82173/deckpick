import { calculationSchema, type Calculation } from "./task-model";
import type { SlideSpec } from "./model";

const symbols = { add: "+", subtract: "−", multiply: "×", divide: "÷" } as const;
export function calculateScenario(input: Calculation) {
  const calculation = calculationSchema.parse(input);
  const values = new Map<string, number>();
  const labels = new Map<string, string>();
  const units = new Map<string, string>();
  for (const variable of calculation.assumptions) {
    if (values.has(variable.name)) throw Error("계산 변수 이름이 중복됩니다.");
    values.set(variable.name, variable.value);
    labels.set(variable.name, variable.label); units.set(variable.name, variable.unit);
  }
  const outputs = calculation.steps.map(step => {
    if (values.has(step.name)) throw Error("계산 결과 이름이 기존 변수와 겹칩니다.");
    const operands = step.operands.map(name => {
      const value = values.get(name);
      if (value === undefined) throw Error(`계산 단계 ${step.name}: 정의되지 않은 변수 "${name}"입니다. 사용 가능한 이름: ${[...values.keys()].join(", ")}. operands에는 assumptions.name 또는 앞 단계 steps.name만 쓰고 숫자 상수도 먼저 assumptions에 정의하세요.`);
      return value;
    });
    const percentageInputs = step.operands.filter(name => /%|퍼센트/.test(units.get(name) ?? ""));
    const toRatio = step.operation === "divide" && step.operands.length === 2 && percentageInputs.includes(step.operands[0]) && operands[1] === 100;
    if (percentageInputs.length && !/%|퍼센트/.test(step.unit) && !toRatio) throw Error("퍼센트 입력은 100으로 나눈 비율로 변환한 뒤 계산하세요. 0.1배를 뜻하면 단위는 % 대신 비율입니다.");
    const value = operands.slice(1).reduce((result, operand) => {
      if (step.operation === "add") return result + operand;
      if (step.operation === "subtract") return result - operand;
      if (step.operation === "multiply") return result * operand;
      if (operand === 0) throw Error("계산에서 0으로 나눌 수 없습니다.");
      return result / operand;
    }, operands[0]);
    if (!Number.isFinite(value)) throw Error("계산 결과가 유한한 수가 아닙니다.");
    values.set(step.name, value); labels.set(step.name, step.label); units.set(step.name, step.unit);
    return { ...step, value, formula: step.operands.map(name => `${labels.get(name)} ${values.get(name)?.toLocaleString("en-US", { maximumFractionDigits: 3 })}`).join(` ${symbols[step.operation]} `) };
  });
  return { ...calculation, outputs };
}

export function calculationCards(calculation: Calculation) {
  const computed = calculateScenario(calculation);
  if (computed.outputs.length > 3) throw Error(`계산 결과 ${computed.outputs.length}개를 최대 3개 카드에 담을 수 없습니다. 결과를 줄이지 말고 가로 막대 등 전체 항목을 담는 구성을 선택하세요.`);
  const assumption = computed.assumptions.map(item => `${item.origin === "가정" ? "[가정]" : "[근거]"} ${item.label} ${item.value}${item.unit}`).join(" · ");
  if (assumption.length > 240 || computed.interpretation.length + 8 > 240 || computed.outputs.some(output => output.label.length > 80 || output.formula.length > 240)) throw Error("계산 카드의 가정·산식·해석이 표현 용량을 넘습니다. 조건을 자르지 말고 다른 구성이나 간결한 계산 설계를 사용하세요.");
  const cards = computed.outputs.map(output => ({
    title: output.label, assumption,
    formula: output.formula, result: `${output.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${output.unit}`,
    interpretation: `[계산 예시] ${computed.interpretation}`,
  }));
  if (cards.length === 1) cards.push({ title: "가정과 판단 범위", assumption, formula: "위 가정을 바꾸면 결과가 달라집니다.", result: "[계산] 가정 기반 예시", interpretation: computed.interpretation });
  return { cards, takeaway: `[계산] ${computed.interpretation}` };
}
/** Remove a redundant shared suffix only when every distinct label retains its name. Full labels remain in calculation notes. */
export function compactSharedLabels(labels:string[]):string[]{
 if(labels.length<3)return labels;
 const trimmed=labels.map(v=>v.trim());let suffix="";
 for(let n=1;n<=Math.min(8,...trimmed.map(v=>v.length-2));n++){const candidate=trimmed[0].slice(-n);if(trimmed.every(v=>v.endsWith(candidate)))suffix=candidate;else break;}
 if(suffix.length<2)return labels;
 const compact=trimmed.map(v=>v.slice(0,-suffix.length).trim());
 return compact.every(v=>v.length>=2)&&new Set(compact).size===labels.length?compact:labels;
}
export function applyCalculation(slide: SlideSpec, calculation?: Calculation | null): SlideSpec {
  if (!calculation) return slide;
  if (slide.layoutId.endsWith("horizontal-formula")) {
    const computed = calculateScenario(calculation);
    if (computed.outputs.length < 2 || new Set(computed.outputs.map(o => o.unit)).size !== 1) throw Error("가로 계산 차트에는 같은 단위의 결과가 2개 이상 필요합니다. 단위를 섞거나 결과를 생략하지 말고 구성을 바꾸세요.");
    const labels=compactSharedLabels(computed.outputs.map(o=>o.label));
    const currency = computed.outputs[0].unit === "원" && Math.max(...computed.outputs.map(o => Math.abs(o.value))) >= 10000;
    const scale = currency ? 10000 : 1;
    const amount = (v: number) => v.toLocaleString("ko-KR", { maximumSignificantDigits: 15 });
    const displayInput=(value:number,unit:string)=>unit==="비율"?`${amount(value*100)}%`:unit==="원"&&Number.isInteger(value/1e8)&&Math.abs(value)>=1e8?`${amount(value/1e8)}억 원`:unit==="원"&&Number.isInteger(value/1e4)&&Math.abs(value)>=1e4?`${amount(value/1e4)}만 원`:`${amount(value)}${unit}`;
    const vars = new Map(computed.assumptions.map(v => [v.name, v]));
    const assumption = computed.assumptions.map(v => `${v.label} ${displayInput(v.value,v.unit)}(${v.origin})`).join(" · ");
    // Numeric outputs are deterministic; retain the generated concise reading
    // of the calculation instead of overwriting it with a long design note.
    const interpretation = typeof slide.data.interpretation === "string" ? slide.data.interpretation : computed.interpretation;
    const takeaway = typeof slide.data.takeaway === "string" ? slide.data.takeaway : interpretation;
    if (assumption.length > 220 || interpretation.length > 220 || takeaway.length > 220) throw Error("계산 가정·해석이 차트의 표현 용량을 넘습니다. 조건을 삭제하지 말고 계산 설계를 간결하게 정리하세요.");
    return { ...slide, claimType: "계산", notes: [slide.notes, JSON.stringify(computed)].filter(Boolean).join("\n"), data: {
      items: computed.outputs.map((o,index) => ({ label: labels[index], value: o.value / scale,
        basis: o.operands.map(name => { const v = vars.get(name); const earlier = computed.outputs.find(r => r.name === name); return v ? displayInput(v.value,v.unit) : `${earlier?.label} ${displayInput(earlier!.value,earlier!.unit)}`; }).join(` ${symbols[o.operation]} `) })),
      unit: currency ? "만 원" : computed.outputs[0].unit, assumption,
      formula: "항목별 산식으로 계산 · 결과는 동일 단위로 환산",
      interpretation, takeaway, tag: "계산",
    } };
  }
  if (!slide.layoutId.endsWith("formula-cards")) return slide;
  return { ...slide, claimType: "계산", data: calculationCards(calculation) };
}

/** Prevent capacity loss before any model call. Explicit unsuitable choices fail visibly. */
export function calculationLayoutFits(layoutId: string, calculation?: Calculation | null) {
  if (!calculation || !layoutId.endsWith("formula-cards")) return true;
  return calculation.steps.length <= 3;
}
