import { useEffect, useState } from "react";
import {
  type AriaIssueItem,
  scanAriaValidation,
} from "../checks/aria-validation";
import type { CheckIssue } from "../checks/types";
import type { ItemFilter } from "../components/check-panel-issues";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function AriaValidationPanel() {
  const [ariaItems, setAriaItems] = useState<AriaIssueItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanAriaValidation();
    setAriaItems(result.items);
    setIssues(result.issues);
    if (notify) {
      const n = result.issues.length;
      showToast(
        `Rescan complete: ${n ? `${pluralize(n, "issue")} found` : "no issues found"}`,
      );
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: rescan is stable
  useEffect(() => {
    rescan(false);
  }, []);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">ARIA Validation</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {pluralize(issues.length, "issue")}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="a11y-focus-empty">
          No ARIA validation issues found. This panel checks for invalid roles,
          broken id references, aria-hidden on focusable elements, nested
          interactives, and misused ARIA attributes.
        </div>
      ) : (
        <>
          {(() => {
            const errorCount = issues.filter(
              (i) => i.severity === "error",
            ).length;
            const warningCount = issues.filter(
              (i) => i.severity === "warning",
            ).length;
            return (
              errorCount > 0 &&
              warningCount > 0 && (
                <div className="a11y-panel-toolbar">
                  <button
                    type="button"
                    className={`a11y-panel-btn ${filter === "all" ? "a11y-panel-btn-active" : ""}`}
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}
                  >
                    All ({issues.length})
                  </button>
                  <button
                    type="button"
                    className={`a11y-panel-btn ${filter === "errors" ? "a11y-panel-btn-active" : ""}`}
                    aria-pressed={filter === "errors"}
                    onClick={() => setFilter("errors")}
                  >
                    Errors ({errorCount})
                  </button>
                  <button
                    type="button"
                    className={`a11y-panel-btn ${filter === "warnings" ? "a11y-panel-btn-active" : ""}`}
                    aria-pressed={filter === "warnings"}
                    onClick={() => setFilter("warnings")}
                  >
                    Warnings ({warningCount})
                  </button>
                </div>
              )
            );
          })()}
          <div className="a11y-panel-list">
            {issues
              .filter(
                (issue) =>
                  filter === "all" || issue.severity === filter.slice(0, -1),
              )
              .map((issue, i) => (
                <button
                  type="button"
                  key={`aria-${issue.type}-${i}`}
                  className={`a11y-panel-row a11y-panel-row-clickable ${issue.severity === "error" ? "a11y-panel-row-error" : "a11y-panel-row-warning"} ${issue.element && isHighlighted(issue.element) ? "a11y-panel-row-active" : ""}`}
                  aria-label={`${issue.severity}: ${issue.message}`}
                  title={`${issue.message}\n${issue.fix}${issue.wcag ? `\nWCAG ${issue.wcag}` : ""}`}
                  onClick={() => {
                    if (issue.element) {
                      scrollToAndHighlight(issue.element);
                      forceUpdate((n) => n + 1);
                    }
                  }}
                >
                  <span
                    className={`a11y-panel-tag ${issue.severity === "error" ? "" : "a11y-panel-tag-warning"}`}
                  >
                    {issue.severity === "error" ? "ERR" : "WARN"}
                  </span>
                  <span className="a11y-panel-text">{issue.message}</span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
