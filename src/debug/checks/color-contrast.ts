import { getReactComponentName, isInsideSidebar } from "../utils";
import { computeContrast, formatRatio } from "../utils/contrast";
import type { CheckIssue, CheckResult } from "./types";

export interface ContrastItem {
  element: Element;
  ratio: number;
  requiredRatio: number;
  passes: boolean;
  foreground: string;
  background: string;
  isLargeText: boolean;
  canCompute: boolean;
  reason?: string;
  component: string | null;
}

/**
 * Scan visible text elements for WCAG contrast ratio compliance.
 */
export function scanColorContrast(
  root: Element | Document = document,
): CheckResult<ContrastItem> {
  const items: ContrastItem[] = [];
  const issues: CheckIssue[] = [];

  const walker = document.createTreeWalker(
    root instanceof Document ? root.body : root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const text = node.textContent?.trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const processed = new Set<Element>();

  let node: Node | null = walker.nextNode();
  while (node) {
    const el = node.parentElement;
    if (el && !processed.has(el) && !isInsideSidebar(el)) {
      processed.add(el);

      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") {
        node = walker.nextNode();
        continue;
      }

      const result = computeContrast(el);
      const component = getReactComponentName(el);
      const inComponent = component ? ` (in ${component})` : "";
      const requiredRatio = result.isLargeText ? 3 : 4.5;

      items.push({
        element: el,
        ratio: result.ratio,
        requiredRatio,
        passes: result.passesAA,
        foreground: result.foreground,
        background: result.background,
        isLargeText: result.isLargeText,
        canCompute: result.canCompute,
        reason: result.reason,
        component,
      });

      if (!result.canCompute) {
        issues.push({
          type: "contrast-unknown",
          severity: "warning",
          wcag: "1.4.3",
          wcagLevel: "AA",
          message: `Cannot compute contrast: ${result.reason}${inComponent}`,
          fix: "Manually verify contrast ratio against the background",
          element: el,
        });
      } else if (!result.passesAA) {
        issues.push({
          type: "contrast-fail",
          severity: "error",
          wcag: "1.4.3",
          wcagLevel: "AA",
          message: `Contrast ${formatRatio(result.ratio)} (requires ${formatRatio(requiredRatio)}${result.isLargeText ? ", large text" : ""})${inComponent}`,
          fix: `Increase contrast to at least ${formatRatio(requiredRatio)}`,
          element: el,
        });
      }
    }
    node = walker.nextNode();
  }

  return { items, issues };
}
