import { describe, expect, it } from "vitest";
import { buildToolBom } from "../src/core/discover.js";

describe("ToolBOM discovery", () => {
  it("discovers MCP descriptors, MCP configs, and skills", async () => {
    const bom = await buildToolBom("examples");

    expect(bom.summary.tools).toBeGreaterThanOrEqual(6);
    expect(bom.tools.some((tool) => tool.name === "repo_reader" && tool.capabilities.includes("git-read"))).toBe(true);
    expect(bom.tools.some((tool) => tool.name === "github-wide" && tool.capabilities.includes("secret-access"))).toBe(true);
    expect(bom.tools.some((tool) => tool.name === "poisoned-publisher" && tool.kind === "skill")).toBe(true);
  });
});
