import { getReactComponentName, isInsideSidebar } from "../utils";
import {
  computeContrast,
  formatRatio,
  getPrimaryClass,
  parseRgbString,
  rgbaToHex,
  suggestFixColor,
} from "../utils/contrast";
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
        const fgParsed = parseRgbString(result.foreground);
        const bgParsed = parseRgbString(result.background);
        const fgHex = fgParsed ? rgbaToHex(fgParsed) : result.foreground;
        const bgHex = bgParsed ? rgbaToHex(bgParsed) : result.background;
        const cls = getPrimaryClass(el);
        const selector = cls ? `.${cls}` : `<${el.tagName.toLowerCase()}>`;
        // Decide whether to suggest changing fg or bg.
        // If fg is very light (near white), suggest darkening the bg instead.
        // If fg is very dark (near black), suggest lightening the bg instead.
        const fgLum = fgParsed
          ? (fgParsed.r * 0.299 + fgParsed.g * 0.587 + fgParsed.b * 0.114) / 255
          : 0.5;
        const changeBg = fgLum > 0.9 || fgLum < 0.1;

        let fixText: string;
        if (fgParsed && bgParsed) {
          if (changeBg) {
            const suggestedBg = suggestFixColor(
              bgParsed,
              fgParsed,
              requiredRatio,
            );
            fixText = `Change background on ${selector} from ${bgHex} to ${suggestedBg} (${formatRatio(requiredRatio)} against ${fgHex})`;
          } else {
            const suggestedFg = suggestFixColor(
              fgParsed,
              bgParsed,
              requiredRatio,
            );
            fixText = `Change color on ${selector} from ${fgHex} to ${suggestedFg} (${formatRatio(requiredRatio)} against ${bgHex})`;
          }
        } else {
          fixText = `Increase contrast on ${selector} to at least ${formatRatio(requiredRatio)}. Current: ${fgHex} on ${bgHex}`;
        }

        issues.push({
          type: "contrast-fail",
          severity: "error",
          wcag: "1.4.3",
          wcagLevel: "AA",
          message: `Contrast ${formatRatio(result.ratio)} (requires ${formatRatio(requiredRatio)}${result.isLargeText ? ", large text" : ""}) FG: ${fgHex} / BG: ${bgHex}${inComponent}`,
          fix: fixText,
          element: el,
        });
      }
    }
    node = walker.nextNode();
  }

  return { items, issues };
}
