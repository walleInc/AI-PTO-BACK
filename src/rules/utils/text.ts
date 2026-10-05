/**
 * Приводит строку к виду для сравнения: нижний регистр, ё→е, без кавычек,
 * единые пробелы и тире. Для сопоставления названий, наименований, ФИО.
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"“”„'`]/g, "")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBlank(input: string | null | undefined): boolean {
  return normalizeText(input) === "";
}

export function textEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeText(a) === normalizeText(b);
}
