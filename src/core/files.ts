import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const ignoredDirs = new Set([".git", "node_modules", "dist", "coverage", ".cognicheck"]);

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readText(path)) as unknown;
}

export async function listFiles(root: string): Promise<string[]> {
  const resolved = resolve(root);
  const info = await stat(resolved);
  if (info.isFile()) return [resolved];

  const results: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          await walk(join(dir, entry.name));
        }
      } else if (entry.isFile()) {
        results.push(join(dir, entry.name));
      }
    }
  }
  await walk(resolved);
  return results.sort();
}

export async function safeReadText(path: string, maxBytes = 1_000_000): Promise<string | undefined> {
  const info = await stat(path);
  if (info.size > maxBytes) return undefined;
  return readText(path);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}
