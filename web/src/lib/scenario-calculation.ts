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
  const assumption = computed.assumptions.map(item => `${item.origin === "가정" ? "[가정]" : "[근거]"} ${item.label} ${item.value}${item.unit}`).join(" · ");
  const cards = computed.outputs.slice(-3).map(output => ({
    title: output.label.slice(0, 80), assumption: assumption.slice(0, 240),
    formula: output.formula.slice(0, 240), result: `${output.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${output.unit}`.slice(0, 80),
    interpretation: `[계산 예시] ${computed.interpretation}`.slice(0, 240),
  }));
  if (cards.length === 1) cards.push({ title: "가정과 판단 범위", assumption: assumption.slice(0, 240), formula: "위 가정을 바꾸면 결과가 달라집니다.", result: "[계산] 가정 기반 예시", interpretation: computed.interpretation.slice(0, 240) });
  return { cards, takeaway: `[계산] ${computed.interpretation}`.slice(0, 240) };
}
export function applyCalculation(slide: SlideSpec, calculation?: Calculation | null): SlideSpec {
  if (!calculation || !slide.layoutId.endsWith("formula-cards")) return slide;
  return { ...slide, claimType: "계산", data: calculationCards(calculation) };
}
