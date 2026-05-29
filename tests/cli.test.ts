import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliEntry = join(process.cwd(), "src", "cli.ts");

describe("CLI", () => {
  it("runs demo and writes reports", async () => {
    const { stdout } = await runCli(["demo"]);

    expect(stdout).toContain("Cognicheck demo complete");
    expect(stdout).toContain("cognicheck-report.json");
  });

  it("runs demo from a clean folder without local examples", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "agent-cognicheck-clean-"));

    const { stdout } = await runCli(["demo"], cwd);

    expect(stdout).toContain("Cognicheck demo complete");
    expect(stdout).toContain("cognicheck-report.json");
  }, 15000);

  it("fails attack command when fail-on threshold is met", async () => {
    await expect(runCli(["attack", "examples", "--fail-on", "high"])).rejects.toMatchObject({
      code: 1
    });
  });
});

function runCli(args: string[], cwd = process.cwd()): Promise<{ stdout: string; stderr: string }> {
  return process.platform === "win32"
    ? execFileAsync("cmd", ["/c", "npx", "tsx", cliEntry, ...args], { cwd })
    : execFileAsync("npx", ["tsx", cliEntry, ...args], { cwd });
}
