import { describe, expect, it } from "vitest";
import { scanUnicode } from "../src/core/unicode.js";

describe("unicode scanner", () => {
  it("flags invisible and bidirectional control characters", async () => {
    const result = await scanUnicode("examples/mcp/hidden-unicode-tools.json");

    expect(result.summary.findings).toBeGreaterThan(0);
    expect(result.findings.some((finding) => finding.category === "unicode.bidi_control")).toBe(true);
  });
});
