import { describe, expect, it } from "vitest";
import { createCognicheckTrustEvidence, type CognicheckTrustPaths } from "../src/core/trustEvidence.js";
import type { CognitiveFinding, CognicheckReport, ToolBom } from "../src/core/schemas.js";

const generatedAt = "2026-05-30T00:00:00.000Z";
const paths: CognicheckTrustPaths = {
  reportsDir: "D:\\tmp\\cognicheck-evidence-test\\.cognicheck\\reports",
  reportJson: "D:\\tmp\\cognicheck-evidence-test\\.cognicheck\\reports\\cognicheck-report.json",
  reportMarkdown: "D:\\tmp\\cognicheck-evidence-test\\.cognicheck\\reports\\cognicheck-report.md",
  reportHtml: "D:\\tmp\\cognicheck-evidence-test\\.cognicheck\\reports\\cognicheck-report.html"
};

const bom: ToolBom = {
  schemaVersion: 1,
  generatedAt,
  root: "examples",
  summary: {
    tools: 1,
    mcpTools: 1,
    mcpServers: 0,
    skills: 0,
    capabilities: 1
  },
  tools: []
};

const finding: CognitiveFinding = {
  id: "attack.secret-exfiltration",
  severity: "critical",
  category: "attack",
  title: "Secret exfiltration path",
  description: "A tool accepted a prompt-injection payload that sends secrets externally.",
  target: "send_email",
  evidence: ["secret -> external-post"],
  recommendation: "Block external-post tools until approval is enforced."
};

describe("Cognicheck trust evidence", () => {
  it("normalizes cognitive attack reports into trust evidence", async () => {
    const report: CognicheckReport = {
      generatedAt,
      decision: "block",
      bom,
      lint: {
        generatedAt,
        decision: "block",
        summary: {
          tools: 1,
          findings: 1,
          criticalFindings: 1,
          highFindings: 0,
          riskScore: 100
        },
        bom,
        findings: [finding]
      },
      unicode: {
        generatedAt,
        summary: {
          files: 1,
          findings: 0
        },
        findings: []
      },
      attack: {
        generatedAt,
        decision: "allow",
        summary: {
          scenarios: 1,
          passed: 1,
          failed: 0,
          criticalFailures: 0,
          highFailures: 0,
          riskScore: 0
        },
        bom,
        scenarios: [],
        results: [],
        findings: []
      },
      policy: {
        generatedAt,
        decision: "block",
        summary: {
          reasons: 1,
          riskScore: 100
        },
        reasons: [finding]
      }
    };

    const evidence = await createCognicheckTrustEvidence({ paths, version: "0.2.0", report });

    expect(evidence.schemaVersion).toBe("agent.trust.evidence.v1");
    expect(evidence.subject.type).toBe("toolset");
    expect(evidence.decision).toBe("block");
    expect(evidence.score).toBe(100);
    expect(evidence.findings).toHaveLength(2);
  });
});
