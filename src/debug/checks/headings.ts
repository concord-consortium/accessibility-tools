import { getReactComponentName, isInsideSidebar } from "../utils";
import type { CheckIssue, CheckResult } from "./types";

export interface HeadingItem {
  level: number;
  text: string;
  component: string | null;
  element: Element;
  hasIssue: boolean;
  issueReason: string | null;
}

export function scanHeadings(
  root: Element | Document = document,
): CheckResult<HeadingItem> {
  const elements = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const items: HeadingItem[] = [];
  const issues: CheckIssue[] = [];
  const issueMap = new Map<Element, string>();

  let h1Count = 0;
  let prevLevel = 0;

  // First pass: find issues
  for (const el of elements) {
    if (isInsideSidebar(el)) continue;
    const level = Number.parseInt(el.tagName[1], 10);

    if (level === 1) h1Count++;

    if (prevLevel > 0 && level > prevLevel + 1) {
      const msg = `h${level} follows h${prevLevel} - skipped h${prevLevel + 1}`;
      issues.push({
        type: "skipped-level",
        severity: "error",
        wcag: "1.3.1",
        message: msg,
        element: el,
      });
      issueMap.set(el, msg);
    }

    prevLevel = level;
  }

  if (h1Count === 0) {
    issues.push({
      type: "missing-h1",
      severity: "error",
      wcag: "1.3.1",
      message: "No h1 element found - page should have exactly one",
    });
  } else if (h1Count > 1) {
    const reason = "Multiple h1 elements - should be exactly one";
    for (const el of elements) {
      if (isInsideSidebar(el)) continue;
      if (el.tagName === "H1") issueMap.set(el, reason);
    }
    issues.push({
      type: "multiple-h1",
      severity: "error",
      wcag: "1.3.1",
      message: `Found ${h1Count} h1 elements - should be exactly one`,
    });
  }

  // Second pass: build items with issue flags
  for (const el of elements) {
    if (isInsideSidebar(el)) continue;
    const level = Number.parseInt(el.tagName[1], 10);
    items.push({
      level,
      text: el.textContent?.trim() || "(empty)",
      component: getReactComponentName(el),
      element: el,
      hasIssue: issueMap.has(el),
      issueReason: issueMap.get(el) || null,
    });
  }

  return { items, issues };
}
