import { describe, expect, it } from "vitest";
import { lintTools } from "../src/core/lint.js";

describe("cognitive lint", () => {
  it("flags prompt injection, secret exfiltration, and overbroad MCP configs", async () => {
    const report = await lintTools("examples");

    expect(report.decision).toBe("block");
    expect(report.findings.some((finding) => finding.category === "tool_poisoning.instruction_override" && finding.severity === "critical")).toBe(true);
    expect(report.findings.some((finding) => finding.category === "exfiltration.secret_to_network" && finding.severity === "critical")).toBe(true);
    expect(report.findings.some((finding) => finding.category === "mcp_config.overprivileged_token")).toBe(true);
  });

  it("keeps the safe descriptor low risk", async () => {
    const report = await lintTools("examples/mcp/safe-tools.json");

    expect(report.decision).toBe("allow");
    expect(report.summary.criticalFindings).toBe(0);
    expect(report.summary.highFindings).toBe(0);
  });
});
