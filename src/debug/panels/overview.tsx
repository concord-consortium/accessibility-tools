import { useCallback, useEffect, useState } from "react";
import { scanAriaValidation } from "../checks/aria-validation";
import { generateAuditMarkdown, runAudit } from "../checks/audit";
import { scanColorContrast } from "../checks/color-contrast";
import { scanDuplicateIds } from "../checks/duplicate-ids";
import { scanFormControls } from "../checks/form-labels";
import { scanHeadings } from "../checks/headings";
import { scanImages } from "../checks/images";
import { scanLandmarks } from "../checks/landmarks";
import { scanLinksButtons } from "../checks/links-buttons";
import { scanAnimations } from "../checks/reduced-motion";
import type { CheckScore } from "../checks/scoring";
import {
  type OverallScore,
  calculateOverallScore,
  generateMarkdownReport,
} from "../checks/scoring";
import { scanTouchTargets } from "../checks/touch-targets";
import type { CheckIssue } from "../checks/types";
import { categories } from "../sidebar-data";
import { pluralize, showToast, withSelfExclusionDisabled } from "../utils";

interface OverviewPanelProps {
  onNavigateToPanel?: (panelId: string) => void;
}

const CHECK_DEFINITIONS = [
  { id: "headings", label: "Heading Hierarchy", scan: scanHeadings },
  { id: "form-labels", label: "Form Label Checker", scan: scanFormControls },
  { id: "contrast", label: "Color Contrast", scan: scanColorContrast },
  { id: "images", label: "Image Audit", scan: scanImages },
  { id: "links-buttons", label: "Link & Button Audit", scan: scanLinksButtons },
  { id: "aria-validation", label: "ARIA Validation", scan: scanAriaValidation },
  { id: "landmarks", label: "Landmark Summary", scan: scanLandmarks },
  {
    id: "duplicate-ids",
    label: "Duplicate ID Detector",
    scan: scanDuplicateIds,
  },
  { id: "touch-targets", label: "Touch Target Size", scan: scanTouchTargets },
  { id: "reduced-motion", label: "Reduced Motion", scan: scanAnimations },
];

function runAllChecks(): OverallScore {
  const checks = CHECK_DEFINITIONS.map(({ id, label, scan }) => ({
    id,
    label,
    result: scan(),
  }));
  return calculateOverallScore(checks);
}

/** Look up the icon component for a panel by its check ID. */
function getPanelIcon(checkId: string) {
  for (const cat of categories) {
    const panel = cat.panels.find((p) => p.id === checkId);
    if (panel) return panel.icon;
  }
  return null;
}

export function OverviewPanel({ onNavigateToPanel }: OverviewPanelProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<OverallScore>({
    score: 100,
    color: "green",
    checks: [],
  });

  const rescan = useCallback((notify: boolean) => {
    const result = runAllChecks();
    setScores(result);
    if (notify) {
      const errors = result.checks.reduce((n, c) => n + c.errorCount, 0);
      const warnings = result.checks.reduce((n, c) => n + c.warningCount, 0);
      showToast(
        errors + warnings > 0
          ? `Rescan complete: ${pluralize(errors, "error")}, ${pluralize(warnings, "warning")}`
          : "Rescan complete: no issues found",
      );
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rescan is stable
  useEffect(() => {
    rescan(false);
  }, []);

  return (
    <div className="a11y-panel-content a11y-overview-container">
      <h3 className="a11y-panel-title">Overview</h3>

      {/* Overall score */}
      <div className="a11y-overview-score">
        <span
          className={`a11y-overview-score-value a11y-score-${scores.color}`}
        >
          {scores.score}
        </span>
        <span className="a11y-overview-score-label">Accessibility Score</span>
      </div>

      {/* Actions */}
      <div className="a11y-overview-audit-buttons">
        <button
          type="button"
          onClick={() => rescan(true)}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <button
          type="button"
          className="a11y-panel-btn"
          onClick={() => {
            const md = generateMarkdownReport(scores);
            navigator.clipboard.writeText(md).then(
              () => showToast("Report copied to clipboard"),
              () => showToast("Failed to copy - check clipboard permissions"),
            );
          }}
          aria-label="Export audit report as markdown to clipboard"
        >
          Export
        </button>
      </div>

      {/* Check cards - grows to fill space */}
      <div className="a11y-overview-checks">
        {scores.checks.map((check) => (
          <CheckCard
            key={check.id}
            check={check}
            expanded={expandedCards.has(check.id)}
            onToggle={() =>
              setExpandedCards((prev) => {
                const next = new Set(prev);
                if (next.has(check.id)) {
                  next.delete(check.id);
                } else {
                  next.add(check.id);
                }
                return next;
              })
            }
            onNavigate={() => onNavigateToPanel?.(check.id)}
          />
        ))}
      </div>

      {/* Audit buttons pushed to bottom via flex */}
      <div className="a11y-overview-audit-buttons">
        <button
          type="button"
          className="a11y-panel-btn"
          aria-label="Run WCAG audit on entire page"
          onClick={() => {
            showToast("Running page audit...");
            requestAnimationFrame(() => {
              const report = runAudit(document);
              const md = generateAuditMarkdown(report);
              navigator.clipboard.writeText(md).then(
                () =>
                  showToast(
                    `Audit complete: ${pluralize(report.totalFailing, "failing criterion", "failing criteria")} - copied to clipboard`,
                  ),
                () => showToast("Failed to copy - check clipboard permissions"),
              );
            });
          }}
        >
          Audit Page
        </button>
        <button
          type="button"
          className="a11y-panel-btn"
          aria-label="Run WCAG audit on the sidebar itself"
          onClick={() => {
            showToast("Running sidebar audit...");
            requestAnimationFrame(() => {
              const report = withSelfExclusionDisabled(() => {
                const sidebar = document.querySelector(".a11y-debug-sidebar");
                return sidebar ? runAudit(sidebar) : runAudit(document);
              });
              const md = generateAuditMarkdown(report);
              navigator.clipboard.writeText(md).then(
                () =>
                  showToast(
                    `Sidebar audit: ${pluralize(report.totalFailing, "failing criterion", "failing criteria")} - copied to clipboard`,
                  ),
                () => showToast("Failed to copy - check clipboard permissions"),
              );
            });
          }}
        >
          Audit Sidebar
        </button>
      </div>
    </div>
  );
}

function CheckCard({
  check,
  expanded,
  onToggle,
  onNavigate,
}: {
  check: CheckScore;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const Icon = getPanelIcon(check.id);
  const errors = check.issues.filter((i) => i.severity === "error");
  const warnings = check.issues.filter((i) => i.severity === "warning");
  const { explanation } = check;

  return (
    <div
      className={`a11y-overview-check-card ${check.errorCount > 0 ? "a11y-overview-check-error" : ""}`}
    >
      <div className="a11y-overview-check-header">
        <button
          type="button"
          className="a11y-overview-check-toggle"
          aria-expanded={expanded}
          aria-label={`${check.label}: score ${check.score}, ${pluralize(check.errorCount, "error")}, ${pluralize(check.warningCount, "warning")}`}
          onClick={onToggle}
        >
          <span className="a11y-overview-check-name">{check.label}</span>
          <div className="a11y-overview-check-summary">
            {check.errorCount > 0 && (
              <span className="a11y-overview-check-errors">
                {pluralize(check.errorCount, "error")}
              </span>
            )}
            {check.warningCount > 0 && (
              <span className="a11y-overview-check-warnings">
                {pluralize(check.warningCount, "warning")}
              </span>
            )}
            {check.errorCount === 0 && check.warningCount === 0 && (
              <span className="a11y-overview-check-pass">All clear</span>
            )}
          </div>
        </button>
        <div className="a11y-overview-check-right">
          <span
            className={`a11y-overview-check-score a11y-score-${check.color}`}
          >
            {check.score}
          </span>
          {Icon && (
            <button
              type="button"
              className="a11y-overview-open-panel-btn"
              aria-label={`Open ${check.label} panel`}
              title={`Open ${check.label} panel`}
              onClick={onNavigate}
            >
              <Icon className="a11y-icon" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <button
          type="button"
          className="a11y-overview-check-expanded"
          aria-label={`Open ${check.label} panel`}
          title={`Open ${check.label} panel`}
          onClick={onNavigate}
        >
          {/* Issues list */}
          {(errors.length > 0 || warnings.length > 0) && (
            <IssueList errors={errors} warnings={warnings} />
          )}

          {/* Score explanation */}
          <div className="a11y-overview-explain">
            <div className="a11y-overview-explain-detail">
              <strong>Score: {check.score}</strong> = 100 - (
              {explanation.totalDeductions} deductions /{" "}
              {explanation.totalItems} items) x 10 = 100 -{" "}
              {explanation.normalizedDeduction}
            </div>
            {explanation.issueBreakdown.length > 0 && (
              <div className="a11y-overview-explain-issues">
                {explanation.issueBreakdown.map((ib, i) => (
                  <div key={`ib-${i}`} className="a11y-overview-explain-issue">
                    {ib.severity}({ib.severity === "error" ? 10 : 3}) x{" "}
                    {ib.wcagLevel}(
                    {ib.wcagLevel === "A" ? 3 : ib.wcagLevel === "AA" ? 2 : 1})
                    = {ib.weight}: {ib.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
}

function IssueList({
  errors,
  warnings,
}: {
  errors: CheckIssue[];
  warnings: CheckIssue[];
}) {
  return (
    <div className="a11y-overview-issue-list">
      {errors.map((issue, i) => (
        <div
          key={`err-${i}`}
          className="a11y-overview-issue a11y-overview-issue-error"
        >
          <span className="a11y-overview-issue-badge">error</span>
          <span className="a11y-overview-issue-msg">{issue.message}</span>
        </div>
      ))}
      {warnings.map((issue, i) => (
        <div
          key={`warn-${i}`}
          className="a11y-overview-issue a11y-overview-issue-warning"
        >
          <span className="a11y-overview-issue-badge">warning</span>
          <span className="a11y-overview-issue-msg">{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
