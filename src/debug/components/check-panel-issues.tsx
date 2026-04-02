/**
 * Shared issues display and item filter for check panels.
 *
 * Renders the collapsible error/warning list and a filter button
 * row (All / Errors / Warnings) that panels use to filter their
 * item lists.
 */

import { useState } from "react";
import type { CheckIssue } from "../checks/types";

export type ItemFilter = "all" | "errors" | "warnings";

interface CheckPanelIssuesProps {
  issues: CheckIssue[];
  filter?: ItemFilter;
  onFilterChange?: (filter: ItemFilter) => void;
  itemCount?: number;
  errorItemCount?: number;
  warningItemCount?: number;
}

const MAX_COLLAPSED_ISSUES = 3;

/**
 * Build a severity map from issues by element reference.
 * Returns a map from Element to its worst severity ("error" > "warning").
 */
export function buildSeverityMap(
  issues: CheckIssue[],
): Map<Element, "error" | "warning"> {
  const map = new Map<Element, "error" | "warning">();
  for (const issue of issues) {
    if (!issue.element) continue;
    const existing = map.get(issue.element);
    if (!existing || (existing === "warning" && issue.severity === "error")) {
      map.set(issue.element, issue.severity);
    }
  }
  return map;
}

/**
 * Return the CSS class for an item row based on its severity.
 */
/**
 * Return the CSS class for an item row based on its severity.
 * Falls back to "error" when an item has an issue but no severity map entry.
 */
export function issueRowClass(
  severityMap: Map<Element, "error" | "warning">,
  element: Element,
  hasIssue: boolean,
): string {
  if (!hasIssue) return "";
  const severity = severityMap.get(element) ?? "error";
  if (severity === "warning") return "a11y-panel-row-warning";
  return "a11y-panel-row-error";
}

/**
 * Return the severity for an item, falling back to "error" when
 * the item has an issue but no severity map entry.
 */
export function getItemSeverity(
  severityMap: Map<Element, "error" | "warning">,
  element: Element,
  hasIssue: boolean,
): "error" | "warning" | null {
  if (!hasIssue) return null;
  return severityMap.get(element) ?? "error";
}

export function CheckPanelIssues({
  issues,
  filter,
  onFilterChange,
  itemCount,
  errorItemCount,
  warningItemCount,
}: CheckPanelIssuesProps) {
  const [issuesExpanded, setIssuesExpanded] = useState(false);

  const errorCount =
    errorItemCount ?? issues.filter((i) => i.severity === "error").length;
  const warningCount =
    warningItemCount ?? issues.filter((i) => i.severity === "warning").length;

  const visibleIssues = issuesExpanded
    ? issues
    : issues.slice(0, MAX_COLLAPSED_ISSUES);
  const hiddenCount = issues.length - MAX_COLLAPSED_ISSUES;

  return (
    <>
      {issues.length > 0 && (
        <div className="a11y-panel-issues">
          {visibleIssues.map((issue, i) => (
            <div
              key={`issue-${issue.type}-${i}`}
              className={`a11y-panel-issue ${issue.severity === "warning" ? "a11y-panel-issue-warning" : ""}`}
            >
              {issue.message}
            </div>
          ))}
          {issues.length > MAX_COLLAPSED_ISSUES && (
            <button
              type="button"
              className="a11y-panel-issues-toggle"
              onClick={() => setIssuesExpanded((v) => !v)}
              aria-expanded={issuesExpanded}
            >
              {issuesExpanded ? "Show less" : `Show ${hiddenCount} more`}
            </button>
          )}
        </div>
      )}

      {filter &&
        onFilterChange &&
        itemCount != null &&
        itemCount > 0 &&
        (errorCount > 0 || warningCount > 0) && (
          <div className="a11y-panel-toolbar">
            <button
              type="button"
              className={`a11y-panel-btn ${filter === "all" ? "a11y-panel-btn-active" : ""}`}
              aria-pressed={filter === "all"}
              onClick={() => onFilterChange("all")}
            >
              All ({itemCount})
            </button>
            {errorCount > 0 && (
              <button
                type="button"
                className={`a11y-panel-btn ${filter === "errors" ? "a11y-panel-btn-active" : ""}`}
                aria-pressed={filter === "errors"}
                onClick={() => onFilterChange("errors")}
              >
                Errors ({errorCount})
              </button>
            )}
            {warningCount > 0 && (
              <button
                type="button"
                className={`a11y-panel-btn ${filter === "warnings" ? "a11y-panel-btn-active" : ""}`}
                aria-pressed={filter === "warnings"}
                onClick={() => onFilterChange("warnings")}
              >
                Warnings ({warningCount})
              </button>
            )}
          </div>
        )}
    </>
  );
}
