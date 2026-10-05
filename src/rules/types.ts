/**
 * Типы Rule Engine. Согласованы с docs/openapi.yaml (SourceRef, Finding, Severity).
 * Правила это чистые функции: без БД, сети и LLM.
 */

export type Severity = "critical" | "error" | "warning" | "info";

/** Место в файле, откуда взято значение. Совпадает со схемой SourceRef из контракта. */
export interface SourceRef {
  documentId: string;
  /** Номер страницы PDF, с 1 */
  page?: number;
  /** [x0, y0, x1, y1] в долях страницы от верхнего левого угла */
  bbox?: [number, number, number, number];
  sheet?: string;
  cell?: string;
  paragraph?: number;
  quote?: string;
}

/** Извлечённое значение вместе с источником. Контекст правил строится из таких полей. */
export interface Field<T> {
  value: T;
  source: SourceRef;
  confidence?: number;
}

export interface NormRef {
  doc: string;
  clause: string;
  url?: string;
}

/** Результат работы правила, без идентификатора и версии: их проставляет runner. */
export interface Violation {
  severity: Severity;
  /** Строгий результат правила, всегда заполнен */
  message: string;
  expected?: string | null;
  actual?: string | null;
  normRef?: NormRef;
  /** Минимум один источник */
  sources: SourceRef[];
  /** 0..1, по умолчанию 1 */
  confidence?: number;
}

export type RuleScope = "document" | "package";

export interface Rule<Ctx = unknown> {
  /** Формат `область.имя-правила`, например `aosr.date-after-journal` */
  id: string;
  /** semver. Любое изменение логики поднимает версию */
  version: string;
  scope: RuleScope;
  description: string;
  check(ctx: Ctx): Violation[];
}

/** Нарушение, привязанное к правилу и его версии (то, что попадёт в Finding). */
export interface RuleFinding extends Violation {
  ruleId: string;
  ruleVersion: string;
  confidence: number;
}

/** Сбой самого правила (исключение или невалидный результат). Содержимое документов сюда не попадает. */
export interface RuleError {
  ruleId: string;
  ruleVersion: string;
  reason: "exception" | "invalid_violation";
  /** Имя ошибки или описание нарушенного инварианта, без данных документа */
  detail: string;
}

export interface RunResult {
  findings: RuleFinding[];
  errors: RuleError[];
}
