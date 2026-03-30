import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("CLI stub", () => {
  it("prints usage and exits 0", () => {
    const output = execSync("node dist/cli/cc-a11y-tools.js", {
      encoding: "utf-8",
    });
    expect(output).toContain("cc-a11y-tools");
    expect(output).toContain("audit");
    expect(output).toContain("report");
    expect(output).toContain("Not yet implemented");
  });
});
