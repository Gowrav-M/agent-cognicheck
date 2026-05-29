import { listFiles, safeReadText, sha256, toPosixPath } from "./files.js";
import { unicodeScanResultSchema, type CognitiveFinding, type UnicodeScanResult } from "./schemas.js";

interface ScanUnicodeOptions {
  generatedAt?: string;
}

const bidiControlPattern = /[\u202A-\u202E\u2066-\u2069]/gu;
const invisiblePattern = /[\u200B-\u200F\u2060-\u2064\uFEFF]/gu;

export async function scanUnicode(inputPath: string, options: ScanUnicodeOptions = {}): Promise<UnicodeScanResult> {
  const files = await listFiles(inputPath);
  const findings: CognitiveFinding[] = [];
  let scanned = 0;

  for (const filePath of files) {
    const text = await safeReadText(filePath);
    if (text === undefined) continue;
    scanned += 1;
    findings.push(...findUnicodeFindings(filePath, text));
  }

  return unicodeScanResultSchema.parse({
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    summary: {
      files: scanned,
      findings: findings.length
    },
    findings
  });
}

export function findUnicodeFindings(filePath: string, text: string): CognitiveFinding[] {
  const findings: CognitiveFinding[] = [];
  const bidiMatches = [...text.matchAll(bidiControlPattern)];
  const invisibleMatches = [...text.matchAll(invisiblePattern)];

  if (bidiMatches.length > 0) {
    findings.push(createUnicodeFinding("unicode.bidi_control", "critical", "Bidirectional control characters detected", filePath, bidiMatches));
  }
  if (invisibleMatches.length > 0) {
    findings.push(createUnicodeFinding("unicode.invisible_control", "high", "Invisible Unicode control characters detected", filePath, invisibleMatches));
  }
  return findings;
}

function createUnicodeFinding(category: string, severity: "high" | "critical", title: string, filePath: string, matches: RegExpMatchArray[]): CognitiveFinding {
  const positions = matches.slice(0, 5).map((match) => `offset ${match.index ?? 0}`);
  return {
    id: `${category}:${sha256(`${filePath}:${positions.join(",")}`).slice(0, 12)}`,
    severity,
    category,
    title,
    description: "Hidden Unicode control characters can make tool descriptions or skill instructions appear different to humans and models.",
    target: toPosixPath(filePath),
    evidence: positions,
    recommendation: "Remove hidden Unicode controls or replace them with visible escaped text in reviewed fixtures."
  };
}
