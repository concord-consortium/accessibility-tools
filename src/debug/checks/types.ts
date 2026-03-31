/**
 * Shared types for all check modules.
 * Used by panels for rendering and by the WCAG Audit Report Generator
 * for grouping results by criterion.
 */

export interface CheckIssue {
  /** Machine-readable issue type, e.g., "skipped-level", "no-label" */
  type: string;
  /** Error = fails criterion, warning = best practice */
  severity: "error" | "warning";
  /** WCAG success criterion, e.g., "1.3.1", "3.3.2" */
  wcag?: string;
  /** WCAG conformance level: "A", "AA", or "AAA" */
  wcagLevel?: "A" | "AA" | "AAA";
  /** Human-readable description */
  message: string;
  /** Actionable fix instruction for the audit report */
  fix?: string;
  /** The DOM element with the issue, if applicable */
  element?: Element;
}

export interface CheckResult<T> {
  /** All items found by the scan */
  items: T[];
  /** Issues found during the scan */
  issues: CheckIssue[];
}

/**
 * Serializable version of CheckIssue for CLI/Playwright transport.
 * Element references are replaced with a descriptor string.
 */
export interface SerializedCheckIssue {
  type: string;
  severity: "error" | "warning";
  wcag?: string;
  wcagLevel?: "A" | "AA" | "AAA";
  message: string;
  fix?: string;
  element?: string;
}

/**
 * Serialize a CheckIssue for transport (e.g., browser -> CLI via Playwright).
 */
export function serializeIssue(issue: CheckIssue): SerializedCheckIssue {
  const { element, ...rest } = issue;
  return {
    ...rest,
    element: element
      ? `<${element.tagName?.toLowerCase() ?? "unknown"}${element.id ? ` id="${element.id}"` : ""}>`
      : undefined,
  };
}
