import { canTransitionObjectStatus, todayDateString } from "./object-status.js";

describe("canTransitionObjectStatus", () => {
  it.each([
    ["draft", "active"],
    ["active", "on_hold"],
    ["on_hold", "active"],
    ["active", "completed"],
    ["on_hold", "completed"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(canTransitionObjectStatus(from, to)).toBe(true);
  });

  it.each([
    ["draft", "completed"],
    ["draft", "on_hold"],
    ["draft", "archived"],
    ["active", "draft"],
    ["completed", "active"],
    ["archived", "active"],
    ["on_hold", "draft"],
  ] as const)("rejects %s → %s", (from, to) => {
    expect(canTransitionObjectStatus(from, to)).toBe(false);
  });
});

describe("todayDateString", () => {
  it("returns YYYY-MM-DD in UTC", () => {
    expect(todayDateString(new Date("2026-03-15T23:30:00.000Z"))).toBe("2026-03-15");
  });
});
