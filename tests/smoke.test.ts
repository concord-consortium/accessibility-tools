import { describe, expect, it } from "vitest";

describe("built entry points", () => {
  it("hooks entry point exports AccessibilityProvider", async () => {
    const hooks = await import("../dist/hooks/index.js");
    expect(hooks.AccessibilityProvider).toBeDefined();
  });

  it("debug entry point exports AccessibilityDebugSidebar", async () => {
    const debug = await import("../dist/debug/index.js");
    expect(debug.AccessibilityDebugSidebar).toBeDefined();
  });

  it("audit entry point exports runWcagAudit", async () => {
    const audit = await import("../dist/audit/index.js");
    expect(audit.runWcagAudit).toBeDefined();
    expect(typeof audit.runWcagAudit).toBe("function");
  });

  it("audit runWcagAudit returns expected shape", async () => {
    const { runWcagAudit } = await import("../dist/audit/index.js");
    const result = runWcagAudit();
    expect(result).toEqual({
      failures: [],
      warnings: [],
      passes: [],
    });
  });
});
