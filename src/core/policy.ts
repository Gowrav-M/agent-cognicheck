import { decisionFromFindings, riskScore, severityGte } from "./risk.js";
import { policyConfigSchema, policyDecisionSchema, type AttackReport, type CognitiveFinding, type LintReport, type PolicyConfig, type PolicyDecision } from "./schemas.js";

interface EvaluatePolicyInput {
  lint?: LintReport;
  attack?: AttackReport;
  policy?: Partial<PolicyConfig>;
  generatedAt?: string;
}

export function evaluatePolicy(input: EvaluatePolicyInput): PolicyDecision {
  const policy = policyConfigSchema.parse(input.policy ?? {});
  const findings = [...(input.lint?.findings ?? []), ...(input.attack?.findings ?? [])];
  const reasons: CognitiveFinding[] = [];

  const thresholdFindings = findings.filter((finding) => severityGte(finding.severity, policy.failOn));
  if (thresholdFindings.length > 0) {
    reasons.push(policyReason("policy.fail_on_severity", "critical", "Findings meet policy fail threshold", `Found ${thresholdFindings.length} finding(s) at ${policy.failOn} or higher.`, thresholdFindings.map((finding) => `${finding.severity}:${finding.category}`)));
  }

  const bom = input.attack?.bom ?? input.lint?.bom;
  const deniedTools = bom?.tools.filter((tool) => tool.capabilities.some((capability) => policy.deniedCapabilities.includes(capability))) ?? [];
  if (deniedTools.length > 0) {
    reasons.push(policyReason("policy.denied_capability", "high", "Denied capabilities are present", "One or more tools use capabilities denied by policy.", deniedTools.map((tool) => `${tool.name}:${tool.capabilities.join(",")}`)));
  }

  const score = Math.max(input.attack?.summary.riskScore ?? 0, input.lint?.summary.riskScore ?? 0, riskScore(findings));
  if (score > policy.maxRiskScore) {
    reasons.push(policyReason("policy.max_risk_score", "high", "Risk score exceeds policy maximum", `Risk score ${score} exceeds maximum ${policy.maxRiskScore}.`, [`${score}`]));
  }

  return policyDecisionSchema.parse({
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    decision: decisionFromFindings(reasons),
    summary: {
      reasons: reasons.length,
      riskScore: Math.min(100, Math.max(score, riskScore(reasons)))
    },
    reasons
  });
}

function policyReason(category: string, severity: CognitiveFinding["severity"], title: string, description: string, evidence: string[]): CognitiveFinding {
  return {
    id: category,
    severity,
    category,
    title,
    description,
    target: "policy",
    evidence,
    recommendation: "Update the tool stack, lower privileges, or explicitly approve the exception in policy."
  };
}
