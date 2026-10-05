import type { Rule, RuleError, RuleFinding, RunResult, SourceRef, Violation } from "./types.js";

/** Описание нарушенного инварианта или undefined, если нарушение корректно. */
export function validateViolation(violation: Violation): string | undefined {
  if (!violation.message?.trim()) return "пустой message";
  if (!Array.isArray(violation.sources) || violation.sources.length === 0) return "нет ни одного SourceRef";
  if (violation.sources.some((source) => !source?.documentId)) return "у SourceRef нет documentId";
  const { confidence } = violation;
  if (confidence !== undefined && !(confidence >= 0 && confidence <= 1)) return "confidence вне диапазона 0..1";
  return undefined;
}

function sourceKey(source: SourceRef): string {
  return [source.documentId, source.page ?? "", source.sheet ?? "", source.cell ?? "", source.paragraph ?? ""].join(":");
}

/** Ключ дедупликации: одно и то же нарушение одного правила в одних и тех же местах считается один раз. */
function findingKey(finding: RuleFinding): string {
  const sources = finding.sources.map(sourceKey).sort().join("|");
  return [finding.ruleId, finding.ruleVersion, finding.message, sources].join("#");
}

function compareFindings(a: RuleFinding, b: RuleFinding): number {
  return findingKey(a).localeCompare(findingKey(b));
}

/**
 * Прогоняет правила по контексту. Результат детерминирован (сортировка, без дублей),
 * поэтому повторный запуск этапа не создаёт дубликатов. Сбой одного правила не влияет на остальные.
 */
export function runRules<Ctx>(rules: readonly Rule<Ctx>[], ctx: Ctx): RunResult {
  const found = new Map<string, RuleFinding>();
  const errors: RuleError[] = [];

  for (const rule of rules) {
    const fail = (reason: RuleError["reason"], detail: string) =>
      errors.push({ ruleId: rule.id, ruleVersion: rule.version, reason, detail });

    let violations: Violation[];
    try {
      violations = rule.check(ctx);
    } catch (error) {
      fail("exception", error instanceof Error ? error.name : "UnknownError");
      continue;
    }

    for (const violation of violations) {
      const problem = validateViolation(violation);
      if (problem) {
        fail("invalid_violation", problem);
        continue;
      }
      const finding: RuleFinding = {
        ...violation,
        ruleId: rule.id,
        ruleVersion: rule.version,
        confidence: violation.confidence ?? 1,
      };
      found.set(findingKey(finding), finding);
    }
  }

  errors.sort((a, b) => a.ruleId.localeCompare(b.ruleId) || a.detail.localeCompare(b.detail));
  return { findings: [...found.values()].sort(compareFindings), errors };
}
