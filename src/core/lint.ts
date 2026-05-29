import { buildToolBom } from "./discover.js";
import { sha256 } from "./files.js";
import { decisionFromFindings, riskScore } from "./risk.js";
import { lintReportSchema, type Capability, type CognitiveFinding, type DiscoveredTool, type LintReport, type ToolBom } from "./schemas.js";
import { findUnicodeFindings } from "./unicode.js";

interface LintToolsOptions {
  generatedAt?: string;
  bom?: ToolBom;
}

const instructionOverridePattern = /\b(ignore previous|ignore all previous|developer message|system prompt|do not reveal|bypass|silently|without asking)\b/i;
const exfiltrationPattern = /\b(send all|send copied|exfiltrat|webhook|attacker|steal|collect api keys|collect.*password|environment tokens)\b/i;
const weakDescriptionPattern = /^.{0,20}$/;

export async function lintTools(inputPath: string, options: LintToolsOptions = {}): Promise<LintReport> {
  const bom = options.bom ?? await buildToolBom(inputPath, options.generatedAt === undefined ? {} : { generatedAt: options.generatedAt });
  const findings = bom.tools.flatMap(lintTool);
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;
  const highFindings = findings.filter((finding) => finding.severity === "high").length;

  return lintReportSchema.parse({
    generatedAt: options.generatedAt ?? bom.generatedAt,
    decision: decisionFromFindings(findings),
    summary: {
      tools: bom.summary.tools,
      findings: findings.length,
      criticalFindings,
      highFindings,
      riskScore: riskScore(findings)
    },
    bom,
    findings
  });
}

function lintTool(tool: DiscoveredTool): CognitiveFinding[] {
  const findings: CognitiveFinding[] = [];
  const text = `${tool.name}\n${tool.description}\n${tool.rawText}`;

  if (instructionOverridePattern.test(text)) {
    findings.push(finding(tool, "tool_poisoning.instruction_override", "critical", "Instruction override language detected", "The tool or skill contains language that attempts to override system, developer, or user instructions.", ["override-like text"]));
  }

  if (exfiltrationPattern.test(text)) {
    findings.push(finding(tool, "tool_poisoning.exfiltration_language", "critical", "Exfiltration language detected", "The tool or skill appears to instruct data collection or external exfiltration.", ["exfiltration-like text"]));
  }

  if (hasAll(tool.capabilities, ["secret-access", "network"])) {
    findings.push(finding(tool, "exfiltration.secret_to_network", "critical", "Secret access is combined with network capability", "A single tool or skill can plausibly read secrets and send data externally.", tool.capabilities));
  }

  if (tool.kind === "mcp-server" && tool.rawText.includes("GITHUB_PERSONAL_ACCESS_TOKEN")) {
    findings.push(finding(tool, "mcp_config.overprivileged_token", "high", "Broad GitHub token exposed to MCP server", "A GitHub personal access token in MCP server environment variables is high risk unless scoped and isolated.", ["GITHUB_PERSONAL_ACCESS_TOKEN"]));
  }

  if (!tool.hasInputSchema && tool.kind === "mcp-tool") {
    findings.push(finding(tool, "schema.missing_input_schema", "warning", "MCP tool is missing input schema", "Tools without input schemas are harder to validate and policy-gate.", []));
  }

  if (weakDescriptionPattern.test(tool.description.trim())) {
    findings.push(finding(tool, "description.weak", "warning", "Tool description is too weak for review", "Short or empty descriptions make tool intent and risk hard to evaluate.", [tool.description]));
  }

  if (tool.capabilities.length >= 4) {
    findings.push(finding(tool, "capability.broad_surface", "high", "Tool has broad capability surface", "Tools with many high-power capabilities are difficult to reason about and should be split or gated.", tool.capabilities));
  }

  for (const unicodeFinding of findUnicodeFindings(tool.sourcePath, tool.rawText)) {
    findings.push({
      ...unicodeFinding,
      target: tool.name,
      id: `${unicodeFinding.category}:${sha256(`${tool.id}:${unicodeFinding.id}`).slice(0, 12)}`
    });
  }

  return findings;
}

function finding(tool: DiscoveredTool, category: string, severity: CognitiveFinding["severity"], title: string, description: string, evidence: string[]): CognitiveFinding {
  return {
    id: `${category}:${sha256(`${tool.id}:${category}:${evidence.join("|")}`).slice(0, 12)}`,
    severity,
    category,
    title,
    description,
    target: tool.name,
    evidence,
    recommendation: recommendationFor(category)
  };
}

function recommendationFor(category: string): string {
  if (category.startsWith("tool_poisoning")) return "Remove hidden or adversarial instructions from descriptions, examples, and skill text.";
  if (category === "exfiltration.secret_to_network") return "Separate secret-reading and network-posting capabilities behind explicit approval.";
  if (category === "mcp_config.overprivileged_token") return "Use a least-privilege token, scoped app identity, or isolated MCP profile.";
  if (category === "schema.missing_input_schema") return "Add strict JSON input schemas for all tool parameters.";
  if (category === "capability.broad_surface") return "Split the tool into smaller read-only/write-only capabilities and gate high-risk operations.";
  return "Review and reduce this cognitive risk before exposing the tool to an agent.";
}

function hasAll(values: Capability[], required: Capability[]): boolean {
  return required.every((capability) => values.includes(capability));
}
