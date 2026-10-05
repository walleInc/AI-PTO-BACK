import { runRules, validateViolation } from "./runner.js";
import { expectValidViolations, makeRule, source, violation } from "./testing.js";

describe("runRules", () => {
  it("returns nothing for an empty rule list", () => {
    expect(runRules([], {})).toEqual({ findings: [], errors: [] });
  });

  it("returns nothing when rules find no violations", () => {
    expect(runRules([makeRule()], {})).toEqual({ findings: [], errors: [] });
  });

  it("stamps findings with ruleId, ruleVersion and default confidence", () => {
    const rule = makeRule({ id: "test.one", version: "1.2.3", check: () => [violation()] });
    const { findings, errors } = runRules([rule], {});
    expect(errors).toEqual([]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "test.one", ruleVersion: "1.2.3", confidence: 1, severity: "error" });
    expectValidViolations(findings);
  });

  it("keeps explicit confidence", () => {
    const rule = makeRule({ check: () => [violation({ confidence: 0.4 })] });
    expect(runRules([rule], {}).findings[0].confidence).toBe(0.4);
  });

  it("passes the context to rules", () => {
    const check = jest.fn(() => []);
    const ctx = { a: 1 };
    runRules([makeRule({ check })], ctx);
    expect(check).toHaveBeenCalledWith(ctx);
  });

  it("isolates a throwing rule and keeps the others working", () => {
    const broken = makeRule({
      id: "test.broken",
      check: () => {
        throw new TypeError("секретное содержимое документа");
      },
    });
    const good = makeRule({ id: "test.good", check: () => [violation()] });
    const { findings, errors } = runRules([broken, good], {});
    expect(findings.map((f) => f.ruleId)).toEqual(["test.good"]);
    expect(errors).toEqual([
      { ruleId: "test.broken", ruleVersion: "1.0.0", reason: "exception", detail: "TypeError" },
    ]);
    expect(JSON.stringify(errors)).not.toContain("секретное");
  });

  it("drops invalid violations and reports a rule error", () => {
    const rule = makeRule({
      check: () => [violation({ sources: [] }), violation({ message: "ok", sources: [source()] })],
    });
    const { findings, errors } = runRules([rule], {});
    expect(findings).toHaveLength(1);
    expect(errors).toEqual([
      { ruleId: "test.rule", ruleVersion: "1.0.0", reason: "invalid_violation", detail: "нет ни одного SourceRef" },
    ]);
  });

  it("removes duplicates, so a rerun does not multiply findings", () => {
    const rule = makeRule({ check: () => [violation(), violation()] });
    expect(runRules([rule], {}).findings).toHaveLength(1);
  });

  it("keeps findings from different places as separate", () => {
    const rule = makeRule({
      check: () => [
        violation({ sources: [source({ page: 1 })] }),
        violation({ sources: [source({ page: 2 })] }),
      ],
    });
    expect(runRules([rule], {}).findings).toHaveLength(2);
  });

  it("is deterministic regardless of rule order", () => {
    const a = makeRule({ id: "test.a", check: () => [violation({ message: "A" })] });
    const b = makeRule({ id: "test.b", check: () => [violation({ message: "B" })] });
    expect(runRules([a, b], {})).toEqual(runRules([b, a], {}));
  });
});

describe("validateViolation", () => {
  it("accepts a correct violation", () => {
    expect(validateViolation(violation())).toBeUndefined();
  });

  it.each([
    ["empty message", violation({ message: "  " }), "пустой message"],
    ["no sources", violation({ sources: [] }), "нет ни одного SourceRef"],
    ["source without documentId", violation({ sources: [{ documentId: "" }] }), "у SourceRef нет documentId"],
    ["confidence above 1", violation({ confidence: 1.1 }), "confidence вне диапазона 0..1"],
    ["negative confidence", violation({ confidence: -0.1 }), "confidence вне диапазона 0..1"],
    ["NaN confidence", violation({ confidence: NaN }), "confidence вне диапазона 0..1"],
  ])("rejects %s", (_name, input, expected) => {
    expect(validateViolation(input)).toBe(expected);
  });

  it("accepts confidence on the boundaries", () => {
    expect(validateViolation(violation({ confidence: 0 }))).toBeUndefined();
    expect(validateViolation(violation({ confidence: 1 }))).toBeUndefined();
  });
});
