import { describe, expect, it } from "vitest";
import { runAttackHarness } from "../src/core/attack.js";
import { evaluatePolicy } from "../src/core/policy.js";

describe("policy gate", () => {
  it("blocks when attack findings meet the fail threshold", async () => {
    const attack = await runAttackHarness("examples");
    const decision = evaluatePolicy({ attack, policy: { failOn: "high", maxRiskScore: 70 } });

    expect(decision.decision).toBe("block");
    expect(decision.reasons.some((reason) => reason.category === "policy.fail_on_severity")).toBe(true);
  });
});
