import { useEffect, useState } from "react";
import {
  type TouchTargetItem,
  scanTouchTargets,
} from "../checks/touch-targets";
import type { CheckIssue } from "../checks/types";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function TouchTargetsPanel() {
  const [targets, setTargets] = useState<TouchTargetItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanTouchTargets();
    setTargets(result.items);
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
      <h3 className="a11y-panel-title">Touch Target Size</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {targets.length} targets, {issues.length} issues
        </span>
      </div>

      {issues.length > 0 && (
        <div className="a11y-panel-issues">
          {issues.map((issue, i) => (
            <div key={`issue-${issue.type}-${i}`} className="a11y-panel-issue">
              {issue.message}
            </div>
          ))}
        </div>
      )}

      <div className="a11y-panel-list">
        {targets
          .filter((t) => !t.meetsAAA)
          .map((t, i) => (
            <button
              type="button"
              key={`tt-${i}`}
              className={`a11y-panel-row a11y-panel-row-clickable ${!t.meetsAA ? "a11y-panel-row-error" : ""} ${isHighlighted(t.element) ? "a11y-panel-row-active" : ""}`}
              aria-label={`${t.width}x${t.height}px ${t.meetsAA ? "AA pass" : "AA fail"}`}
              title={`${t.width}x${t.height}px\n${t.meetsAA ? "Passes AA" : "Fails AA"}\n${t.meetsAAA ? "Passes AAA" : "Fails AAA"}${t.component ? `\n${t.component}` : ""}`}
              onClick={() => {
                scrollToAndHighlight(t.element, {
                  color: t.meetsAA ? "#ca8a04" : "#dc2626",
                });
                forceUpdate((n) => n + 1);
              }}
            >
              <span className="a11y-panel-tag">
                {t.width}x{t.height}
              </span>
              <span className="a11y-panel-text">
                {t.element.tagName.toLowerCase()}
                {t.element.id ? `#${t.element.id}` : ""}
              </span>
              {t.component && (
                <span className="a11y-panel-component">{t.component}</span>
              )}
            </button>
          ))}
        {targets.filter((t) => !t.meetsAAA).length === 0 &&
          targets.length > 0 && (
            <div className="a11y-focus-empty">
              All {targets.length} targets meet AAA size requirements.
            </div>
          )}
      </div>
    </div>
  );
}
