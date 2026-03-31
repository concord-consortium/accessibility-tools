import { useEffect, useRef, useState } from "react";
import { type FormControlItem, scanFormControls } from "../checks";
import type { CheckIssue } from "../checks";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function FormLabelPanel() {
  const [controls, setControls] = useState<FormControlItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
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
        {controls.map((c, i) => (
          <button
            type="button"
            key={`ctrl-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${c.hasIssue ? "a11y-panel-row-error" : ""} ${isHighlighted(c.element) ? "a11y-panel-row-active" : ""}`}
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
