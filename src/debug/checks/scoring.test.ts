import { describe, expect, it } from "vitest";
import {
  calculateOverallScore,
  generateMarkdownReport,
  scoreCheck,
  scoreColor,
} from "./scoring";
import type { CheckResult } from "./types";

describe("scoreCheck", () => {
  it("returns 100 for no items and no issues", () => {
    const result: CheckResult<unknown> = { items: [], issues: [] };
    expect(scoreCheck(result).score).toBe(100);
  });

  it("returns 100 for items with no issues", () => {
    const result: CheckResult<unknown> = {
      items: [{}, {}, {}],
      issues: [],
    };
    expect(scoreCheck(result).score).toBe(100);
  });

  it("deducts more for errors than warnings", () => {
    const withError: CheckResult<unknown> = {
      items: [{}],
      issues: [{ type: "test", severity: "error", message: "err" }],
    };
    const withWarning: CheckResult<unknown> = {
      items: [{}],
      issues: [{ type: "test", severity: "warning", message: "warn" }],
    };
    expect(scoreCheck(withError).score).toBeLessThan(
      scoreCheck(withWarning).score,
    );
  });

  it("deducts more for WCAG A than AAA issues", () => {
    const levelA: CheckResult<unknown> = {
      items: [{}, {}, {}, {}, {}],
      issues: [
        {
          type: "test",
          severity: "error",
          wcagLevel: "A",
          message: "level A",
        },
      ],
    };
    const levelAAA: CheckResult<unknown> = {
      items: [{}, {}, {}, {}, {}],
      issues: [
        {
          type: "test",
          severity: "error",
          wcagLevel: "AAA",
          message: "level AAA",
        },
      ],
    };
    expect(scoreCheck(levelA).score).toBeLessThan(scoreCheck(levelAAA).score);
  });

  it("never returns below 0", () => {
    const result: CheckResult<unknown> = {
      items: [{}],
      issues: Array.from({ length: 50 }, () => ({
        type: "test",
        severity: "error" as const,
        wcagLevel: "A" as const,
        message: "bad",
      })),
    };
    expect(scoreCheck(result).score).toBe(0);
  });

  it("more items dilutes the impact of each issue", () => {
    const fewItems: CheckResult<unknown> = {
      items: [{}, {}],
      issues: [{ type: "test", severity: "error", message: "err" }],
    };
    const manyItems: CheckResult<unknown> = {
      items: Array.from({ length: 20 }, () => ({})),
      issues: [{ type: "test", severity: "error", message: "err" }],
    };
    expect(scoreCheck(manyItems).score).toBeGreaterThan(
      scoreCheck(fewItems).score,
    );
  });

  it("returns explanation with issue breakdown", () => {
    const result: CheckResult<unknown> = {
      items: [{}, {}, {}],
      issues: [
        { type: "a", severity: "error", wcagLevel: "A", message: "err A" },
        { type: "b", severity: "warning", message: "warn AA" },
      ],
    };
    const { explanation } = scoreCheck(result);
    expect(explanation.totalItems).toBe(3);
    expect(explanation.issueBreakdown).toHaveLength(2);
    expect(explanation.issueBreakdown[0].weight).toBe(30); // error(10) * A(3)
    expect(explanation.issueBreakdown[1].weight).toBe(6); // warning(3) * AA(2)
    expect(explanation.totalDeductions).toBe(36);
  });
});

describe("scoreColor", () => {
  it("returns green for 80-100", () => {
    expect(scoreColor(100)).toBe("green");
    expect(scoreColor(80)).toBe("green");
  });

  it("returns yellow for 50-79", () => {
    expect(scoreColor(79)).toBe("yellow");
    expect(scoreColor(50)).toBe("yellow");
  });

  it("returns red for 0-49", () => {
    expect(scoreColor(49)).toBe("red");
    expect(scoreColor(0)).toBe("red");
  });
});

describe("calculateOverallScore", () => {
  it("returns 100 when all checks pass", () => {
    const result = calculateOverallScore([
      { id: "a", label: "A", result: { items: [{}], issues: [] } },
      { id: "b", label: "B", result: { items: [{}], issues: [] } },
    ]);
    expect(result.score).toBe(100);
    expect(result.color).toBe("green");
    expect(result.checks).toHaveLength(2);
  });

  it("averages individual check scores", () => {
    const result = calculateOverallScore([
      { id: "good", label: "Good", result: { items: [{}], issues: [] } },
      {
        id: "bad",
        label: "Bad",
        result: {
          items: [{}],
          issues: [{ type: "t", severity: "error", message: "err" }],
        },
      },
    ]);
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns 100 for empty checks array", () => {
    const result = calculateOverallScore([]);
    expect(result.score).toBe(100);
  });

  it("tracks error and warning counts per check", () => {
    const result = calculateOverallScore([
      {
        id: "test",
        label: "Test",
        result: {
          items: [{}, {}, {}],
          issues: [
            { type: "a", severity: "error", message: "err1" },
            { type: "b", severity: "error", message: "err2" },
            { type: "c", severity: "warning", message: "warn1" },
          ],
        },
      },
    ]);
    expect(result.checks[0].errorCount).toBe(2);
    expect(result.checks[0].warningCount).toBe(1);
  });

  it("includes explanation on each check", () => {
    const result = calculateOverallScore([
      {
        id: "test",
        label: "Test",
        result: {
          items: [{}],
          issues: [{ type: "a", severity: "error", message: "err" }],
        },
      },
    ]);
    expect(result.checks[0].explanation).toBeDefined();
    expect(result.checks[0].explanation.totalItems).toBe(1);
  });
});

describe("generateMarkdownReport", () => {
  it("includes overall score", () => {
    const scores = calculateOverallScore([
      { id: "a", label: "Check A", result: { items: [{}], issues: [] } },
    ]);
    const md = generateMarkdownReport(scores);
    expect(md).toContain("# Accessibility Audit Report");
    expect(md).toContain(`**Overall Score: ${scores.score}/100**`);
  });

  it("includes per-check sections", () => {
    const scores = calculateOverallScore([
      { id: "a", label: "Check A", result: { items: [{}], issues: [] } },
      { id: "b", label: "Check B", result: { items: [{}], issues: [] } },
    ]);
    const md = generateMarkdownReport(scores);
    expect(md).toContain("## Check A");
    expect(md).toContain("## Check B");
    expect(md).toContain("No issues found.");
  });

  it("includes issue table for checks with issues", () => {
    const scores = calculateOverallScore([
      {
        id: "a",
        label: "Check A",
        result: {
          items: [{}],
          issues: [
            {
              type: "t",
              severity: "error",
              wcag: "1.3.1",
              message: "Missing heading",
              fix: "Add an h1",
            },
          ],
        },
      },
    ]);
    const md = generateMarkdownReport(scores);
    expect(md).toContain("| Issue | Severity | WCAG | Fix |");
    expect(md).toContain("Missing heading");
    expect(md).toContain("error");
    expect(md).toContain("1.3.1");
    expect(md).toContain("Add an h1");
  });

  it("includes URL from window.location", () => {
    const scores = calculateOverallScore([
      { id: "a", label: "A", result: { items: [{}], issues: [] } },
    ]);
    const md = generateMarkdownReport(scores);
    expect(md).toContain("URL:");
  });

  it("has blank lines between header elements", () => {
    const scores = calculateOverallScore([
      { id: "a", label: "A", result: { items: [{}], issues: [] } },
    ]);
    const md = generateMarkdownReport(scores);
    // Header, blank, URL, blank, Generated, blank, Score
    expect(md).toMatch(/# Accessibility Audit Report\n\n/);
    expect(md).toMatch(/URL:.*\n\n/);
    expect(md).toMatch(/Generated:.*\n\n/);
  });

  it("includes summary line", () => {
    const scores = calculateOverallScore([
      { id: "a", label: "A", result: { items: [{}], issues: [] } },
      {
        id: "b",
        label: "B",
        result: {
          items: [{}],
          issues: [{ type: "t", severity: "error", message: "err" }],
        },
      },
    ]);
    const md = generateMarkdownReport(scores);
    expect(md).toContain("**Summary: 2 checks, 1 with errors**");
  });
});
