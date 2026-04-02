import { useEffect, useState } from "react";
import { type LinkButtonItem, scanLinksButtons } from "../checks/links-buttons";
import type { CheckIssue } from "../checks/types";
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

export function LinksButtonsPanel() {
  const [linkItems, setLinkItems] = useState<LinkButtonItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [filter, setFilter] = useState<ItemFilter>("all");
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

  const severityMap = buildSeverityMap(issues);
  const errorItemCount = linkItems.filter(
    (item) =>
      getItemSeverity(severityMap, item.element, item.hasIssue) === "error",
  ).length;
  const warningItemCount = linkItems.filter(
    (item) =>
      getItemSeverity(severityMap, item.element, item.hasIssue) === "warning",
  ).length;
  const filteredItems =
    filter === "all"
      ? linkItems
      : linkItems.filter(
          (item) =>
            getItemSeverity(severityMap, item.element, item.hasIssue) ===
            filter.slice(0, -1),
        );

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

      <CheckPanelIssues
        issues={issues}
        filter={filter}
        onFilterChange={setFilter}
        itemCount={linkItems.length}
        errorItemCount={errorItemCount}
        warningItemCount={warningItemCount}
      />

      <div className="a11y-panel-list">
        {filteredItems.map((item, i) => (
          <button
            type="button"
            key={`lb-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${issueRowClass(severityMap, item.element, item.hasIssue)} ${isHighlighted(item.element) ? "a11y-panel-row-active" : ""}`}
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
