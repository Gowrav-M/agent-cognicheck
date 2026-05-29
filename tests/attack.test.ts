import { describe, expect, it } from "vitest";
import { runAttackHarness } from "../src/core/attack.js";

describe("attack harness", () => {
  it("fails poisoned tool and exfiltration scenarios", async () => {
    const report = await runAttackHarness("examples");

    expect(report.decision).toBe("block");
    expect(report.results.some((result) => result.scenarioId === "MCP-TP-001" && result.outcome === "fail")).toBe(true);
    expect(report.results.some((result) => result.scenarioId === "MCP-EXFIL-001" && result.outcome === "fail")).toBe(true);
    expect(report.results.some((result) => result.scenarioId === "MCP-UNI-001" && result.outcome === "fail")).toBe(true);
  });

  it("passes safe public documentation tools", async () => {
    const report = await runAttackHarness("examples/mcp/safe-tools.json");

    expect(report.decision).toBe("allow");
    expect(report.summary.failed).toBe(0);
  });
});
