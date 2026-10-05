/** Даты в правилах передаются строками YYYY-MM-DD (UTC), их можно сравнивать как строки. */

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function toIso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!valid) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fullYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

/**
 * Разбирает даты в российских форматах: `15.03.2026`, `15.03.26`, `15/03/2026`,
 * `«15» марта 2026 г.`, `15 марта 2026`, а также ISO `2026-03-15`.
 * Возвращает YYYY-MM-DD или null, если дата не распознана или не существует.
 */
export function parseRuDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = input.trim().toLowerCase().replace(/[«»"“”]/g, "");

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})(?:\s*г\.?)?$/.exec(text);
  if (numeric) return toIso(fullYear(Number(numeric[3])), Number(numeric[2]), Number(numeric[1]));

  const verbal = /^(\d{1,2})\s+([а-яё]+)\s+(\d{4})(?:\s*г\.?)?$/.exec(text);
  if (verbal) {
    const month = MONTHS_GENITIVE.indexOf(verbal[2]) + 1;
    if (month > 0) return toIso(Number(verbal[3]), month, Number(verbal[1]));
  }

  return null;
}

/** Отрицательное, если a раньше b; 0 при равенстве; положительное, если a позже b. */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Попадает ли дата в диапазон, границы включительно. Открытая граница задаётся null. */
export function isDateInRange(date: string, from: string | null, to: string | null): boolean {
  if (from !== null && compareDates(date, from) < 0) return false;
  if (to !== null && compareDates(date, to) > 0) return false;
  return true;
}
