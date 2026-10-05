import { compareDates, isDateInRange, parseRuDate } from "./dates.js";

describe("parseRuDate", () => {
  it.each([
    ["15.03.2026", "2026-03-15"],
    ["5.3.2026", "2026-03-05"],
    ["15.03.26", "2026-03-15"],
    ["15/03/2026", "2026-03-15"],
    ["15.03.2026 г.", "2026-03-15"],
    ["«15» марта 2026 г.", "2026-03-15"],
    ["15 марта 2026", "2026-03-15"],
    ["1 Января 2025 года".replace(" года", " г."), "2025-01-01"],
    ["2026-03-15", "2026-03-15"],
    ["  15.03.2026  ", "2026-03-15"],
    ["29.02.2024", "2024-02-29"],
  ])("parses %p", (input, expected) => {
    expect(parseRuDate(input)).toBe(expected);
  });

  it.each([null, undefined, "", "   ", "abc", "32.01.2026", "29.02.2025", "15.13.2026", "15 мартобря 2026", "2026-02-30"])(
    "returns null for %p",
    (input) => {
      expect(parseRuDate(input)).toBeNull();
    },
  );
});

describe("compareDates", () => {
  it("orders dates", () => {
    expect(compareDates("2026-03-14", "2026-03-15")).toBeLessThan(0);
    expect(compareDates("2026-03-15", "2026-03-15")).toBe(0);
    expect(compareDates("2026-03-16", "2026-03-15")).toBeGreaterThan(0);
  });
});

describe("isDateInRange", () => {
  it("includes both boundaries", () => {
    expect(isDateInRange("2026-03-01", "2026-03-01", "2026-03-31")).toBe(true);
    expect(isDateInRange("2026-03-31", "2026-03-01", "2026-03-31")).toBe(true);
  });

  it("rejects dates outside the range", () => {
    expect(isDateInRange("2026-02-28", "2026-03-01", "2026-03-31")).toBe(false);
    expect(isDateInRange("2026-04-01", "2026-03-01", "2026-03-31")).toBe(false);
  });

  it("supports open boundaries", () => {
    expect(isDateInRange("2000-01-01", null, "2026-03-31")).toBe(true);
    expect(isDateInRange("2099-01-01", "2026-03-01", null)).toBe(true);
    expect(isDateInRange("2099-01-01", null, null)).toBe(true);
    expect(isDateInRange("2099-01-01", null, "2026-03-31")).toBe(false);
  });
});
