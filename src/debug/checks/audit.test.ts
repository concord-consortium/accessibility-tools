import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAuditMarkdown, runAudit } from "./audit";

beforeEach(() => {
  // jsdom doesn't have matchMedia
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("runAudit", () => {
  it("returns a report with criteria", () => {
    const report = runAudit();
    expect(report).toHaveProperty("criteria");
    expect(report).toHaveProperty("totalPassing");
    expect(report).toHaveProperty("totalFailing");
    expect(report).toHaveProperty("timestamp");
    expect(report.criteria.length).toBeGreaterThan(0);
  });

  it("reports passing criteria when no issues", () => {
    document.body.innerHTML = "<main><h1>Title</h1><p>Content</p></main>";
    const report = runAudit();
    expect(report.totalPassing).toBeGreaterThan(0);
  });

  it("detects image issues", () => {
    document.body.innerHTML = '<img src="test.jpg">';
    const report = runAudit();
    const criterion = report.criteria.find((c) => c.id === "1.1.1");
    expect(criterion).toBeDefined();
    expect(criterion?.passing).toBe(false);
  });

  it("detects form label issues", () => {
    document.body.innerHTML = '<input type="text">';
    const report = runAudit();
    const criterion = report.criteria.find((c) => c.id === "3.3.2");
    expect(criterion).toBeDefined();
    expect(criterion?.passing).toBe(false);
  });

  it("detects ARIA validation issues", () => {
    document.body.innerHTML = '<div role="banana">Bad role</div>';
    const report = runAudit();
    const criterion = report.criteria.find((c) => c.id === "4.1.2");
    expect(criterion).toBeDefined();
    expect(criterion?.passing).toBe(false);
  });

  it("sorts failing criteria before passing", () => {
    document.body.innerHTML = '<img src="test.jpg">';
    const report = runAudit();
    const firstFailing = report.criteria.findIndex((c) => !c.passing);
    const firstPassing = report.criteria.findIndex((c) => c.passing);
    if (firstFailing >= 0 && firstPassing >= 0) {
      expect(firstFailing).toBeLessThan(firstPassing);
    }
  });

  it("sets rootDescription for document", () => {
    const report = runAudit(document);
    expect(report.rootDescription).toBe("document");
  });

  it("sets rootDescription for element", () => {
    const div = document.createElement("div");
    div.id = "app";
    document.body.appendChild(div);
    const report = runAudit(div);
    expect(report.rootDescription).toBe("<div#app>");
  });

  it("includes timestamp", () => {
    const before = Date.now();
    const report = runAudit();
    expect(report.timestamp).toBeGreaterThanOrEqual(before);
  });
});

describe("generateAuditMarkdown", () => {
  it("generates markdown with header", () => {
    const report = runAudit();
    const md = generateAuditMarkdown(report);
    expect(md).toContain("# WCAG Audit Report");
    expect(md).toContain("Generated:");
  });

  it("includes passing criteria section", () => {
    const report = runAudit();
    const md = generateAuditMarkdown(report);
    if (report.totalPassing > 0) {
      expect(md).toContain("## Passing");
    }
  });

  it("includes issue tables for failing criteria", () => {
    document.body.innerHTML = '<img src="test.jpg">';
    const report = runAudit();
    const md = generateAuditMarkdown(report);
    expect(md).toContain("| Element | Issue | Fix |");
  });

  it("includes summary line", () => {
    const report = runAudit();
    const md = generateAuditMarkdown(report);
    expect(md).toContain("**Summary:");
  });

  it("includes scope", () => {
    const report = runAudit();
    const md = generateAuditMarkdown(report);
    expect(md).toContain("Scope: document");
  });
});
