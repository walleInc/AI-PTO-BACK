import { RuleRegistry } from "./registry.js";
import { makeRule } from "./testing.js";

describe("RuleRegistry", () => {
  it("starts empty", () => {
    expect(new RuleRegistry().list()).toEqual([]);
  });

  it("registers and returns a rule by id", () => {
    const rule = makeRule({ id: "aosr.date-order" });
    const registry = new RuleRegistry().register(rule);
    expect(registry.get("aosr.date-order")).toBe(rule);
    expect(registry.get("aosr.unknown")).toBeUndefined();
  });

  it("rejects duplicate ids", () => {
    const registry = new RuleRegistry([makeRule({ id: "aosr.date-order" })]);
    expect(() => registry.register(makeRule({ id: "aosr.date-order", version: "2.0.0" }))).toThrow(
      "уже зарегистрировано",
    );
  });

  it.each(["", "norule", "AOSR.date", "aosr.Date", "aosr.", "aosr..x", "aosr.date_order", "aosr.-x"])(
    "rejects invalid id %p",
    (id) => {
      expect(() => new RuleRegistry().register(makeRule({ id }))).toThrow("Некорректный id");
    },
  );

  it.each(["1", "1.0", "v1.0.0", "1.0.0-beta", "a.b.c"])("rejects invalid version %p", (version) => {
    expect(() => new RuleRegistry().register(makeRule({ version }))).toThrow("Некорректная версия");
  });

  it("lists rules sorted by id and filters by scope", () => {
    const registry = new RuleRegistry([
      makeRule({ id: "pkg.b", scope: "package" }),
      makeRule({ id: "aosr.z", scope: "document" }),
      makeRule({ id: "aosr.a", scope: "document" }),
    ]);
    expect(registry.list().map((r) => r.id)).toEqual(["aosr.a", "aosr.z", "pkg.b"]);
    expect(registry.list("document").map((r) => r.id)).toEqual(["aosr.a", "aosr.z"]);
    expect(registry.list("package").map((r) => r.id)).toEqual(["pkg.b"]);
  });
});
