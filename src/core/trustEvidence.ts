import { access } from "node:fs/promises";
import { join } from "node:path";
import { readJsonFile } from "./files.js";
import { cognicheckReportSchema, type CognitiveFinding, type CognicheckReport } from "./schemas.js";

export type TrustDecision = "allow" | "review" | "block";
export type TrustSeverity = "info" | "low" | "medium" | "warning" | "high" | "critical";

export interface CognicheckTrustPaths {
  reportsDir: string;
  reportJson: string;
  reportMarkdown: string;
  reportHtml: string;
}

export interface TrustEvidenceFinding {
  id: string;
  severity: TrustSeverity;
  title: string;
  message: string;
  recommendation?: string;
  source?: string;
}

export interface TrustEvidence {
  schemaVersion: "agent.trust.evidence.v1";
  tool: {
    name: "agent-cognicheck";
    version: string;
  };
  subject: {
    type: "toolset";
    name: string;
  };
  decision: TrustDecision;
  score: number;
  generatedAt: string;
  findings: TrustEvidenceFinding[];
  artifacts: Array<{ type: string; path: string }>;
  recommendations: string[];
}

export function trustEvidencePath(paths: CognicheckTrustPaths): string {
  return join(paths.reportsDir, "trust-evidence.json");
}

export async function readCognicheckReport(path: string): Promise<CognicheckReport> {
  return cognicheckReportSchema.parse(await readJsonFile(path));
}

export async function createCognicheckTrustEvidence(input: {
  paths: CognicheckTrustPaths;
  version: string;
  report?: CognicheckReport;
}): Promise<TrustEvidence> {
  const report = input.report ?? await readCognicheckReport(input.paths.reportJson);
  const findings = collectFindings(report);
  const score = computeRiskScore(report);
  const artifacts = await existingArtifacts(input.paths);
  return {
    schemaVersion: "agent.trust.evidence.v1",
    tool: {
      name: "agent-cognicheck",
      version: input.version
    },
    subject: {
      type: "toolset",
      name: "agent-cognicheck cognitive/tool attack evidence"
    },
    decision: mapDecision(report.decision),
    score,
    generatedAt: report.generatedAt,
    findings: findings.map(toTrustFinding),
    artifacts,
    recommendations: recommendationsFor(findings, mapDecision(report.decision))
  };
}

function collectFindings(report: CognicheckReport): CognitiveFinding[] {
  return [
    ...report.lint.findings,
    ...report.unicode.findings,
    ...report.attack.findings,
    ...report.policy.reasons
  ];
}

function computeRiskScore(report: CognicheckReport): number {
  return Math.max(
    report.lint.summary.riskScore,
    scoreFindings(report.unicode.findings),
    report.attack.summary.riskScore,
    report.policy.summary.riskScore
  );
}

function mapDecision(decision: CognicheckReport["decision"]): TrustDecision {
  return decision;
}

function toTrustFinding(finding: CognitiveFinding): TrustEvidenceFinding {
  return {
    id: finding.id,
    severity: finding.severity,
    title: finding.title,
    message: finding.description,
    recommendation: finding.recommendation,
    source: finding.target
  };
}

function recommendationsFor(findings: CognitiveFinding[], decision: TrustDecision): string[] {
  const recommendations = new Set(findings.map((finding) => finding.recommendation));
  if (decision === "allow") {
    recommendations.add("Keep rerunning Cognicheck when MCP tools, skills, or attack fixtures change.");
  }
  if (decision === "review") {
    recommendations.add("Review Cognicheck attack-test findings before trusting this toolset.");
  }
  if (decision === "block") {
    recommendations.add("Block this toolset until high-risk cognitive or tool-chain failures are fixed.");
  }
  return [...recommendations].filter((recommendation) => recommendation.length > 0);
}

async function existingArtifacts(paths: CognicheckTrustPaths): Promise<Array<{ type: string; path: string }>> {
  const candidates: Array<{ type: string; path: string }> = [
    { type: "cognicheck-report-json", path: paths.reportJson },
    { type: "cognicheck-report-markdown", path: paths.reportMarkdown },
    { type: "cognicheck-report-html", path: paths.reportHtml }
  ];
  const existing: Array<{ type: string; path: string }> = [];
  for (const candidate of candidates) {
    if (await fileExists(candidate.path)) {
      existing.push(candidate);
    }
  }
  return existing;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function scoreFindings(findings: CognitiveFinding[]): number {
  if (findings.some((finding) => finding.severity === "critical")) {
    return 100;
  }
  if (findings.some((finding) => finding.severity === "high")) {
    return 70;
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return 35;
  }
  return 0;
}
