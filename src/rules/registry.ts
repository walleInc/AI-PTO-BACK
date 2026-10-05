import type { Rule, RuleScope } from "./types.js";

const RULE_ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export class RuleRegistry {
  private readonly rules = new Map<string, Rule<any>>();

  constructor(rules: Rule<any>[] = []) {
    for (const rule of rules) this.register(rule);
  }

  register(rule: Rule<any>): this {
    if (!RULE_ID_PATTERN.test(rule.id)) {
      throw new Error(`Некорректный id правила "${rule.id}": ожидается формат "область.имя-правила"`);
    }
    if (!SEMVER_PATTERN.test(rule.version)) {
      throw new Error(`Некорректная версия правила "${rule.id}": "${rule.version}", ожидается semver`);
    }
    if (this.rules.has(rule.id)) {
      throw new Error(`Правило "${rule.id}" уже зарегистрировано`);
    }
    this.rules.set(rule.id, rule);
    return this;
  }

  get(id: string): Rule<any> | undefined {
    return this.rules.get(id);
  }

  /** Правила в стабильном порядке (по id), опционально только нужной области. */
  list(scope?: RuleScope): Rule<any>[] {
    return [...this.rules.values()]
      .filter((rule) => scope === undefined || rule.scope === scope)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}
