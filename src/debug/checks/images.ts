import type { CheckResult } from "./types";

export interface ImageItem {
  element: Element;
  src: string;
  alt: string | null;
  status: "has-alt" | "decorative" | "missing";
}

/** Stub - full implementation in Tier 4 */
export function scanImages(
  _root: Element | Document = document,
): CheckResult<ImageItem> {
  return { items: [], issues: [] };
}
