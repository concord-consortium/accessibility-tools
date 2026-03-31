/**
 * WCAG Audit Report Generator panel.
 *
 * Runs all accessibility checks against a scoped root element and
 * produces a report organized by WCAG success criterion. Results
 * can be copied to clipboard as markdown.
 */

import { useState } from "react";
import type { AuditReport } from "../checks/audit";
import { generateAuditMarkdown, runAudit } from "../checks/audit";
import {
  pluralize,
  scrollToAndHighlight,
  showToast,
  withSelfExclusionDisabled,
} from "../utils";

interface AuditReportProps {
  auditRoot?: Element | Document;
}

export function AuditReportPanel({ auditRoot }: AuditReportProps) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [running, setRunning] = useState(false);
  const [, forceUpdate] = useState(0);

  const runPageAudit = () => {
    setRunning(true);
    // Defer to let the UI update with "running" state
    requestAnimationFrame(() => {
      const result = runAudit(auditRoot ?? document);
      setReport(result);
      setRunning(false);
      showToast(
        `Audit complete: ${pluralize(result.totalFailing, "failing criterion", "failing criteria")}, ${pluralize(result.totalPassing, "passing")}`,
      );
    });
  };

  const exportMarkdown = () => {
    if (!report) return;
    const md = generateAuditMarkdown(report);
    navigator.clipboard.writeText(md).then(
      () => showToast("Audit report copied to clipboard"),
      () => showToast("Failed to copy - check clipboard permissions"),
    );
  };

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">WCAG Audit Report</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={runPageAudit}
          className="a11y-panel-btn"
          disabled={running}
        >
          {running ? "Running..." : "Run Audit"}
        </button>
        <button
          type="button"
          onClick={exportMarkdown}
          className="a11y-panel-btn"
          disabled={!report}
          aria-label="Export audit report as markdown to clipboard"
        >
          Export
        </button>
      </div>

      {!report && !running && (
        <div className="a11y-focus-empty">
          Click "Run Audit" to run all accessibility checks against the page and
          generate a WCAG compliance report organized by success criterion.
        </div>
      )}

      {running && <div className="a11y-focus-empty">Running all checks...</div>}

      {report && !running && (
        <div className="a11y-audit-results">
          {/* Summary */}
          <div className="a11y-audit-summary">
            <span className="a11y-audit-summary-scope">
              Scope: {report.rootDescription}
            </span>
            <div className="a11y-audit-summary-counts">
              <span className="a11y-audit-pass-count">
                {report.totalPassing} passing
              </span>
              <span className="a11y-audit-fail-count">
                {report.totalFailing} failing
              </span>
              {report.totalWarnings > 0 && (
                <span className="a11y-audit-warn-count">
                  {pluralize(report.totalWarnings, "warning")}
                </span>
              )}
            </div>
          </div>

          {/* Criteria list */}
          <div className="a11y-panel-list">
            {report.criteria.map((criterion) => (
              <CriterionCard
                key={criterion.id}
                criterion={criterion}
                onForceUpdate={() => forceUpdate((n) => n + 1)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CriterionCard({
  criterion,
  onForceUpdate,
}: {
  criterion: AuditReport["criteria"][0];
  onForceUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(!criterion.passing);
  const errorCount = criterion.issues.filter(
    (i) => i.severity === "error",
  ).length;
  const warningCount = criterion.issues.filter(
    (i) => i.severity === "warning",
  ).length;

  return (
    <div
      className={`a11y-audit-criterion ${criterion.passing ? "a11y-audit-criterion-pass" : "a11y-audit-criterion-fail"}`}
    >
      <button
        type="button"
        className="a11y-audit-criterion-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span
          className={`a11y-audit-criterion-status ${criterion.passing ? "a11y-audit-status-pass" : "a11y-audit-status-fail"}`}
        >
          {criterion.passing ? "PASS" : "FAIL"}
        </span>
        <span className="a11y-audit-criterion-id">{criterion.id}</span>
        <span className="a11y-audit-criterion-name">{criterion.name}</span>
        <span className="a11y-audit-criterion-level">{criterion.level}</span>
        {!criterion.passing && (
          <span className="a11y-audit-criterion-count">
            {errorCount > 0 && pluralize(errorCount, "error")}
            {errorCount > 0 && warningCount > 0 && ", "}
            {warningCount > 0 && pluralize(warningCount, "warning")}
          </span>
        )}
      </button>

      {expanded && criterion.issues.length > 0 && (
        <div className="a11y-audit-issues">
          {criterion.issues.map((issue, i) => (
            <button
              type="button"
              key={`issue-${criterion.id}-${i}`}
              className={`a11y-panel-row a11y-panel-row-clickable ${issue.severity === "error" ? "a11y-panel-row-error" : ""}`}
              title={`${issue.message}\n${issue.fix || ""}`.trim()}
              aria-label={`${issue.severity}: ${issue.message}`}
              onClick={() => {
                if (issue.element && document.contains(issue.element)) {
                  scrollToAndHighlight(issue.element);
                  onForceUpdate();
                }
              }}
            >
              <span className="a11y-panel-text">{issue.message}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
