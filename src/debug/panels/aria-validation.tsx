import { useEffect, useState } from "react";
import {
  type AriaIssueItem,
  scanAriaValidation,
} from "../checks/aria-validation";
import type { CheckIssue } from "../checks/types";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function AriaValidationPanel() {
  const [ariaItems, setAriaItems] = useState<AriaIssueItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
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
        <div className="a11y-panel-list">
          {issues.map((issue, i) => (
            <button
              type="button"
              key={`aria-${issue.type}-${i}`}
              className={`a11y-panel-row a11y-panel-row-clickable ${issue.severity === "error" ? "a11y-panel-row-error" : ""} ${issue.element && isHighlighted(issue.element) ? "a11y-panel-row-active" : ""}`}
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
      )}
    </div>
  );
}
