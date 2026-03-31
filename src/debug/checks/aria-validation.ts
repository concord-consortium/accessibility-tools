import type { CheckResult } from "./types";

export interface AriaIssueItem {
  element: Element;
  rule: string;
}

/** Stub - full implementation in Tier 4 */
export function scanAriaValidation(
  _root: Element | Document = document,
): CheckResult<AriaIssueItem> {
  return { items: [], issues: [] };
}
