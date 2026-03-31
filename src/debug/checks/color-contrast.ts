import type { CheckResult } from "./types";

export interface ContrastItem {
  element: Element;
  ratio: number;
  requiredRatio: number;
  passes: boolean;
}

/** Stub - full implementation in Tier 4 */
export function scanColorContrast(
  _root: Element | Document = document,
): CheckResult<ContrastItem> {
  return { items: [], issues: [] };
}
