import { z } from "zod";

export const severitySchema = z.enum(["info", "warning", "high", "critical"]);

export const capabilitySchema = z.enum([
  "network",
  "external-post",
  "shell",
  "filesystem-read",
  "filesystem-write",
  "git-read",
  "git-write",
  "browser-session",
  "secret-access",
  "mcp-mutation",
  "rag-read",
  "package-install"
]);

export const toolKindSchema = z.enum(["mcp-tool", "mcp-server", "skill"]);

export const cognitiveFindingSchema = z.object({
  id: z.string().min(1),
  severity: severitySchema,
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  target: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  recommendation: z.string().min(1)
});

export const discoveredToolSchema = z.object({
  id: z.string().min(1),
  kind: toolKindSchema,
  name: z.string().min(1),
  description: z.string().default(""),
  sourcePath: z.string().min(1),
  serverName: z.string().optional(),
  inputSchemaHash: z.string().optional(),
  hasInputSchema: z.boolean(),
  annotations: z.record(z.unknown()).default({}),
  capabilities: z.array(capabilitySchema),
  rawText: z.string().default("")
});

export const toolBomSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  root: z.string().min(1),
  summary: z.object({
    tools: z.number().int().nonnegative(),
    mcpTools: z.number().int().nonnegative(),
    mcpServers: z.number().int().nonnegative(),
    skills: z.number().int().nonnegative(),
    capabilities: z.number().int().nonnegative()
  }),
  tools: z.array(discoveredToolSchema)
});

export const unicodeScanResultSchema = z.object({
  generatedAt: z.string().datetime(),
  summary: z.object({
    files: z.number().int().nonnegative(),
    findings: z.number().int().nonnegative()
  }),
  findings: z.array(cognitiveFindingSchema)
});

export const lintReportSchema = z.object({
  generatedAt: z.string().datetime(),
  decision: z.enum(["allow", "review", "block"]),
  summary: z.object({
    tools: z.number().int().nonnegative(),
    findings: z.number().int().nonnegative(),
    criticalFindings: z.number().int().nonnegative(),
    highFindings: z.number().int().nonnegative(),
    riskScore: z.number().int().min(0).max(100)
  }),
  bom: toolBomSchema,
  findings: z.array(cognitiveFindingSchema)
});

export const attackScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  severity: severitySchema,
  payload: z.string().min(1),
  objective: z.string().min(1)
});

export const attackResultSchema = z.object({
  scenarioId: z.string().min(1),
  scenarioTitle: z.string().min(1),
  outcome: z.enum(["pass", "fail"]),
  severity: severitySchema,
  target: z.string().min(1),
  evidence: z.array(z.string()).default([])
});

export const attackReportSchema = z.object({
  generatedAt: z.string().datetime(),
  decision: z.enum(["allow", "review", "block"]),
  summary: z.object({
    scenarios: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    criticalFailures: z.number().int().nonnegative(),
    highFailures: z.number().int().nonnegative(),
    riskScore: z.number().int().min(0).max(100)
  }),
  bom: toolBomSchema,
  scenarios: z.array(attackScenarioSchema),
  results: z.array(attackResultSchema),
  findings: z.array(cognitiveFindingSchema)
});

export const policyConfigSchema = z.object({
  failOn: severitySchema.default("critical"),
  deniedCapabilities: z.array(capabilitySchema).default(["secret-access", "shell", "mcp-mutation"]),
  maxRiskScore: z.number().int().min(0).max(100).default(80)
});

export const policyDecisionSchema = z.object({
  generatedAt: z.string().datetime(),
  decision: z.enum(["allow", "review", "block"]),
  summary: z.object({
    reasons: z.number().int().nonnegative(),
    riskScore: z.number().int().min(0).max(100)
  }),
  reasons: z.array(cognitiveFindingSchema)
});

export const cognicheckReportSchema = z.object({
  generatedAt: z.string().datetime(),
  decision: z.enum(["allow", "review", "block"]),
  bom: toolBomSchema,
  lint: lintReportSchema,
  unicode: unicodeScanResultSchema,
  attack: attackReportSchema,
  policy: policyDecisionSchema
});

export type Severity = z.infer<typeof severitySchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type CognitiveFinding = z.infer<typeof cognitiveFindingSchema>;
export type DiscoveredTool = z.infer<typeof discoveredToolSchema>;
export type ToolBom = z.infer<typeof toolBomSchema>;
export type UnicodeScanResult = z.infer<typeof unicodeScanResultSchema>;
export type LintReport = z.infer<typeof lintReportSchema>;
export type AttackScenario = z.infer<typeof attackScenarioSchema>;
export type AttackResult = z.infer<typeof attackResultSchema>;
export type AttackReport = z.infer<typeof attackReportSchema>;
export type PolicyConfig = z.infer<typeof policyConfigSchema>;
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type CognicheckReport = z.infer<typeof cognicheckReportSchema>;
