import type { Field, Rule, SourceRef, Violation } from "./types.js";

/** Хелперы для тестов правил. В продакшн-код не импортируются. */

export const TEST_DOCUMENT_ID = "00000000-0000-4000-8000-000000000001";

export function source(overrides: Partial<SourceRef> = {}): SourceRef {
  return { documentId: TEST_DOCUMENT_ID, page: 1, ...overrides };
}

export function field<T>(value: T, overrides: Partial<SourceRef> = {}): Field<T> {
  return { value, source: source(overrides) };
}

export function violation(overrides: Partial<Violation> = {}): Violation {
  return { severity: "error", message: "Тестовое нарушение", sources: [source()], ...overrides };
}

export function makeRule<Ctx = unknown>(overrides: Partial<Rule<Ctx>> = {}): Rule<Ctx> {
  return {
    id: "test.rule",
    version: "1.0.0",
    scope: "document",
    description: "Тестовое правило",
    check: () => [],
    ...overrides,
  };
}

/**
 * Проверка инварианта для любого правила: нарушения всегда содержат источник и сообщение.
 * Вызывать в тестах каждого правила на входе, где правило срабатывает.
 */
export function expectValidViolations(violations: Violation[]): void {
  for (const item of violations) {
    expect(item.message.trim()).not.toBe("");
    expect(item.sources.length).toBeGreaterThan(0);
    for (const src of item.sources) expect(src.documentId).toBeTruthy();
  }
}
