import { useEffect, useState } from "react";
import { type ContrastItem, scanColorContrast } from "../checks/color-contrast";
import type { CheckIssue } from "../checks/types";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";
import { formatRatio } from "../utils/contrast";

export function ColorContrastPanel() {
  const [contrastItems, setContrastItems] = useState<ContrastItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanColorContrast();
    setContrastItems(result.items);
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

  const failures = contrastItems.filter((c) => c.canCompute && !c.passes);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Color Contrast Checker</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {contrastItems.length} elements, {issues.length} issues
        </span>
      </div>

      {issues.length > 0 && (
        <div className="a11y-panel-issues">
          {issues
            .filter((i) => i.severity === "error")
            .slice(0, 5)
            .map((issue, i) => (
              <div
                key={`issue-${issue.type}-${i}`}
                className="a11y-panel-issue"
              >
                {issue.message}
              </div>
            ))}
          {issues.filter((i) => i.severity === "error").length > 5 && (
            <div className="a11y-panel-issue">
              ...and {issues.filter((i) => i.severity === "error").length - 5}{" "}
              more failures
            </div>
          )}
        </div>
      )}

      {failures.length === 0 &&
        contrastItems.length > 0 &&
        issues.length === 0 && (
          <div className="a11y-focus-empty">
            All {contrastItems.length} text elements pass AA contrast
            requirements.
          </div>
        )}

      <div className="a11y-panel-list">
        {failures.map((item, i) => (
          <button
            type="button"
            key={`c-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable a11y-panel-row-error ${isHighlighted(item.element) ? "a11y-panel-row-active" : ""}`}
            aria-label={`${formatRatio(item.ratio)} contrast on ${item.component ?? item.element.tagName.toLowerCase()}`}
            title={`${formatRatio(item.ratio)} (requires ${formatRatio(item.requiredRatio)})\nFG: ${item.foreground}\nBG: ${item.background}${item.isLargeText ? "\nLarge text" : ""}${item.component ? `\n${item.component}` : ""}`}
            onClick={() => {
              scrollToAndHighlight(item.element, { color: "#dc2626" });
              forceUpdate((n) => n + 1);
            }}
          >
            <span className="a11y-contrast-ratio">
              {formatRatio(item.ratio)}
            </span>
            <span
              className="a11y-contrast-swatch"
              style={{ color: item.foreground, background: item.background }}
            >
              Aa
            </span>
            <span className="a11y-panel-text">
              {item.component ?? `<${item.element.tagName.toLowerCase()}>`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
