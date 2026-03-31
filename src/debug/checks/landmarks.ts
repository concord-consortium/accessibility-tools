import { getReactComponentName, isInsideSidebar } from "../utils";
import type { CheckIssue, CheckResult } from "./types";

export interface LandmarkItem {
  tag: string;
  role: string;
  label: string | null;
  component: string | null;
  element: Element;
  hasIssue: boolean;
  issueReason: string | null;
}

const LANDMARK_SELECTORS = "main, nav, header, footer, aside, section, form";

const LANDMARK_ROLES: Record<string, string> = {
  MAIN: "main",
  NAV: "navigation",
  HEADER: "banner",
  FOOTER: "contentinfo",
  ASIDE: "complementary",
  SECTION: "region",
  FORM: "form",
};

function getLabel(el: Element): string | null {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const ownerDoc = el.ownerDocument;
    const text = labelledBy
      .split(/\s+/)
      .map((id) => ownerDoc.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(" ");
    return text || null;
  }

  return null;
}

export function scanLandmarks(
  root: Element | Document = document,
): CheckResult<LandmarkItem> {
  const elements = root.querySelectorAll(LANDMARK_SELECTORS);
  const items: LandmarkItem[] = [];
  const issues: CheckIssue[] = [];
  const issueMap = new Map<Element, string>();

  let mainCount = 0;

  // First pass: count mains
  for (const el of elements) {
    if (isInsideSidebar(el)) continue;
    if (el.tagName.toLowerCase() === "main") mainCount++;
  }

  if (mainCount === 0) {
    issues.push({
      type: "missing-main",
      severity: "error",
      wcag: "1.3.1",
      message: "No <main> element found - required for page structure",
    });
  } else if (mainCount > 1) {
    issues.push({
      type: "multiple-main",
      severity: "error",
      wcag: "1.3.1",
      message: `Found ${mainCount} <main> elements - should be exactly one`,
    });
  }

  // Second pass: build items with issue flags
  for (const el of elements) {
    if (isInsideSidebar(el)) continue;

    const tag = el.tagName.toLowerCase();
    const explicitRole = el.getAttribute("role");
    const role = explicitRole || LANDMARK_ROLES[el.tagName] || tag;
    const label = getLabel(el);

    if (tag === "main" && mainCount > 1) {
      issueMap.set(el, "Multiple <main> elements");
    }

    if ((tag === "nav" || tag === "aside" || tag === "form") && !label) {
      const reason = `<${tag}> without accessible label`;
      issueMap.set(el, reason);
      issues.push({
        type: "no-label",
        severity: "warning",
        wcag: "1.3.1",
        message: `${reason} - can't distinguish from other <${tag}> elements`,
        element: el,
      });
    }

    if (tag === "section") {
      const heading = el.querySelector("h1, h2, h3, h4, h5, h6");
      if (!heading && !label) {
        const reason = "<section> without a heading or label";
        issueMap.set(el, reason);
        issues.push({
          type: "section-no-heading",
          severity: "warning",
          wcag: "1.3.1",
          message: reason,
          element: el,
        });
      }
    }

    items.push({
      tag,
      role,
      label,
      component: getReactComponentName(el),
      element: el,
      hasIssue: issueMap.has(el),
      issueReason: issueMap.get(el) || null,
    });
  }

  return { items, issues };
}
