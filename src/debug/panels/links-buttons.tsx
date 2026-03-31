import { useEffect, useState } from "react";
import { type LinkButtonItem, scanLinksButtons } from "../checks/links-buttons";
import type { CheckIssue } from "../checks/types";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function LinksButtonsPanel() {
  const [linkItems, setLinkItems] = useState<LinkButtonItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanLinksButtons();
    setLinkItems(result.items);
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
      <h3 className="a11y-panel-title">Link & Button Audit</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {linkItems.length} elements, {issues.length} issues
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
        {linkItems.map((item, i) => (
          <button
            type="button"
            key={`lb-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${item.hasIssue ? "a11y-panel-row-error" : ""} ${isHighlighted(item.element) ? "a11y-panel-row-active" : ""}`}
            aria-label={`${item.tag}: ${item.accessibleName || "(no name)"}`}
            title={`${item.accessibleName || "(no name)"}\n<${item.tag}>${item.href ? `\nhref: ${item.href}` : ""}${item.component ? `\n${item.component}` : ""}`}
            onClick={() => {
              scrollToAndHighlight(item.element);
              forceUpdate((n) => n + 1);
            }}
          >
            <span className="a11y-panel-tag">{item.tag}</span>
            <span className="a11y-panel-text">
              {item.accessibleName || (
                <span className="a11y-sr-empty-name">(no name)</span>
              )}
            </span>
            {item.component && (
              <span className="a11y-panel-component">{item.component}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
