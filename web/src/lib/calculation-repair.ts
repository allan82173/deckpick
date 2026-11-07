import { z } from "zod";
import { calculationSchema, type Calculation } from "./task-model";
import { calculateScenario } from "./scenario-calculation";

/**
 * Calculation problems are isolated per slide so that one bad operand does not
 * force the whole storyline to be regenerated. Order: deterministic
 * normalization → one small per-slide repair call → remove the calculation and
 * lower the claim strength. Values are never guessed or filled with 0.
 */
export type CalculationIssue = { index: number; status: "normalized" | "repaired" | "removed"; fixes: string[]; error?: string };
type StoryCalculationItem = { role: string; claimType: string; calculation: Calculation | null; argument: { limitation: string } };

const numericLiteral = /^-?\d+(?:\.\d+)?$/;
const MAX_ASSUMPTIONS = 8;
const constantName = (literal: string) => ("c_" + literal.replace(/^-/, "m").replace(/\./g, "_")).slice(0, 31);

export function normalizeCalculation(calculation: Calculation, evidenceIds: ReadonlySet<string>): { calculation: Calculation; fixes: string[] } {
  const fixes: string[] = [];
  const assumptions = calculation.assumptions.map(variable => {
    const validRefs = variable.evidenceRefs.filter(id => evidenceIds.has(id));
    if (validRefs.length !== variable.evidenceRefs.length) fixes.push(`${variable.name}: 근거표에 없는 ID를 제외`);
    if (variable.origin === "근거" && !validRefs.length) { fixes.push(`${variable.name}: 연결된 근거가 없어 가정으로 표시`); return { ...variable, origin: "가정" as const, evidenceRefs: validRefs }; }
    return { ...variable, evidenceRefs: validRefs };
  });
  const defined = new Set(assumptions.map(variable => variable.name));
  const aliases = new Map<string, string>();
  const alias = (key: string, name: string) => { const normalized = key.trim().toLowerCase(); if (normalized && !aliases.has(normalized)) aliases.set(normalized, name); };
  for (const variable of assumptions) { alias(variable.name, variable.name); alias(variable.label, variable.name); }
  const steps = calculation.steps.map(step => {
    const operands = step.operands.map(operand => {
      if (defined.has(operand)) return operand;
      const matched = aliases.get(operand.trim().toLowerCase());
      if (matched) { fixes.push(`${step.name}: "${operand}"를 변수 ${matched}로 연결`); return matched; }
      const literal = operand.trim();
      if (numericLiteral.test(literal) && Number.isFinite(Number(literal))) {
        const name = constantName(literal);
        if (!defined.has(name)) {
          if (assumptions.length >= MAX_ASSUMPTIONS) return operand;
          assumptions.push({ name, label: `산식 상수 ${literal}`, value: Number(literal), unit: "상수", basis: "모델이 산식에 직접 적은 상수를 가정 변수로 명시했습니다.", evidenceRefs: [], origin: "가정" });
          defined.add(name); alias(name, name);
        }
        fixes.push(`${step.name}: 숫자 ${literal}를 가정 상수 ${name}로 명시`);
        return name;
      }
      return operand;
    });
    defined.add(step.name); alias(step.name, step.name); alias(step.label, step.name);
    return { ...step, operands };
  });
  return { calculation: { ...calculation, assumptions, steps }, fixes };
}

export function calculationError(calculation: Calculation, evidenceIds: ReadonlySet<string>): string | undefined {
  const parsed = calculationSchema.safeParse(calculation);
  if (!parsed.success) return parsed.error.issues.map(issue => `${issue.path.join(".")} ${issue.message}`).join(" / ");
  try { calculateScenario(parsed.data); } catch (error) { return error instanceof Error ? error.message : "계산 검증 실패"; }
  for (const variable of parsed.data.assumptions) if (variable.origin === "근거" && !variable.evidenceRefs.some(id => evidenceIds.has(id))) return `${variable.name}: 근거 변수에 실제 근거 ID가 없습니다.`;
  return undefined;
}

export const calculationRepairSchema = z.object({ calculation: calculationSchema });
export const calculationRepairPrompt = "한 장의 calculation만 수정합니다. 다른 장·헤드라인·근거는 바꾸지 않습니다. 오류 메시지를 읽고 operands가 assumptions.name 또는 앞 단계 steps.name만 정확히 참조하게 고치세요. 숫자 상수는 assumptions에 가정 변수로 먼저 정의합니다. 근거 변수는 allowedEvidenceIds만 연결하고, 연결할 근거가 없으면 origin을 가정으로 낮추고 basis에 이유를 적습니다. 새로운 사실 수치를 만들지 말고 기존 값과 가정만 재사용하거나, 필요한 값이 없으면 가정으로 명시합니다.";

export async function repairStoryCalculations<T extends StoryCalculationItem>(
  items: T[], evidenceIds: ReadonlySet<string>,
  repairOne: (index: number, item: T, calculation: Calculation, error: string) => Promise<Calculation>,
): Promise<{ items: T[]; issues: CalculationIssue[] }> {
  const issues: CalculationIssue[] = [];
  const repaired: T[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!item.calculation) { repaired.push(item); continue; }
    const normalized = normalizeCalculation(item.calculation, evidenceIds);
    const error = calculationError(normalized.calculation, evidenceIds);
    if (!error) {
      if (normalized.fixes.length) issues.push({ index, status: "normalized", fixes: normalized.fixes });
      repaired.push({ ...item, calculation: normalized.calculation });
      continue;
    }
    let lastError = error;
    try {
      const fixed = normalizeCalculation(await repairOne(index, item, normalized.calculation, error), evidenceIds);
      const fixedError = calculationError(fixed.calculation, evidenceIds);
      if (!fixedError) { issues.push({ index, status: "repaired", fixes: [...normalized.fixes, ...fixed.fixes], error }); repaired.push({ ...item, calculation: fixed.calculation }); continue; }
      lastError = fixedError;
    } catch (repairError) { lastError = repairError instanceof Error ? repairError.message : lastError; }
    issues.push({ index, status: "removed", fixes: normalized.fixes, error: lastError.slice(0, 500) });
    const limitation = `${item.argument.limitation} · 계산 검증에 실패해 산식을 제외했습니다.`.slice(0, 500);
    repaired.push({ ...item, calculation: null, claimType: item.claimType === "계산" ? "추론" : item.claimType, role: item.role === "계산" ? "판단" : item.role, argument: { ...item.argument, limitation } });
  }
  return { items: repaired, issues };
}
