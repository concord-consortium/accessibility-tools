import { getReactComponentName, isInsideSidebar } from "../utils";
import { computeAccessibleInfo } from "../utils/accname";
import type { CheckIssue, CheckResult } from "./types";

export interface LinkButtonItem {
  element: Element;
  tag: string;
  role: string | null;
  accessibleName: string;
  href: string | null;
  component: string | null;
  hasIssue: boolean;
}

const GENERIC_NAMES = new Set([
  "click here",
  "click",
  "here",
  "read more",
  "more",
  "link",
  "button",
  "submit",
  "learn more",
  "details",
  "info",
]);

const LINK_BUTTON_SELECTOR = [
  "a[href]",
  "button",
  '[role="link"]',
  '[role="button"]',
].join(", ");

export function scanLinksButtons(
  root: Element | Document = document,
): CheckResult<LinkButtonItem> {
  const items: LinkButtonItem[] = [];
  const issues: CheckIssue[] = [];

  // Track link text -> hrefs for duplicate detection
  const linkTextToHrefs = new Map<string, Set<string>>();

  for (const el of root.querySelectorAll(LINK_BUTTON_SELECTOR)) {
    if (isInsideSidebar(el)) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;

    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    const href = el.getAttribute("href");
    const component = getReactComponentName(el);
    const inComponent = component ? ` (in ${component})` : "";

    const info = computeAccessibleInfo(el);
    const name = info.name.trim();

    const hasIssue = !name || GENERIC_NAMES.has(name.toLowerCase());

    items.push({
      element: el,
      tag,
      role,
      accessibleName: name,
      href,
      component,
      hasIssue,
    });

    if (!name) {
      issues.push({
        type: "empty-name",
        severity: "error",
        wcag: "2.4.4",
        wcagLevel: "A",
        message: `<${tag}> has no accessible name${inComponent}`,
        fix: "Add text content, aria-label, or aria-labelledby",
        element: el,
      });
    } else if (GENERIC_NAMES.has(name.toLowerCase())) {
      issues.push({
        type: "generic-name",
        severity: "warning",
        wcag: "2.4.4",
        wcagLevel: "A",
        message: `<${tag}> has generic name "${name}"${inComponent}`,
        fix: "Use descriptive text that conveys the purpose",
        element: el,
      });
    }

    // Track for duplicate detection (links only)
    if (href && name) {
      const key = name.toLowerCase();
      if (!linkTextToHrefs.has(key)) {
        linkTextToHrefs.set(key, new Set());
      }
      linkTextToHrefs.get(key)?.add(href);
    }
  }

  // Flag duplicate link text pointing to different destinations
  for (const [name, hrefs] of linkTextToHrefs) {
    if (hrefs.size > 1) {
      issues.push({
        type: "duplicate-link-text",
        severity: "warning",
        wcag: "2.4.4",
        wcagLevel: "A",
        message: `"${name}" links to ${hrefs.size} different destinations`,
        fix: "Differentiate link text so users can distinguish destinations",
      });
    }
  }

  return { items, issues };
}
