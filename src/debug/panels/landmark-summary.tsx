import { useEffect, useState } from "react";
import { type LandmarkItem, scanLandmarks } from "../checks";
import type { CheckIssue } from "../checks";
import { isHighlighted, scrollToAndHighlight } from "../utils";

export function LandmarkSummaryPanel() {
  const [landmarks, setLandmarks] = useState<LandmarkItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = () => {
    const result = scanLandmarks();
    setLandmarks(result.items);
    setIssues(result.issues);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: rescan is stable
  useEffect(() => {
    rescan();
  }, []);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Landmark Summary</h3>
      <div className="a11y-panel-toolbar">
        <button type="button" onClick={rescan} className="a11y-panel-btn">
          Rescan
        </button>
        <span className="a11y-panel-count">
          {landmarks.length} landmarks, {issues.length} issues
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
        {landmarks.map((lm, i) => (
          <button
            type="button"
            key={`lm-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${lm.hasIssue ? "a11y-panel-row-error" : ""} ${isHighlighted(lm.element) ? "a11y-panel-row-active" : ""}`}
            aria-label={`Go to <${lm.tag}>${lm.label ? ` "${lm.label}"` : ""}`}
            title={`<${lm.tag}> ${lm.role}${lm.label ? ` "${lm.label}"` : ""}${lm.issueReason ? `: ${lm.issueReason}` : ""}`}
            onClick={() => {
              scrollToAndHighlight(lm.element);
              forceUpdate((n) => n + 1);
            }}
          >
            <span className="a11y-panel-tag">{`<${lm.tag}>`}</span>
            <span className="a11y-panel-role">{lm.role}</span>
            {lm.label && <span className="a11y-panel-label">"{lm.label}"</span>}
            {lm.component && (
              <span className="a11y-panel-component">{lm.component}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
