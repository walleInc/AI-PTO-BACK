import { isBlank, normalizeText, textEquals } from "./text.js";

describe("normalizeText", () => {
  it("lowercases, replaces ё and collapses whitespace", () => {
    expect(normalizeText("  Бетон  Тяжёлый\n В25 ")).toBe("бетон тяжелый в25");
  });

  it("strips quotes and unifies dashes", () => {
    expect(normalizeText("ООО «Строй–Монтаж»")).toBe("ооо строй-монтаж");
    expect(normalizeText('ООО "Строй—Монтаж"')).toBe("ооо строй-монтаж");
  });

  it("applies NFKC (non-breaking space, full-width chars)", () => {
    expect(normalizeText("А Б")).toBe("а б");
  });

  it("returns empty string for null, undefined and blank input", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
    expect(normalizeText("   ")).toBe("");
  });
});

describe("isBlank", () => {
  it("detects blank values", () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank(" \n ")).toBe(true);
    expect(isBlank("«»")).toBe(true);
    expect(isBlank("x")).toBe(false);
  });
});

describe("textEquals", () => {
  it("ignores case, ё, quotes and spacing", () => {
    expect(textEquals("ООО «Ёлка»", "ооо елка")).toBe(true);
    expect(textEquals("Иванов И.И.", "Петров П.П.")).toBe(false);
  });
});
