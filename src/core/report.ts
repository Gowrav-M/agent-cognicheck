import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runAttackHarness } from "./attack.js";
import { buildToolBom } from "./discover.js";
import { ensureDir, writeJsonFile } from "./files.js";
import { lintTools } from "./lint.js";
import { evaluatePolicy } from "./policy.js";
import { cognicheckReportSchema, type AttackReport, type CognicheckReport, type LintReport, type ToolBom, type UnicodeScanResult } from "./schemas.js";
import { scanUnicode } from "./unicode.js";

export interface ReportArtifacts {
  json: string;
  markdown: string;
  html: string;
}

export async function createCognicheckReport(inputPath: string): Promise<CognicheckReport> {
  const generatedAt = new Date().toISOString();
  const bom = await buildToolBom(inputPath, { generatedAt });
  const lint = await lintTools(inputPath, { generatedAt, bom });
  const unicode = await scanUnicode(inputPath, { generatedAt });
  const attack = await runAttackHarness(inputPath, { generatedAt, bom });
  const policy = evaluatePolicy({ lint, attack, generatedAt, policy: { failOn: "high", maxRiskScore: 80 } });
  const decision = policy.decision === "block" || lint.decision === "block" || attack.decision === "block"
    ? "block"
    : policy.decision === "review" || lint.decision === "review" || attack.decision === "review"
      ? "review"
      : "allow";

  return cognicheckReportSchema.parse({
    generatedAt,
    decision,
    bom,
    lint,
    unicode,
    attack,
    policy
  });
}

export async function writeBomArtifacts(bom: ToolBom, reportsDir: string): Promise<string> {
  await ensureDir(reportsDir);
  const path = join(reportsDir, "toolbom.json");
  await writeJsonFile(path, bom);
  return path;
}

export async function writeLintArtifacts(report: LintReport, reportsDir: string): Promise<ReportArtifacts> {
  return writeNamedArtifacts("cognicheck-lint", reportsDir, report, renderLintMarkdown(report), renderLintHtml(report));
}

export async function writeUnicodeArtifacts(report: UnicodeScanResult, reportsDir: string): Promise<ReportArtifacts> {
  return writeNamedArtifacts("cognicheck-unicode", reportsDir, report, renderUnicodeMarkdown(report), renderGenericHtml("Unicode Scan", report.summary, report.findings));
}

export async function writeAttackArtifacts(report: AttackReport, reportsDir: string): Promise<ReportArtifacts> {
  return writeNamedArtifacts("cognicheck-attack", reportsDir, report, renderAttackMarkdown(report), renderAttackHtml(report));
}

export async function writeCognicheckArtifacts(report: CognicheckReport, reportsDir: string): Promise<ReportArtifacts> {
  return writeNamedArtifacts("cognicheck-report", reportsDir, report, renderCognicheckMarkdown(report), renderCognicheckHtml(report));
}

async function writeNamedArtifacts(name: string, reportsDir: string, json: unknown, markdown: string, html: string): Promise<ReportArtifacts> {
  await ensureDir(reportsDir);
  const jsonPath = join(reportsDir, `${name}.json`);
  const markdownPath = join(reportsDir, `${name}.md`);
  const htmlPath = join(reportsDir, `${name}.html`);
  await writeJsonFile(jsonPath, json);
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(htmlPath, html, "utf8");
  return { json: jsonPath, markdown: markdownPath, html: htmlPath };
}

function renderCognicheckMarkdown(report: CognicheckReport): string {
  return [
    "# Agent Cognicheck Report",
    "",
    `Decision: **${report.decision.toUpperCase()}**`,
    "",
    `- Tools: ${report.bom.summary.tools}`,
    `- Lint findings: ${report.lint.summary.findings}`,
    `- Unicode findings: ${report.unicode.summary.findings}`,
    `- Attack failures: ${report.attack.summary.failed}`,
    `- Policy reasons: ${report.policy.summary.reasons}`,
    "",
    "## Failed Attack Scenarios",
    "",
    ...report.attack.results.filter((result) => result.outcome === "fail").map((result) => `- [${result.severity.toUpperCase()}] ${result.scenarioId}: ${result.target}`),
    ""
  ].join("\n");
}

function renderLintMarkdown(report: LintReport): string {
  const lines = [
    "# Cognitive Lint Report",
    "",
    `Decision: **${report.decision.toUpperCase()}**`,
    "",
    `- Findings: ${report.summary.findings}`,
    `- Critical: ${report.summary.criticalFindings}`,
    `- High: ${report.summary.highFindings}`,
    `- Risk score: ${report.summary.riskScore}/100`,
    "",
    "## Findings",
    ""
  ];
  for (const finding of report.findings) {
    lines.push(`- [${finding.severity.toUpperCase()}] ${finding.category}: ${finding.target}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderUnicodeMarkdown(report: UnicodeScanResult): string {
  const lines = ["# Unicode Scan Report", "", `- Files: ${report.summary.files}`, `- Findings: ${report.summary.findings}`, "", "## Findings", ""];
  for (const finding of report.findings) {
    lines.push(`- [${finding.severity.toUpperCase()}] ${finding.category}: ${finding.target}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderAttackMarkdown(report: AttackReport): string {
  const lines = [
    "# Cognitive Attack Harness Report",
    "",
    `Decision: **${report.decision.toUpperCase()}**`,
    "",
    `- Scenarios: ${report.summary.scenarios}`,
    `- Failed: ${report.summary.failed}`,
    `- Risk score: ${report.summary.riskScore}/100`,
    "",
    "## Scenario Results",
    ""
  ];
  for (const result of report.results) {
    lines.push(`- [${result.outcome.toUpperCase()}] ${result.scenarioId}: ${result.target}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderCognicheckHtml(report: CognicheckReport): string {
  return renderGenericHtml("Agent Cognicheck Report", {
    decision: report.decision,
    tools: report.bom.summary.tools,
    lintFindings: report.lint.summary.findings,
    unicodeFindings: report.unicode.summary.findings,
    attackFailures: report.attack.summary.failed,
    policyReasons: report.policy.summary.reasons
  }, [...report.lint.findings, ...report.attack.findings, ...report.policy.reasons]);
}

function renderLintHtml(report: LintReport): string {
  return renderGenericHtml("Cognitive Lint Report", report.summary, report.findings);
}

function renderAttackHtml(report: AttackReport): string {
  return renderGenericHtml("Cognitive Attack Harness Report", report.summary, report.findings);
}

function renderGenericHtml(title: string, summary: Record<string, unknown>, findings: Array<{ severity: string; category: string; target: string; description: string }>): string {
  const metrics = Object.entries(summary).map(([key, value]) => `<div class="metric"><strong>${escapeHtml(String(value))}</strong><br>${escapeHtml(key)}</div>`).join("\n");
  const findingHtml = findings.length === 0
    ? "<p>No findings.</p>"
    : findings.map((finding) => `<article class="${escapeHtml(finding.severity)}"><h3>${escapeHtml(finding.category)}</h3><p>${escapeHtml(finding.target)}</p><p>${escapeHtml(finding.description)}</p></article>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; color: #17202a; background: #f7f9fb; }
    main { max-width: 960px; margin: 0 auto; padding: 40px 20px; }
    section, article { background: #fff; border: 1px solid #d7dee8; border-radius: 8px; padding: 18px; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .metric { background: #f7f9fb; border: 1px solid #d7dee8; border-radius: 8px; padding: 14px; }
    .critical { border-left: 5px solid #b42318; }
    .high { border-left: 5px solid #b54708; }
    .warning { border-left: 5px solid #f2c94c; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>${escapeHtml(title)}</h1>
      <div class="grid">${metrics}</div>
    </section>
    ${findingHtml}
  </main>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
