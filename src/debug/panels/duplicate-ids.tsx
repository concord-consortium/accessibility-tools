import { useEffect, useRef, useState } from "react";
import { type DuplicateIdGroup, scanDuplicateIds } from "../checks";
import type { CheckIssue } from "../checks";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function DuplicateIdPanel() {
  const [duplicates, setDuplicates] = useState<DuplicateIdGroup[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const observerRef = useRef<MutationObserver | null>(null);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanDuplicateIds();
    setDuplicates(result.items);
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
      attributes: true,
      attributeFilter: ["id"],
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Duplicate ID Detector</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {duplicates.length} duplicate IDs, {issues.length} issues
        </span>
      </div>

      {duplicates.length === 0 ? (
        <p className="a11y-panel-placeholder">No duplicate IDs found</p>
      ) : (
        <div className="a11y-panel-list">
          {duplicates.map((group) => (
            <div key={group.id} className="a11y-panel-group">
              <div className="a11y-panel-group-header">
                <span className="a11y-panel-issue">id="{group.id}"</span>
                <span className="a11y-panel-count">
                  {group.elements.length} elements
                </span>
              </div>
              {group.elements.map((el, i) => (
                <button
                  type="button"
                  key={`${group.id}-${i}`}
                  className={`a11y-panel-row a11y-panel-row-clickable a11y-panel-row-error ${isHighlighted(el.element) ? "a11y-panel-row-active" : ""}`}
                  aria-label={`Go to <${el.tag}> with id="${group.id}"${el.component ? ` in ${el.component}` : ""}`}
                  title={`<${el.tag} id="${group.id}">${el.component ? ` in ${el.component}` : ""}: ERROR: ${group.elements.length} elements share this ID`}
                  onClick={() => {
                    scrollToAndHighlight(el.element);
                    forceUpdate((n) => n + 1);
                  }}
                >
                  <span className="a11y-panel-tag">{`<${el.tag}>`}</span>
                  {el.component && (
                    <span className="a11y-panel-component">{el.component}</span>
                  )}
                </button>
              ))}
              {group.ariaRefs.length > 0 && (
                <div className="a11y-panel-refs">
                  Referenced by: {group.ariaRefs.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
