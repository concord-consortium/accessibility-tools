/**
 * Scoring system for accessibility checks.
 *
 * Each check produces a 0-100 score. The top-level score is a weighted
 * aggregate. Weights are based on severity (error > warning) and WCAG
 * level (A > AA > AAA).
 *
 * Used by the Overview panel and the CLI audit command.
 */

import type { CheckIssue, CheckResult } from "./types";

/** Weight multipliers for issue severity */
const SEVERITY_WEIGHTS = {
  error: 10,
  warning: 3,
};

/** Weight multipliers for WCAG conformance level */
const WCAG_LEVEL_WEIGHTS: Record<string, number> = {
  A: 3,
  AA: 2,
  AAA: 1,
};

/**
 * Calculate a 0-100 score for a single check result.
 *
 * Formula: start at 100, deduct points per issue based on severity
 * and WCAG level, relative to the number of items checked.
 * More items = each issue has less impact (a page with 100 headings
 * and 1 issue scores higher than a page with 2 headings and 1 issue).
 */
export function scoreCheck<T>(result: CheckResult<T>): {
  score: number;
  explanation: ScoreExplanation;
} {
  if (result.items.length === 0 && result.issues.length === 0) {
    return {
      score: 100,
      explanation: {
        totalItems: 0,
        totalDeductions: 0,
        normalizedDeduction: 0,
        issueBreakdown: [],
      },
    };
  }

  const totalItems = Math.max(result.items.length, 1);
  let deductions = 0;
  const issueBreakdown: ScoreExplanation["issueBreakdown"] = [];

  for (const issue of result.issues) {
    const severityWeight = SEVERITY_WEIGHTS[issue.severity] || 5;
    const wcagLevel = issue.wcagLevel || "AA";
    const levelWeight = WCAG_LEVEL_WEIGHTS[wcagLevel] || 2;
    const weight = severityWeight * levelWeight;
    deductions += weight;
    issueBreakdown.push({
      message: issue.message,
      severity: issue.severity,
      wcagLevel,
      weight,
    });
  }

  const normalizedDeduction = (deductions / totalItems) * 10;
  const score = Math.max(0, Math.round(100 - normalizedDeduction));
  return {
    score,
    explanation: {
      totalItems,
      totalDeductions: deductions,
      normalizedDeduction: Math.round(normalizedDeduction * 10) / 10,
      issueBreakdown,
    },
  };
}

/**
 * Get the color class for a score value.
 */
export function scoreColor(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

export interface ScoreExplanation {
  totalItems: number;
  totalDeductions: number;
  normalizedDeduction: number;
  issueBreakdown: Array<{
    message: string;
    severity: string;
    wcagLevel: string;
    weight: number;
  }>;
}

export interface CheckScore {
  id: string;
  label: string;
  score: number;
  color: "green" | "yellow" | "red";
  errorCount: number;
  warningCount: number;
  issues: CheckIssue[];
  explanation: ScoreExplanation;
}

export interface OverallScore {
  score: number;
  color: "green" | "yellow" | "red";
  checks: CheckScore[];
}

/**
 * Calculate scores for all checks and an aggregate overall score.
 */
export function calculateOverallScore(
  checks: Array<{
    id: string;
    label: string;
    result: CheckResult<unknown>;
  }>,
): OverallScore {
  const checkScores: CheckScore[] = checks.map(({ id, label, result }) => {
    const { score, explanation } = scoreCheck(result);
    return {
      id,
      label,
      score,
      color: scoreColor(score),
      errorCount: result.issues.filter((i) => i.severity === "error").length,
      warningCount: result.issues.filter((i) => i.severity === "warning")
        .length,
      issues: result.issues,
      explanation,
    };
  });

  // Overall score: simple average of individual check scores
  const totalScore =
    checkScores.length > 0
      ? Math.round(
          checkScores.reduce((sum, c) => sum + c.score, 0) / checkScores.length,
        )
      : 100;

  return {
    score: totalScore,
    color: scoreColor(totalScore),
    checks: checkScores,
  };
}

/**
 * Generate a markdown audit report from scoring results.
 * Used by the Overview panel's Export button and the CLI audit command.
 */
export function generateMarkdownReport(scores: OverallScore): string {
  const lines: string[] = [];
  lines.push("## Accessibility Audit Report");
  lines.push("");
  if (typeof window !== "undefined") {
    lines.push(`URL: ${window.location.href}`);
    lines.push("");
  }
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`**Overall Score: ${scores.score}/100**`);
  lines.push("");

  for (const check of scores.checks) {
    lines.push(`### ${check.label} - ${check.score}/100`);
    if (check.issues.length === 0) {
      lines.push("No issues found.");
    } else {
      lines.push("");
      lines.push("| Issue | Severity | WCAG | Fix |");
      lines.push("|---|---|---|---|");
      const esc = (s: string) => s.replace(/\|/g, "\\|");
      for (const issue of check.issues) {
        const wcag = issue.wcag
          ? `${issue.wcag}${issue.wcagLevel ? ` (${issue.wcagLevel})` : ""}`
          : "-";
        lines.push(
          `| ${esc(issue.message)} | ${issue.severity} | ${wcag} | ${esc(issue.fix || "-")} |`,
        );
      }
    }
    lines.push("");
  }

  lines.push(
    `**Summary: ${scores.checks.length} checks, ${scores.checks.filter((c) => c.errorCount > 0).length} with errors**`,
  );
  return lines.join("\n");
}
