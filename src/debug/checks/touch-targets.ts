import type { CheckResult } from "./types";

export interface TouchTargetItem {
  element: Element;
  width: number;
  height: number;
  meetsAA: boolean;
  meetsAAA: boolean;
}

/** Stub - full implementation in Tier 4 */
export function scanTouchTargets(
  _root: Element | Document = document,
): CheckResult<TouchTargetItem> {
  return { items: [], issues: [] };
}
