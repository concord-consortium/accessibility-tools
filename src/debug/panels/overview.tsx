import { useCallback, useEffect, useState } from "react";
import { scanAriaValidation } from "../checks/aria-validation";
import { scanColorContrast } from "../checks/color-contrast";
import { scanDuplicateIds } from "../checks/duplicate-ids";
import { scanFormControls } from "../checks/form-labels";
import { scanHeadings } from "../checks/headings";
import { scanImages } from "../checks/images";
import { scanLandmarks } from "../checks/landmarks";
import { scanLinksButtons } from "../checks/links-buttons";
import { scanAnimations } from "../checks/reduced-motion";
import type { ScoreExplanation } from "../checks/scoring";
import {
  type OverallScore,
  calculateOverallScore,
  generateMarkdownReport,
} from "../checks/scoring";
import { scanTouchTargets } from "../checks/touch-targets";
import { showToast } from "../utils";

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

export function OverviewPanel({ onNavigateToPanel }: OverviewPanelProps) {
  const [showExplain, setShowExplain] = useState(false);
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
          ? `Rescan complete: ${errors} error${errors !== 1 ? "s" : ""}, ${warnings} warning${warnings !== 1 ? "s" : ""}`
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
          className={`a11y-panel-btn ${showExplain ? "a11y-panel-btn-active" : ""}`}
          aria-expanded={showExplain}
          onClick={() => setShowExplain((v) => !v)}
        >
          Explain
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

      {/* Score explanation */}
      {showExplain && (
        <div className="a11y-overview-explain">
          <p>
            <strong>Overall: {scores.score}/100</strong> (average of{" "}
            {scores.checks.length} checks)
          </p>
          {scores.checks.map((check) => (
            <ExplainCard key={check.id} check={check} />
          ))}
        </div>
      )}

      {/* Check cards - grows to fill space */}
      <div className="a11y-overview-checks">
        {scores.checks.map((check) => (
          <button
            type="button"
            key={check.id}
            className={`a11y-overview-check-card ${check.errorCount > 0 ? "a11y-overview-check-error" : ""}`}
            aria-label={`${check.label}: score ${check.score}, ${check.errorCount} errors, ${check.warningCount} warnings`}
            title={`${check.label}: ${check.score}/100 - ${check.errorCount} errors, ${check.warningCount} warnings`}
            onClick={() => onNavigateToPanel?.(check.id)}
          >
            <div className="a11y-overview-check-header">
              <span className="a11y-overview-check-name">{check.label}</span>
              <span
                className={`a11y-overview-check-score a11y-score-${check.color}`}
              >
                {check.score}
              </span>
            </div>
            <div className="a11y-overview-check-summary">
              {check.errorCount > 0 && (
                <span className="a11y-overview-check-errors">
                  {check.errorCount} error{check.errorCount !== 1 ? "s" : ""}
                </span>
              )}
              {check.warningCount > 0 && (
                <span className="a11y-overview-check-warnings">
                  {check.warningCount} warning
                  {check.warningCount !== 1 ? "s" : ""}
                </span>
              )}
              {check.errorCount === 0 && check.warningCount === 0 && (
                <span className="a11y-overview-check-pass">All clear</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Audit buttons pushed to bottom via flex */}
      <div className="a11y-overview-audit-buttons">
        <button
          type="button"
          className="a11y-panel-btn"
          aria-label="Run WCAG audit on entire page (coming soon)"
          title="Coming soon - requires full audit engine (Tier 6)"
          disabled
        >
          Audit Page
        </button>
        <button
          type="button"
          className="a11y-panel-btn"
          aria-label="Run WCAG audit on the sidebar itself (coming soon)"
          title="Coming soon - requires full audit engine (Tier 6)"
          disabled
        >
          Audit Sidebar
        </button>
      </div>
    </div>
  );
}

function ExplainCard({
  check,
}: {
  check: { label: string; score: number; explanation: ScoreExplanation };
}) {
  const { explanation } = check;
  return (
    <div className="a11y-overview-explain-card">
      <strong>
        {check.label}: {check.score}/100
      </strong>
      <div className="a11y-overview-explain-detail">
        100 - ({explanation.totalDeductions} deductions /{" "}
        {explanation.totalItems} items) x 10 = 100 -{" "}
        {explanation.normalizedDeduction} = {check.score}
      </div>
      {explanation.issueBreakdown.length > 0 && (
        <div className="a11y-overview-explain-issues">
          {explanation.issueBreakdown.map((ib, i) => (
            <div key={`ib-${i}`} className="a11y-overview-explain-issue">
              {ib.severity}({ib.severity === "error" ? 10 : 3}) x {ib.wcagLevel}
              ({ib.wcagLevel === "A" ? 3 : ib.wcagLevel === "AA" ? 2 : 1}) ={" "}
              {ib.weight}: {ib.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
