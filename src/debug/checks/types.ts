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
    element: element ? describeIssueElement(element) : undefined,
  };
}

/**
 * Get visible text from an element, inserting spaces between child nodes
 * to avoid run-together text like "ChecksToolsHooks".
 */
function getVisibleText(el: Element): string {
  const parts: string[] = [];
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.trim();
    if (text) parts.push(text);
    node = walker.nextNode();
  }
  return parts.join(" ").trim();
}

/**
 * Produce a rich element description for audit reports.
 * Includes tag, id, classes, text snippet, and role.
 * e.g., `<button.a11y-panel-btn> "Rescan"` or `<span#score> "96"`
 */
export function describeIssueElement(el: Element): string {
  const tag = el.tagName?.toLowerCase() ?? "unknown";
  const id = el.id ? `#${el.id}` : "";
  const classAttr = el.getAttribute("class") || "";
  const classes = classAttr
    ? `.${classAttr.split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`
    : "";
  const role = el.getAttribute("role");
  const roleStr = role ? `[role="${role}"]` : "";

  // Text snippet: first 30 chars of visible text, with spaces between child nodes
  const text = getVisibleText(el);
  const snippet = text.length > 30 ? `${text.slice(0, 30)}...` : text;
  const textStr = snippet ? ` "${snippet}"` : "";

  return `<${tag}${id}${classes}${roleStr}>${textStr}`;
}
