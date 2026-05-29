import { extname, relative, resolve } from "node:path";
import { listFiles, readJsonFile, safeReadText, sha256, toPosixPath } from "./files.js";
import { toolBomSchema, type Capability, type DiscoveredTool, type ToolBom } from "./schemas.js";

interface JsonRecord {
  [key: string]: unknown;
}

interface BuildToolBomOptions {
  generatedAt?: string;
}

const capabilityPatterns: Array<[Capability, RegExp]> = [
  ["secret-access", /(?:\bsecret\b|\btoken\b|_TOKEN\b|\bcredential\b|\bpassword\b|api[_ -]?key|\.env|private key)/i],
  ["network", /\b(http|https|url|webhook|network|fetch|post|send|slack|email|external|upload)\b/i],
  ["external-post", /\b(webhook|slack|email|post|send|upload|publish)\b/i],
  ["shell", /\b(shell|exec|command|bash|powershell|spawn|terminal|subprocess)\b/i],
  ["filesystem-read", /\b(read file|filesystem read|local file|\.env|path|directory|workspace|source files?)\b/i],
  ["filesystem-write", /\b(write file|delete|remove|overwrite|save file|filesystem write|modify files?)\b/i],
  ["git-read", /\b(repo|repository|github|git|issue|pull request|commit|source)\b/i],
  ["git-write", /\b(push|commit|pull request|merge|tag|release|write repository)\b/i],
  ["browser-session", /\b(browser|cookie|session|localstorage|playwright|chrome)\b/i],
  ["mcp-mutation", /\b(mutate tools?|update tool|register tool|mcp mutation|change descriptor)\b/i],
  ["rag-read", /\b(rag|vector|embedding|knowledge base|document retrieval)\b/i],
  ["package-install", /\b(npm install|pip install|package install|curl.+sh|install script)\b/i]
];

export async function buildToolBom(inputPath: string, options: BuildToolBomOptions = {}): Promise<ToolBom> {
  const root = resolve(inputPath);
  const files = await listFiles(root);
  const tools: DiscoveredTool[] = [];

  for (const filePath of files) {
    if (filePath.endsWith("SKILL.md")) {
      const skill = await parseSkill(filePath);
      if (skill !== undefined) tools.push(skill);
      continue;
    }

    if (extname(filePath).toLowerCase() === ".json") {
      for (const tool of await parseJsonTools(filePath)) {
        tools.push(tool);
      }
    }
  }

  const uniqueCapabilities = new Set(tools.flatMap((tool) => tool.capabilities));
  return toolBomSchema.parse({
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    root,
    summary: {
      tools: tools.length,
      mcpTools: tools.filter((tool) => tool.kind === "mcp-tool").length,
      mcpServers: tools.filter((tool) => tool.kind === "mcp-server").length,
      skills: tools.filter((tool) => tool.kind === "skill").length,
      capabilities: uniqueCapabilities.size
    },
    tools: tools.sort((left, right) => left.id.localeCompare(right.id))
  });
}

async function parseJsonTools(filePath: string): Promise<DiscoveredTool[]> {
  let json: unknown;
  try {
    json = await readJsonFile(filePath);
  } catch {
    return [];
  }

  const text = await safeReadText(filePath) ?? "";
  const tools: DiscoveredTool[] = [];
  if (isRecord(json) && isRecord(json["mcpServers"])) {
    for (const [name, config] of Object.entries(json["mcpServers"])) {
      const raw = JSON.stringify(config);
      const capabilities = inferCapabilities(`${name} ${raw}`);
      const env = isRecord(config) && isRecord(config["env"]) ? Object.keys(config["env"]).join(" ") : "";
      tools.push(makeTool({
        kind: "mcp-server",
        name,
        description: `MCP server config ${name} ${env}`,
        sourcePath: filePath,
        serverName: name,
        hasInputSchema: true,
        inputSchema: config,
        rawText: raw,
        capabilities
      }));
    }
  }

  const descriptorTools = extractToolArray(json);
  const server = isRecord(json) && isRecord(json["server"]) ? json["server"] : undefined;
  const serverName = isRecord(server) && typeof server["name"] === "string" ? server["name"] : undefined;
  for (const item of descriptorTools) {
    const name = typeof item["name"] === "string" ? item["name"] : "unknown-tool";
    const description = typeof item["description"] === "string" ? item["description"] : "";
    const schema = isRecord(item["inputSchema"]) ? item["inputSchema"] : undefined;
    const raw = JSON.stringify(item);
    tools.push(makeTool({
      kind: "mcp-tool",
      name,
      description,
      sourcePath: filePath,
      hasInputSchema: schema !== undefined,
      ...(serverName === undefined ? {} : { serverName }),
      ...(schema === undefined ? {} : { inputSchema: schema }),
      annotations: isRecord(item["annotations"]) ? item["annotations"] : {},
      rawText: `${description}\n${raw}\n${text}`,
      capabilities: inferCapabilities(`${name} ${description} ${raw}`)
    }));
  }

  return tools;
}

async function parseSkill(filePath: string): Promise<DiscoveredTool | undefined> {
  const text = await safeReadText(filePath);
  if (text === undefined) return undefined;
  const frontmatter = parseFrontmatter(text);
  const name = frontmatter.name ?? "unnamed-skill";
  const description = frontmatter.description ?? "";
  const declared = frontmatter.declaredCapabilities.filter(isCapability);
  const inferred = inferCapabilities(`${name} ${description} ${text}`);
  const capabilities = [...new Set([...declared, ...inferred])];
  return makeTool({
    kind: "skill",
    name,
    description,
    sourcePath: filePath,
    hasInputSchema: true,
    inputSchema: { type: "skill" },
    rawText: text,
    capabilities
  });
}

function extractToolArray(json: unknown): JsonRecord[] {
  if (Array.isArray(json)) return json.filter(isRecord);
  if (!isRecord(json)) return [];
  if (Array.isArray(json["tools"])) return json["tools"].filter(isRecord);
  if (isRecord(json["server"]) && Array.isArray(json["server"]["tools"])) return json["server"]["tools"].filter(isRecord);
  return [];
}

function makeTool(input: {
  kind: DiscoveredTool["kind"];
  name: string;
  description: string;
  sourcePath: string;
  serverName?: string;
  hasInputSchema: boolean;
  inputSchema?: unknown;
  annotations?: Record<string, unknown>;
  rawText: string;
  capabilities: Capability[];
}): DiscoveredTool {
  const material = `${input.kind}:${input.sourcePath}:${input.name}:${input.description}`;
  const schemaText = input.inputSchema === undefined ? undefined : JSON.stringify(input.inputSchema);
  const base = {
    id: `${input.kind}:${sha256(material).slice(0, 12)}`,
    kind: input.kind,
    name: input.name,
    description: input.description,
    sourcePath: toPosixPath(relative(process.cwd(), input.sourcePath)),
    hasInputSchema: input.hasInputSchema,
    annotations: input.annotations ?? {},
    capabilities: [...new Set(input.capabilities)].sort(),
    rawText: input.rawText
  };
  return {
    ...base,
    ...(input.serverName === undefined ? {} : { serverName: input.serverName }),
    ...(schemaText === undefined ? {} : { inputSchemaHash: `sha256:${sha256(schemaText)}` })
  };
}

function inferCapabilities(text: string): Capability[] {
  const capabilities = new Set<Capability>();
  for (const [capability, pattern] of capabilityPatterns) {
    if (pattern.test(text)) capabilities.add(capability);
  }
  if (/\bread private\b/i.test(text)) {
    capabilities.add("secret-access");
    capabilities.add("git-read");
  }
  return [...capabilities];
}

function parseFrontmatter(text: string): { name?: string; description?: string; declaredCapabilities: string[] } {
  const result: { name?: string; description?: string; declaredCapabilities: string[] } = { declaredCapabilities: [] };
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (match?.[1] === undefined) return result;
  const lines = match[1].split(/\r?\n/);
  let inCapabilities = false;
  for (const line of lines) {
    const nameMatch = /^name:\s*(.+)\s*$/.exec(line);
    if (nameMatch?.[1] !== undefined) {
      result.name = stripQuotes(nameMatch[1]);
      inCapabilities = false;
      continue;
    }
    const descriptionMatch = /^description:\s*(.+)\s*$/.exec(line);
    if (descriptionMatch?.[1] !== undefined) {
      result.description = stripQuotes(descriptionMatch[1]);
      inCapabilities = false;
      continue;
    }
    if (/^declaredCapabilities:\s*$/.test(line)) {
      inCapabilities = true;
      continue;
    }
    const capabilityMatch = /^\s*-\s*(.+)\s*$/.exec(line);
    if (inCapabilities && capabilityMatch?.[1] !== undefined) {
      result.declaredCapabilities.push(stripQuotes(capabilityMatch[1]));
    }
  }
  return result;
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCapability(value: string): value is Capability {
  return capabilityPatterns.some(([capability]) => capability === value);
}
