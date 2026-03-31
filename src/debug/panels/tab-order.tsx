/**
 * Tab Order panel.
 *
 * Queries all tabbable elements, sorts by browser tab order, and
 * displays the sequential tab order. Flags positive tabindex values
 * and elements removed from tab order with tabindex="-1".
 */

import { useEffect, useState } from "react";
import {
  describeElement,
  getReactComponentName,
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";
import { isInsideSidebar } from "../utils/focus-stream";

interface TabOrderEntry {
  element: Element;
  tabIndex: number;
  order: number;
  description: string;
  component: string | null;
  hasIssue: boolean;
  issueReason: string | null;
}

const TABBABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
  "summary",
].join(", ");

function getTabbableElements(root: Element | Document): TabOrderEntry[] {
  const elements = root.querySelectorAll(TABBABLE_SELECTOR);
  const entries: TabOrderEntry[] = [];

  for (const el of elements) {
    if (isInsideSidebar(el)) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    if (el instanceof HTMLElement && el.hidden) continue;

    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;

    const tabIndex = el.getAttribute("tabindex");
    const tabIndexVal = tabIndex !== null ? Number(tabIndex) : 0;
    const component = getReactComponentName(el);

    let hasIssue = false;
    let issueReason: string | null = null;

    if (tabIndexVal > 0) {
      hasIssue = true;
      issueReason = `Positive tabindex (${tabIndexVal}) - disrupts natural tab order`;
    }

    entries.push({
      element: el,
      tabIndex: tabIndexVal,
      order: 0,
      description: describeElement(el),
      component,
      hasIssue,
      issueReason,
    });
  }

  // Sort by browser tab order rules:
  // 1. Positive tabindex (ascending) comes first
  // 2. tabindex=0 and natural tab order elements follow in DOM order
  entries.sort((a, b) => {
    if (a.tabIndex > 0 && b.tabIndex > 0) return a.tabIndex - b.tabIndex;
    if (a.tabIndex > 0) return -1;
    if (b.tabIndex > 0) return 1;
    return 0; // DOM order preserved for equal tabindex
  });

  // Filter out tabindex=-1 (not in tab order) but keep for display
  const inTabOrder = entries.filter((e) => e.tabIndex >= 0);
  const removedFromOrder = entries.filter((e) => e.tabIndex < 0);

  // Number the in-tab-order entries
  for (let i = 0; i < inTabOrder.length; i++) {
    inTabOrder[i].order = i + 1;
  }

  return [...inTabOrder, ...removedFromOrder];
}

export function TabOrderPanel() {
  const [entries, setEntries] = useState<TabOrderEntry[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = getTabbableElements(document);
    setEntries(result);
    if (notify) {
      const n = result.filter((e) => e.hasIssue).length;
      showToast(
        `Rescan complete: ${n ? `${pluralize(n, "issue")} found` : "no issues found"}`,
      );
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: rescan is stable
  useEffect(() => {
    rescan(false);
  }, []);

  const inOrder = entries.filter((e) => e.tabIndex >= 0);
  const removedFromOrder = entries.filter((e) => e.tabIndex < 0);
  const issueCount = entries.filter((e) => e.hasIssue).length;

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Tab Order</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {inOrder.length} tabbable
          {removedFromOrder.length > 0 &&
            `, ${removedFromOrder.length} removed`}
          {issueCount > 0 && `, ${pluralize(issueCount, "issue")}`}
        </span>
      </div>

      {issueCount > 0 && (
        <div className="a11y-panel-issues">
          {entries
            .filter((e) => e.hasIssue)
            .map((e, i) => (
              <div key={`issue-${i}`} className="a11y-panel-issue">
                {e.issueReason}
              </div>
            ))}
        </div>
      )}

      <div className="a11y-panel-list">
        {inOrder.map((entry, i) => (
          <button
            type="button"
            key={`tab-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${entry.hasIssue ? "a11y-panel-row-error" : ""} ${isHighlighted(entry.element) ? "a11y-panel-row-active" : ""}`}
            aria-label={`Tab ${entry.order}: ${entry.description}`}
            title={`${entry.description}${entry.issueReason ? `\n${entry.issueReason}` : ""}`}
            onClick={() => {
              scrollToAndHighlight(entry.element);
              forceUpdate((n) => n + 1);
            }}
          >
            <span className="a11y-recorder-order">{entry.order}</span>
            <span className="a11y-panel-text">
              {entry.component ?? entry.description}
            </span>
            {entry.tabIndex > 0 && (
              <span className="a11y-kbd-badge">tabindex={entry.tabIndex}</span>
            )}
          </button>
        ))}

        {removedFromOrder.length > 0 && (
          <>
            <div className="a11y-focus-path-label" style={{ marginTop: 8 }}>
              Removed from tab order (tabindex="-1"):
            </div>
            {removedFromOrder.map((entry, i) => (
              <button
                type="button"
                key={`removed-${i}`}
                className={`a11y-panel-row a11y-panel-row-clickable ${isHighlighted(entry.element) ? "a11y-panel-row-active" : ""}`}
                style={{ opacity: 0.6 }}
                aria-label={`Removed: ${entry.description}`}
                title={`${entry.description}\ntabindex="-1" (programmatically focusable only)`}
                onClick={() => {
                  scrollToAndHighlight(entry.element, { color: "#9ca3af" });
                  forceUpdate((n) => n + 1);
                }}
              >
                <span className="a11y-recorder-order">-</span>
                <span className="a11y-panel-text">
                  {entry.component ?? entry.description}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
