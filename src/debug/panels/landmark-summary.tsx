import { useEffect, useState } from "react";
import { type LandmarkItem, scanLandmarks } from "../checks";
import type { CheckIssue } from "../checks";
import {
  CheckPanelIssues,
  type ItemFilter,
  buildSeverityMap,
  getItemSeverity,
  issueRowClass,
} from "../components/check-panel-issues";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function LandmarkSummaryPanel() {
  const [landmarks, setLandmarks] = useState<LandmarkItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanLandmarks();
    setLandmarks(result.items);
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

  const severityMap = buildSeverityMap(issues);
  const errorItemCount = landmarks.filter(
    (lm) => getItemSeverity(severityMap, lm.element, lm.hasIssue) === "error",
  ).length;
  const warningItemCount = landmarks.filter(
    (lm) => getItemSeverity(severityMap, lm.element, lm.hasIssue) === "warning",
  ).length;
  const filteredLandmarks =
    filter === "all"
      ? landmarks
      : landmarks.filter(
          (lm) =>
            getItemSeverity(severityMap, lm.element, lm.hasIssue) ===
            filter.slice(0, -1),
        );

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Landmark Summary</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {landmarks.length} landmarks, {issues.length} issues
        </span>
      </div>

      <CheckPanelIssues
        issues={issues}
        filter={filter}
        onFilterChange={setFilter}
        itemCount={landmarks.length}
        errorItemCount={errorItemCount}
        warningItemCount={warningItemCount}
      />

      <div className="a11y-panel-list">
        {filteredLandmarks.map((lm, i) => (
          <button
            type="button"
            key={`lm-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${issueRowClass(severityMap, lm.element, lm.hasIssue)} ${isHighlighted(lm.element) ? "a11y-panel-row-active" : ""}`}
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
