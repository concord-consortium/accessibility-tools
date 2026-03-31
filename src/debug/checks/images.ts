import { getReactComponentName, isInsideSidebar } from "../utils";
import type { CheckIssue, CheckResult } from "./types";

export interface ImageItem {
  element: Element;
  src: string;
  alt: string | null;
  status: "has-alt" | "decorative" | "missing" | "generic" | "long-alt";
  component: string | null;
}

const GENERIC_ALT =
  /^(image|photo|icon|picture|graphic|img|logo|banner|thumbnail)$/i;

export function scanImages(
  root: Element | Document = document,
): CheckResult<ImageItem> {
  const items: ImageItem[] = [];
  const issues: CheckIssue[] = [];

  for (const el of root.querySelectorAll("img")) {
    if (isInsideSidebar(el)) continue;

    const src = el.getAttribute("src") || "";
    const alt = el.getAttribute("alt");
    const ariaLabel = el.getAttribute("aria-label");
    const ariaHidden = el.getAttribute("aria-hidden") === "true";
    const component = getReactComponentName(el);
    const inComponent = component ? ` (in ${component})` : "";

    let status: ImageItem["status"];

    if (ariaHidden || alt === "") {
      status = "decorative";
    } else if (alt === null && !ariaLabel) {
      status = "missing";
      issues.push({
        type: "img-no-alt",
        severity: "error",
        wcag: "1.1.1",
        wcagLevel: "A",
        message: `<img> has no alt text${inComponent}`,
        fix: 'Add alt="description" or alt="" if decorative',
        element: el,
      });
    } else if (alt && GENERIC_ALT.test(alt.trim())) {
      status = "generic";
      issues.push({
        type: "img-generic-alt",
        severity: "warning",
        wcag: "1.1.1",
        wcagLevel: "A",
        message: `<img> has generic alt text "${alt}"${inComponent}`,
        fix: "Use descriptive alt text that conveys the image content",
        element: el,
      });
    } else if (alt && alt.length > 125) {
      status = "long-alt";
      issues.push({
        type: "img-long-alt",
        severity: "warning",
        wcag: "1.1.1",
        wcagLevel: "A",
        message: `<img> alt text is ${alt.length} chars (max 125 recommended)${inComponent}`,
        fix: "Move long descriptions to aria-describedby",
        element: el,
      });
    } else {
      status = "has-alt";
    }

    items.push({ element: el, src, alt: alt ?? ariaLabel, status, component });
  }

  // Scan <svg role="img"> without accessible name
  for (const el of root.querySelectorAll('svg[role="img"]')) {
    if (isInsideSidebar(el)) continue;
    const ariaLabel = el.getAttribute("aria-label");
    const ariaLabelledBy = el.getAttribute("aria-labelledby");
    const title = el.querySelector("title");
    const component = getReactComponentName(el);
    const inComponent = component ? ` (in ${component})` : "";

    if (!ariaLabel && !ariaLabelledBy && !title?.textContent?.trim()) {
      items.push({
        element: el,
        src: "svg",
        alt: null,
        status: "missing",
        component,
      });
      issues.push({
        type: "svg-no-label",
        severity: "error",
        wcag: "1.1.1",
        wcagLevel: "A",
        message: `<svg role="img"> has no accessible name${inComponent}`,
        fix: "Add aria-label or a <title> element inside the SVG",
        element: el,
      });
    } else {
      items.push({
        element: el,
        src: "svg",
        alt: ariaLabel ?? title?.textContent?.trim() ?? null,
        status: "has-alt",
        component,
      });
    }
  }

  return { items, issues };
}
