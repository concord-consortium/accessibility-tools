import type { CheckResult } from "./types";

export interface LinkButtonItem {
  element: Element;
  tag: string;
  accessibleName: string | null;
  href: string | null;
}

/** Stub - full implementation in Tier 4 */
export function scanLinksButtons(
  _root: Element | Document = document,
): CheckResult<LinkButtonItem> {
  return { items: [], issues: [] };
}
