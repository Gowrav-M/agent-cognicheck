import type { CognitiveFinding, Severity } from "./schemas.js";

const severityRank: Record<Severity, number> = {
  info: 0,
  warning: 1,
  high: 2,
  critical: 3
};

const severityPoints: Record<Severity, number> = {
  info: 2,
  warning: 8,
  high: 30,
  critical: 55
};

export function riskScore(items: Array<Pick<CognitiveFinding, "severity">>): number {
  return Math.min(100, items.reduce((score, item) => score + severityPoints[item.severity], 0));
}

export function decisionFromFindings(items: Array<Pick<CognitiveFinding, "severity">>): "allow" | "review" | "block" {
  if (items.some((item) => item.severity === "critical")) return "block";
  if (items.some((item) => item.severity === "high" || item.severity === "warning")) return "review";
  return "allow";
}

export function meetsSeverity(items: Array<Pick<CognitiveFinding, "severity">>, threshold: Severity | undefined): boolean {
  if (threshold === undefined) return false;
  return items.some((item) => severityRank[item.severity] >= severityRank[threshold]);
}

export function severityGte(severity: Severity, threshold: Severity): boolean {
  return severityRank[severity] >= severityRank[threshold];
}
