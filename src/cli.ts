#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, InvalidArgumentError } from "commander";
import { runAttackHarness } from "./core/attack.js";
import { buildToolBom } from "./core/discover.js";
import { ensureDir, writeJsonFile } from "./core/files.js";
import { lintTools } from "./core/lint.js";
import { evaluatePolicy } from "./core/policy.js";
import { createCognicheckReport, writeAttackArtifacts, writeBomArtifacts, writeCognicheckArtifacts, writeLintArtifacts, writeUnicodeArtifacts } from "./core/report.js";
import { meetsSeverity } from "./core/risk.js";
import { severitySchema, type CognitiveFinding, type Severity } from "./core/schemas.js";
import { createCognicheckTrustEvidence, trustEvidencePath } from "./core/trustEvidence.js";
import { scanUnicode } from "./core/unicode.js";

const program = new Command();

program
  .name("agent-cognicheck")
  .description("Local-first cognitive security and attack-test harness for MCP servers, agent tools, and skills.")
  .version("0.2.0");

program
  .command("init")
  .description("Create local .cognicheck configuration.")
  .action(async () => {
    const dir = localDir();
    await ensureDir(dir);
    const configPath = join(dir, "config.json");
    if (!existsSync(configPath)) {
      await writeJsonFile(configPath, {
        schemaVersion: 1,
        failOn: "critical",
        deniedCapabilities: ["secret-access", "shell", "mcp-mutation"],
        maxRiskScore: 80
      });
    }
    console.log(`Initialized ${configPath}`);
  });

program
  .command("demo")
  .description("Run the bundled cognitive security demo.")
  .action(async () => {
    const report = await createCognicheckReport(bundledExamplesDir());
    const artifacts = await writeCognicheckArtifacts(report, reportsDir());
    console.log("Cognicheck demo complete");
    console.log(`Decision: ${report.decision.toUpperCase()}`);
    console.log(`Tools: ${report.bom.summary.tools}`);
    console.log(`Attack failures: ${report.attack.summary.failed}`);
    console.log(`Wrote ${artifacts.json}`);
    console.log(`Wrote ${artifacts.markdown}`);
    console.log(`Wrote ${artifacts.html}`);
  });

program
  .command("discover")
  .argument("[path]", "Directory, MCP descriptor, MCP config, or skill path. Defaults to bundled examples.")
  .description("Discover MCP tools, MCP server configs, and skills.")
  .action(async (path: string | undefined) => {
    const bom = await buildToolBom(resolveInputPath(path));
    const artifact = await writeBomArtifacts(bom, reportsDir());
    console.log(`Discovered ${bom.summary.tools} tools/skills`);
    console.log(`Wrote ${artifact}`);
  });

program
  .command("bom")
  .argument("[path]", "Directory, MCP descriptor, MCP config, or skill path. Defaults to bundled examples.")
  .description("Generate ToolBOM/SkillBOM JSON.")
  .action(async (path: string | undefined) => {
    const bom = await buildToolBom(resolveInputPath(path));
    const artifact = await writeBomArtifacts(bom, reportsDir());
    console.log(`ToolBOM tools: ${bom.summary.tools}`);
    console.log(`Wrote ${artifact}`);
  });

program
  .command("lint")
  .argument("[path]", "Directory, MCP descriptor, MCP config, or skill path. Defaults to bundled examples.")
  .option("--fail-on <severity>", "Exit non-zero when severity threshold is met.", parseSeverity)
  .description("Run cognitive lint rules over tools and skills.")
  .action(async (path: string | undefined, options: { failOn?: Severity }) => {
    const report = await lintTools(resolveInputPath(path));
    const artifacts = await writeLintArtifacts(report, reportsDir());
    console.log(`Lint decision: ${report.decision.toUpperCase()}`);
    console.log(`Findings: ${report.summary.findings}`);
    console.log(`Wrote ${artifacts.json}`);
    applyFailOn(report.findings, options.failOn);
  });

program
  .command("unicode-scan")
  .argument("[path]", "Directory, MCP descriptor, MCP config, or skill path. Defaults to bundled examples.")
  .option("--fail-on <severity>", "Exit non-zero when severity threshold is met.", parseSeverity)
  .description("Scan tool and skill text for hidden Unicode payloads.")
  .action(async (path: string | undefined, options: { failOn?: Severity }) => {
    const report = await scanUnicode(resolveInputPath(path));
    const artifacts = await writeUnicodeArtifacts(report, reportsDir());
    console.log(`Unicode findings: ${report.summary.findings}`);
    console.log(`Wrote ${artifacts.json}`);
    applyFailOn(report.findings, options.failOn);
  });

program
  .command("attack")
  .argument("[path]", "Directory, MCP descriptor, MCP config, or skill path. Defaults to bundled examples.")
  .option("--fail-on <severity>", "Exit non-zero when attack failures meet threshold.", parseSeverity)
  .description("Run deterministic cognitive attack scenarios.")
  .action(async (path: string | undefined, options: { failOn?: Severity }) => {
    const report = await runAttackHarness(resolveInputPath(path));
    const artifacts = await writeAttackArtifacts(report, reportsDir());
    console.log(`Attack decision: ${report.decision.toUpperCase()}`);
    console.log(`Scenarios: ${report.summary.scenarios}`);
    console.log(`Failures: ${report.summary.failed}`);
    console.log(`Wrote ${artifacts.json}`);
    applyFailOn(report.findings, options.failOn);
  });

const policy = program.command("policy").description("Evaluate cognitive security policy.");
policy
  .command("check")
  .argument("[path]", "Directory, MCP descriptor, MCP config, or skill path. Defaults to bundled examples.")
  .option("--fail-on <severity>", "Policy severity threshold.", parseSeverity)
  .description("Run lint + attack, then evaluate policy.")
  .action(async (path: string | undefined, options: { failOn?: Severity }) => {
    const target = resolveInputPath(path);
    const lint = await lintTools(target);
    const attack = await runAttackHarness(target, { generatedAt: lint.generatedAt, bom: lint.bom });
    const decision = evaluatePolicy({ lint, attack, policy: { failOn: options.failOn ?? "critical" } });
    await writeJsonFile(join(reportsDir(), "cognicheck-policy.json"), decision);
    console.log(`Policy decision: ${decision.decision.toUpperCase()}`);
    console.log(`Reasons: ${decision.summary.reasons}`);
    applyFailOn(decision.reasons, options.failOn);
  });

program
  .command("report")
  .argument("[path]", "Directory, MCP descriptor, MCP config, or skill path. Defaults to bundled examples.")
  .description("Generate combined JSON, Markdown, and HTML reports.")
  .action(async (path: string | undefined) => {
    const report = await createCognicheckReport(resolveInputPath(path));
    const artifacts = await writeCognicheckArtifacts(report, reportsDir());
    console.log(`Report decision: ${report.decision.toUpperCase()}`);
    console.log(`Wrote ${artifacts.json}`);
    console.log(`Wrote ${artifacts.markdown}`);
    console.log(`Wrote ${artifacts.html}`);
  });

program
  .command("evidence")
  .description("Write normalized Agent Trust Center evidence from the latest Cognicheck report.")
  .action(async () => {
    const paths = cognicheckTrustPaths();
    if (!existsSync(paths.reportJson)) {
      throw new Error("No Cognicheck report found. Run agent-cognicheck demo or report first.");
    }
    const evidence = await createCognicheckTrustEvidence({ paths, version: "0.2.0" });
    const outputPath = trustEvidencePath(paths);
    await writeJsonFile(outputPath, evidence);
    console.log(`Decision: ${evidence.decision.toUpperCase()}`);
    console.log(`Trust evidence: ${outputPath}`);
  });

program
  .command("doctor")
  .description("Check runtime and output folder readiness.")
  .action(async () => {
    const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
    const dir = reportsDir();
    await ensureDir(dir);
    console.log(`Node: ${process.version}`);
    console.log(`Node >=22: ${major >= 22 ? "yes" : "no"}`);
    console.log(`Reports writable: ${dir}`);
    if (major < 22) process.exitCode = 1;
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function localDir(): string {
  return join(process.cwd(), ".cognicheck");
}

function reportsDir(): string {
  return join(localDir(), "reports");
}

function cognicheckTrustPaths(): { reportsDir: string; reportJson: string; reportMarkdown: string; reportHtml: string } {
  const dir = reportsDir();
  return {
    reportsDir: dir,
    reportJson: join(dir, "cognicheck-report.json"),
    reportMarkdown: join(dir, "cognicheck-report.md"),
    reportHtml: join(dir, "cognicheck-report.html")
  };
}

function resolveInputPath(path: string | undefined): string {
  return path === undefined ? bundledExamplesDir() : resolve(path);
}

function bundledExamplesDir(): string {
  return join(packageRoot(), "examples");
}

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function parseSeverity(value: string): Severity {
  const parsed = severitySchema.safeParse(value);
  if (!parsed.success) throw new InvalidArgumentError("Expected one of: info, warning, high, critical");
  return parsed.data;
}

function applyFailOn(findings: CognitiveFinding[], threshold: Severity | undefined): void {
  if (!meetsSeverity(findings, threshold)) return;
  console.error(`Policy threshold failed: found ${threshold} or higher severity finding.`);
  process.exitCode = 1;
}
