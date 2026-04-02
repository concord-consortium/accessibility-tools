import { useEffect, useState } from "react";
import { type HeadingItem, scanHeadings } from "../checks";
import type { CheckIssue } from "../checks";
import {
  CheckPanelIssues,
  buildSeverityMap,
  issueRowClass,
} from "../components/check-panel-issues";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function HeadingHierarchyPanel() {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanHeadings();
    setHeadings(result.items);
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
      <h3 className="a11y-panel-title">Heading Hierarchy</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {headings.length} headings, {issues.length} issues
        </span>
      </div>

      <CheckPanelIssues issues={issues} />

      <div className="a11y-panel-list">
        {(() => {
          const severityMap = buildSeverityMap(issues);
          return headings.map((h, i) => (
            <button
              type="button"
              key={`h-${i}`}
              className={`a11y-panel-row a11y-panel-row-clickable ${issueRowClass(severityMap, h.element, h.hasIssue)} ${isHighlighted(h.element) ? "a11y-panel-row-active" : ""}`}
              style={{ marginLeft: (h.level - 1) * 12 }}
              aria-label={`Go to h${h.level}: ${h.text}`}
              title={`h${h.level}: ${h.text}${h.component ? ` in ${h.component}` : ""}${h.issueReason ? `: ${h.issueReason}` : ""}`}
              onClick={() => {
                scrollToAndHighlight(h.element);
                forceUpdate((n) => n + 1);
              }}
            >
              <span className="a11y-panel-tag">h{h.level}</span>
              <span className="a11y-panel-text">{h.text}</span>
              {h.component && (
                <span className="a11y-panel-component">{h.component}</span>
              )}
            </button>
          ));
        })()}
      </div>
    </div>
  );
}
