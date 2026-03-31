/**
 * WCAG Audit Report engine.
 *
 * Runs all check modules against a root element and produces a report
 * organized by WCAG success criterion. Used by the Audit Report panel,
 * the Overview panel's Audit Page/Audit Sidebar buttons, and the CLI.
 */

import { scanAriaValidation } from "./aria-validation";
import { scanColorContrast } from "./color-contrast";
import { scanDuplicateIds } from "./duplicate-ids";
import { scanFormControls } from "./form-labels";
import { scanHeadings } from "./headings";
import { scanImages } from "./images";
import { scanLandmarks } from "./landmarks";
import { scanLinksButtons } from "./links-buttons";
import { scanAnimations } from "./reduced-motion";
import { scanTouchTargets } from "./touch-targets";
import { type CheckIssue, describeIssueElement } from "./types";

export interface AuditCriterion {
  id: string;
  name: string;
  level: "A" | "AA" | "AAA";
  issues: CheckIssue[];
  passing: boolean;
}

export interface AuditReport {
  timestamp: number;
  url: string;
  rootDescription: string;
  criteria: AuditCriterion[];
  totalPassing: number;
  totalFailing: number;
  totalWarnings: number;
}

const WCAG_CRITERIA: Array<{
  id: string;
  name: string;
  level: "A" | "AA" | "AAA";
}> = [
  { id: "1.1.1", name: "Non-text Content", level: "A" },
  { id: "1.3.1", name: "Info and Relationships", level: "A" },
  { id: "1.4.3", name: "Contrast Minimum", level: "AA" },
  { id: "2.4.4", name: "Link Purpose (In Context)", level: "A" },
  { id: "2.5.8", name: "Target Size (Minimum)", level: "AA" },
  { id: "3.3.2", name: "Labels or Instructions", level: "A" },
  { id: "4.1.2", name: "Name, Role, Value", level: "A" },
  { id: "2.3.3", name: "Animation from Interactions", level: "AAA" },
];

/**
 * Run all accessibility checks against a root element and produce
 * a report organized by WCAG success criterion.
 */
export function runAudit(root: Element | Document = document): AuditReport {
  // Run all checks
  const allIssues: CheckIssue[] = [];

  const checks = [
    scanHeadings(root),
    scanLandmarks(root),
    scanDuplicateIds(root),
    scanFormControls(root),
    scanImages(root),
    scanLinksButtons(root),
    scanColorContrast(root),
    scanAriaValidation(root),
    scanTouchTargets(root),
    scanAnimations(),
  ];

  // Page-level structural checks don't apply when scoped to a subtree
  const isSubtree = !(root instanceof Document);
  const pageOnlyTypes = new Set(["missing-h1", "missing-main"]);

  for (const check of checks) {
    for (const issue of check.issues) {
      if (isSubtree && pageOnlyTypes.has(issue.type)) continue;
      allIssues.push(issue);
    }
  }

  // Group issues by WCAG criterion
  const issuesByCriterion = new Map<string, CheckIssue[]>();
  for (const issue of allIssues) {
    const wcag = issue.wcag || "other";
    if (!issuesByCriterion.has(wcag)) {
      issuesByCriterion.set(wcag, []);
    }
    issuesByCriterion.get(wcag)?.push(issue);
  }

  // Build criteria list
  const criteria: AuditCriterion[] = WCAG_CRITERIA.map((c) => {
    const issues = issuesByCriterion.get(c.id) || [];
    return {
      id: c.id,
      name: c.name,
      level: c.level,
      issues,
      passing: issues.filter((i) => i.severity === "error").length === 0,
    };
  });

  // Add any criteria from issues not in our predefined list
  for (const [wcag, issues] of issuesByCriterion) {
    if (!WCAG_CRITERIA.some((c) => c.id === wcag) && wcag !== "other") {
      criteria.push({
        id: wcag,
        name: wcag,
        level: "A",
        issues,
        passing: issues.filter((i) => i.severity === "error").length === 0,
      });
    }
  }

  // Sort: failing first, then by criterion ID
  criteria.sort((a, b) => {
    if (a.passing !== b.passing) return a.passing ? 1 : -1;
    return a.id.localeCompare(b.id);
  });

  const totalPassing = criteria.filter((c) => c.passing).length;
  const totalFailing = criteria.filter((c) => !c.passing).length;
  const totalWarnings = allIssues.filter(
    (i) => i.severity === "warning",
  ).length;

  const url = typeof window !== "undefined" ? window.location.href : "";
  const rootDescription =
    root instanceof Document ? "document" : describeIssueElement(root);

  return {
    timestamp: Date.now(),
    url,
    rootDescription,
    criteria,
    totalPassing,
    totalFailing,
    totalWarnings,
  };
}

/**
 * Generate a markdown audit report from audit results.
 */
export function generateAuditMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push("# WCAG Audit Report");
  lines.push("");
  if (report.url) {
    lines.push(`URL: ${report.url}`);
    lines.push("");
  }
  lines.push(
    `Generated: ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(report.timestamp))}`,
  );
  lines.push("");
  lines.push(`Scope: ${report.rootDescription}`);
  lines.push("");
  const verdict = report.totalFailing > 0 ? "FAIL" : "PASS";
  lines.push(
    `**Summary: ${verdict}. ${report.totalPassing} passing, ${report.totalFailing} failing${report.totalWarnings > 0 ? `, ${report.totalWarnings} warnings` : ""} across ${report.criteria.length} criteria**`,
  );
  lines.push("");

  const passing = report.criteria.filter(
    (c) => c.passing && c.issues.length === 0,
  );
  const withIssues = report.criteria.filter((c) => c.issues.length > 0);

  if (passing.length > 0) {
    lines.push(`## Passing (${passing.length} criteria)`);
    for (const c of passing) {
      lines.push(`- ${c.id} ${c.name} (Level ${c.level})`);
    }
    lines.push("");
  }

  const esc = (s: string) => s.replace(/\|/g, "\\|");
  const sortByElement = (a: CheckIssue, b: CheckIssue) => {
    const aDesc = a.element ? describeIssueElement(a.element) : "";
    const bDesc = b.element ? describeIssueElement(b.element) : "";
    return aDesc.localeCompare(bDesc);
  };

  function renderIssueTable(issues: CheckIssue[]) {
    const sorted = [...issues].sort(sortByElement);
    lines.push("| Element | Issue | Fix |");
    lines.push("|---|---|---|");
    for (const issue of sorted) {
      const elementDesc = issue.element
        ? describeIssueElement(issue.element)
        : "-";
      lines.push(
        `| ${esc(elementDesc)} | ${esc(issue.message)} | ${esc(issue.fix || "-")} |`,
      );
    }
  }

  for (const c of withIssues) {
    const errors = c.issues.filter((i) => i.severity === "error");
    const warnings = c.issues.filter((i) => i.severity === "warning");

    const parts: string[] = [];
    if (errors.length > 0) parts.push(`${errors.length} errors`);
    if (warnings.length > 0) parts.push(`${warnings.length} warnings`);
    lines.push(`## ${c.id} ${c.name} (Level ${c.level}) - ${parts.join(", ")}`);
    lines.push("");

    if (errors.length > 0) {
      lines.push("**Errors:**");
      lines.push("");
      renderIssueTable(errors);
      lines.push("");
    }

    if (warnings.length > 0) {
      lines.push("**Warnings:**");
      lines.push("");
      renderIssueTable(warnings);
      lines.push("");
    }
  }

  return lines.join("\n");
}
