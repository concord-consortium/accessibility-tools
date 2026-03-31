import { getReactComponentName, isInsideSidebar } from "../utils";
import type { CheckIssue, CheckResult } from "./types";

export interface AriaIssueItem {
  element: Element;
  rule: string;
  component: string | null;
}

// Valid WAI-ARIA roles (subset covering common usage)
const VALID_ROLES = new Set([
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "button",
  "cell",
  "checkbox",
  "columnheader",
  "combobox",
  "command",
  "complementary",
  "composite",
  "contentinfo",
  "definition",
  "dialog",
  "directory",
  "document",
  "feed",
  "figure",
  "form",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "input",
  "landmark",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "meter",
  "navigation",
  "none",
  "note",
  "option",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "range",
  "region",
  "roletype",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "section",
  "sectionhead",
  "select",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem",
  "widget",
  "window",
]);

// Roles that can have aria-checked
const CHECKABLE_ROLES = new Set([
  "checkbox",
  "menuitemcheckbox",
  "option",
  "radio",
  "menuitemradio",
  "switch",
  "treeitem",
]);

// Roles that can have aria-selected
const SELECTABLE_ROLES = new Set([
  "gridcell",
  "option",
  "row",
  "tab",
  "treeitem",
]);

// Roles that can have aria-expanded
const EXPANDABLE_ROLES = new Set([
  "button",
  "combobox",
  "gridcell",
  "link",
  "listbox",
  "menuitem",
  "row",
  "tab",
  "treeitem",
  "application",
]);

export function scanAriaValidation(
  root: Element | Document = document,
): CheckResult<AriaIssueItem> {
  const items: AriaIssueItem[] = [];
  const issues: CheckIssue[] = [];

  const allElements =
    root instanceof Document
      ? root.body.querySelectorAll("*")
      : root.querySelectorAll("*");

  for (const el of allElements) {
    if (isInsideSidebar(el)) continue;

    const component = getReactComponentName(el);
    const inComponent = component ? ` (in ${component})` : "";
    const tag = el.tagName.toLowerCase();

    // 1. Invalid role value
    const role = el.getAttribute("role");
    if (role && !VALID_ROLES.has(role)) {
      items.push({ element: el, rule: "invalid-role", component });
      issues.push({
        type: "invalid-role",
        severity: "error",
        wcag: "4.1.2",
        wcagLevel: "A",
        message: `Invalid role="${role}"${inComponent}`,
        fix: "Use a valid WAI-ARIA role. See https://www.w3.org/TR/wai-aria/#role_definitions",
        element: el,
      });
    }

    // 2. aria-labelledby/describedby pointing to non-existent id
    for (const attr of ["aria-labelledby", "aria-describedby"]) {
      const ids = el.getAttribute(attr);
      if (!ids) continue;
      for (const id of ids.split(/\s+/)) {
        if (id && !document.getElementById(id)) {
          items.push({
            element: el,
            rule: `${attr}-missing-id`,
            component,
          });
          issues.push({
            type: `${attr}-missing-id`,
            severity: "error",
            wcag: "1.3.1",
            wcagLevel: "A",
            message: `${attr} references non-existent id "${id}"${inComponent}`,
            fix: `Ensure element with id="${id}" exists in the DOM`,
            element: el,
          });
        }
      }
    }

    // 3. aria-hidden on focusable element
    if (el.getAttribute("aria-hidden") === "true") {
      const tabindex = el.getAttribute("tabindex");
      const isFocusable =
        (tabindex !== null && Number(tabindex) >= 0) ||
        (tag === "a" && el.hasAttribute("href")) ||
        tag === "button" ||
        tag === "input" ||
        tag === "select" ||
        tag === "textarea";

      if (isFocusable) {
        items.push({
          element: el,
          rule: "aria-hidden-focusable",
          component,
        });
        issues.push({
          type: "aria-hidden-focusable",
          severity: "error",
          wcag: "4.1.2",
          wcagLevel: "A",
          message: `aria-hidden="true" on focusable <${tag}>${inComponent}`,
          fix: 'Remove aria-hidden or add tabindex="-1" to prevent focus',
          element: el,
        });
      }
    }

    // 4. aria-checked on non-checkable role
    if (el.hasAttribute("aria-checked")) {
      const effectiveRole = role ?? tag;
      if (!CHECKABLE_ROLES.has(effectiveRole)) {
        items.push({
          element: el,
          rule: "aria-checked-invalid",
          component,
        });
        issues.push({
          type: "aria-checked-invalid",
          severity: "warning",
          wcag: "4.1.2",
          wcagLevel: "A",
          message: `aria-checked on <${tag}${role ? ` role="${role}"` : ""}> is not valid${inComponent}`,
          fix: "Only use aria-checked on checkbox, radio, switch, menuitemcheckbox, or menuitemradio",
          element: el,
        });
      }
    }

    // 5. aria-selected on non-selectable role
    if (el.hasAttribute("aria-selected")) {
      const effectiveRole = role ?? tag;
      if (!SELECTABLE_ROLES.has(effectiveRole)) {
        items.push({
          element: el,
          rule: "aria-selected-invalid",
          component,
        });
        issues.push({
          type: "aria-selected-invalid",
          severity: "warning",
          wcag: "4.1.2",
          wcagLevel: "A",
          message: `aria-selected on <${tag}${role ? ` role="${role}"` : ""}> is not valid${inComponent}`,
          fix: "Only use aria-selected on gridcell, option, row, tab, or treeitem",
          element: el,
        });
      }
    }

    // 6. Nested interactive elements
    if (
      (tag === "a" && el.hasAttribute("href")) ||
      tag === "button" ||
      role === "button" ||
      role === "link"
    ) {
      const nested = el.querySelectorAll(
        "a[href], button, [role=button], [role=link]",
      );
      if (nested.length > 0) {
        items.push({
          element: el,
          rule: "nested-interactive",
          component,
        });
        issues.push({
          type: "nested-interactive",
          severity: "error",
          wcag: "4.1.2",
          wcagLevel: "A",
          message: `Nested interactive element inside <${tag}>${inComponent}`,
          fix: "Remove nested interactive elements - screen readers cannot navigate them",
          element: el,
        });
      }
    }

    // 7. aria-label on non-interactive element without role
    if (el.getAttribute("aria-label") && !role) {
      const isInteractive =
        tag === "a" ||
        tag === "button" ||
        tag === "input" ||
        tag === "select" ||
        tag === "textarea" ||
        tag === "img" ||
        tag === "svg" ||
        el.hasAttribute("tabindex");
      const isLandmark =
        tag === "nav" ||
        tag === "main" ||
        tag === "aside" ||
        tag === "header" ||
        tag === "footer" ||
        tag === "section" ||
        tag === "form";

      if (!isInteractive && !isLandmark) {
        items.push({
          element: el,
          rule: "aria-label-no-role",
          component,
        });
        issues.push({
          type: "aria-label-no-role",
          severity: "warning",
          wcag: "4.1.2",
          wcagLevel: "A",
          message: `aria-label on non-interactive <${tag}> without role${inComponent}`,
          fix: "Add an appropriate role or move aria-label to an interactive element",
          element: el,
        });
      }
    }
  }

  return { items, issues };
}
