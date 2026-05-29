import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("CLI", () => {
  it("runs demo and writes reports", async () => {
    const { stdout } = await runCli(["demo"]);

    expect(stdout).toContain("Cognicheck demo complete");
    expect(stdout).toContain("cognicheck-report.json");
  });

  it("fails attack command when fail-on threshold is met", async () => {
    await expect(runCli(["attack", "examples", "--fail-on", "high"])).rejects.toMatchObject({
      code: 1
    });
  });
});

function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return process.platform === "win32"
    ? execFileAsync("cmd", ["/c", "npx", "tsx", "src/cli.ts", ...args])
    : execFileAsync("npx", ["tsx", "src/cli.ts", ...args]);
}
