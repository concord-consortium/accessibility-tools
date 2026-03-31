import { getReactComponentName, isInsideSidebar } from "../utils";
import { getPrimaryClass } from "../utils/contrast";
import type { CheckIssue, CheckResult } from "./types";

export interface TouchTargetItem {
  element: Element;
  width: number;
  height: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  component: string | null;
}

const AA_MIN = 24;
const AAA_MIN = 44;

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "[tabindex]",
  "[role=button]",
  "[role=link]",
  "[role=checkbox]",
  "[role=radio]",
  "[role=tab]",
  "[role=menuitem]",
  "[role=option]",
  "summary",
].join(", ");

export function scanTouchTargets(
  root: Element | Document = document,
): CheckResult<TouchTargetItem> {
  const items: TouchTargetItem[] = [];
  const issues: CheckIssue[] = [];

  for (const el of root.querySelectorAll(INTERACTIVE_SELECTOR)) {
    if (isInsideSidebar(el)) continue;
    if (el instanceof HTMLElement && el.hidden) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    if (el instanceof HTMLInputElement && el.type === "hidden") continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const meetsAA = width >= AA_MIN && height >= AA_MIN;
    const meetsAAA = width >= AAA_MIN && height >= AAA_MIN;
    const component = getReactComponentName(el);
    const inComponent = component ? ` (in ${component})` : "";

    items.push({ element: el, width, height, meetsAA, meetsAAA, component });

    const cls = getPrimaryClass(el);
    const selector = cls ? `.${cls}` : el.tagName.toLowerCase();
    if (!meetsAA) {
      issues.push({
        type: "touch-target-small",
        severity: "error",
        wcag: "2.5.8",
        wcagLevel: "AA",
        message: `${width}x${height}px target (min ${AA_MIN}x${AA_MIN}px)${inComponent}`,
        fix: `Add min-height: ${AA_MIN}px to ${selector}`,
        element: el,
      });
    } else if (!meetsAAA) {
      issues.push({
        type: "touch-target-below-aaa",
        severity: "warning",
        wcag: "2.5.8",
        wcagLevel: "AAA",
        message: `${width}x${height}px target (AAA requires ${AAA_MIN}x${AAA_MIN}px)${inComponent}`,
        fix: `Add min-height: ${AAA_MIN}px to ${selector}`,
        element: el,
      });
    }
  }

  return { items, issues };
}
