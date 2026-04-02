import { useEffect, useRef, useState } from "react";
import { type FormControlItem, scanFormControls } from "../checks";
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

export function FormLabelPanel() {
  const [controls, setControls] = useState<FormControlItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [filter, setFilter] = useState<ItemFilter>("all");
  const observerRef = useRef<MutationObserver | null>(null);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanFormControls();
    setControls(result.items);
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

    let debounceTimer: ReturnType<typeof setTimeout>;
    observerRef.current = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => rescan(false), 200);
    });
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const severityMap = buildSeverityMap(issues);
  const errorItemCount = controls.filter(
    (c) => getItemSeverity(severityMap, c.element, c.hasIssue) === "error",
  ).length;
  const warningItemCount = controls.filter(
    (c) => getItemSeverity(severityMap, c.element, c.hasIssue) === "warning",
  ).length;
  const filteredControls =
    filter === "all"
      ? controls
      : controls.filter(
          (c) =>
            getItemSeverity(severityMap, c.element, c.hasIssue) ===
            filter.slice(0, -1),
        );

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Form Label Checker</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {controls.length} controls, {issues.length} issues
        </span>
      </div>

      <CheckPanelIssues
        issues={issues}
        filter={filter}
        onFilterChange={setFilter}
        itemCount={controls.length}
        errorItemCount={errorItemCount}
        warningItemCount={warningItemCount}
      />

      <div className="a11y-panel-list">
        {filteredControls.map((c, i) => (
          <button
            type="button"
            key={`ctrl-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${issueRowClass(severityMap, c.element, c.hasIssue)} ${isHighlighted(c.element) ? "a11y-panel-row-active" : ""}`}
            aria-label={`Go to <${c.tag} type="${c.type}">${c.label ? ` labeled "${c.label}"` : " (no label)"}`}
            title={`<${c.tag} type="${c.type}">${c.label ? ` "${c.label}" (${c.labelMethod})` : ": no label"}${c.component ? ` in ${c.component}` : ""}${c.labelMethod === "none" ? ": ERROR: add a <label> or aria-label" : ""}${c.labelMethod === "placeholder-only" ? ": WARNING: placeholder is not a substitute for a label" : ""}`}
            onClick={() => {
              scrollToAndHighlight(c.element);
              forceUpdate((n) => n + 1);
            }}
          >
            <span className="a11y-panel-tag">{`<${c.tag}>`}</span>
            <span className="a11y-panel-type">{c.type}</span>
            {c.label ? (
              <span className="a11y-panel-label">
                "{c.label}" ({c.labelMethod})
              </span>
            ) : (
              <span className="a11y-panel-missing">no label</span>
            )}
            {c.component && (
              <span className="a11y-panel-component">{c.component}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
