import { getReactComponentName, isInsideSidebar } from "../utils";
import type { CheckIssue, CheckResult } from "./types";

export interface FormControlItem {
  tag: string;
  type: string;
  label: string | null;
  labelMethod:
    | "for-id"
    | "wrapping"
    | "aria-label"
    | "aria-labelledby"
    | "placeholder-only"
    | "none";
  component: string | null;
  element: Element;
  hasIssue: boolean;
}

function getLabelInfo(
  el: Element,
): Pick<FormControlItem, "label" | "labelMethod"> {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) {
    return { label: ariaLabel, labelMethod: "aria-label" };
  }

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const ownerDoc = el.ownerDocument;
    const text = labelledBy
      .split(/\s+/)
      .map((id) => ownerDoc.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(" ");
    if (text) {
      return { label: text, labelMethod: "aria-labelledby" };
    }
  }

  const id = el.id;
  if (id) {
    const ownerDoc = el.ownerDocument;
    const label = ownerDoc.querySelector(`label[for="${id}"]`);
    if (label) {
      return {
        label: label.textContent?.trim() || null,
        labelMethod: "for-id",
      };
    }
  }

  const parent = el.closest("label");
  if (parent) {
    const clone = parent.cloneNode(true) as HTMLElement;
    for (const input of clone.querySelectorAll("input, select, textarea")) {
      input.remove();
    }
    const text = clone.textContent?.trim() || null;
    if (text) {
      return { label: text, labelMethod: "wrapping" };
    }
  }

  const placeholder = el.getAttribute("placeholder");
  if (placeholder) {
    return { label: placeholder, labelMethod: "placeholder-only" };
  }

  return { label: null, labelMethod: "none" };
}

export function scanFormControls(
  root: Element | Document = document,
): CheckResult<FormControlItem> {
  const items: FormControlItem[] = [];
  const issues: CheckIssue[] = [];

  for (const el of root.querySelectorAll("input, select, textarea")) {
    if (isInsideSidebar(el)) continue;

    const tag = el.tagName.toLowerCase();
    const type = tag === "input" ? el.getAttribute("type") || "text" : tag;

    // Hidden, submit, and button inputs don't need labels
    if (type === "hidden" || type === "submit" || type === "button") continue;
    const { label, labelMethod } = getLabelInfo(el);
    const hasIssue =
      labelMethod === "none" || labelMethod === "placeholder-only";

    const component = getReactComponentName(el);
    const inComponent = component ? ` (in ${component})` : "";

    items.push({
      tag,
      type,
      label,
      labelMethod,
      component,
      element: el,
      hasIssue,
    });

    if (labelMethod === "none") {
      issues.push({
        type: "no-label",
        severity: "error",
        wcag: "3.3.2",
        message: `<${tag} type="${type}"> has no accessible label${inComponent}`,
        fix: `Add a <label> element with for="${el.id || "..."}" or wrap the input in a <label>, or add aria-label`,
        element: el,
      });
    } else if (labelMethod === "placeholder-only") {
      issues.push({
        type: "placeholder-only",
        severity: "warning",
        wcag: "3.3.2",
        message: `<${tag} type="${type}"> uses placeholder as only label${inComponent}`,
        fix: "Add a proper <label> - placeholder disappears on focus and is not a substitute",
        element: el,
      });
    }
  }

  return { items, issues };
}
