/**
 * Accessible name computation utility.
 *
 * Wraps dom-accessibility-api to compute accessible names and roles
 * following the WAI-ARIA accessible name computation spec.
 * Used by Screen Reader Text Preview, Link & Button Audit, and
 * WCAG Audit Report.
 */

import {
  computeAccessibleDescription,
  computeAccessibleName,
} from "dom-accessibility-api";

export interface AccessibleInfo {
  name: string;
  description: string;
  role: string | null;
  states: string[];
}

/**
 * Get the effective ARIA role of an element.
 * Checks explicit role attribute first, then falls back to implicit roles.
 */
export function getEffectiveRole(el: Element): string | null {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;

  const tag = el.tagName.toLowerCase();
  const implicitRoles: Record<
    string,
    string | ((e: Element) => string | null)
  > = {
    a: (e) => (e.hasAttribute("href") ? "link" : null),
    article: "article",
    aside: "complementary",
    button: "button",
    datalist: "listbox",
    details: "group",
    dialog: "dialog",
    fieldset: "group",
    figure: "figure",
    footer: "contentinfo",
    form: "form",
    h1: "heading",
    h2: "heading",
    h3: "heading",
    h4: "heading",
    h5: "heading",
    h6: "heading",
    header: "banner",
    hr: "separator",
    img: (e) => (e.getAttribute("alt") === "" ? "presentation" : "img"),
    input: (e) => {
      const type = e.getAttribute("type") || "text";
      const typeRoles: Record<string, string> = {
        checkbox: "checkbox",
        radio: "radio",
        range: "slider",
        search: "searchbox",
        text: "textbox",
        email: "textbox",
        tel: "textbox",
        url: "textbox",
        number: "spinbutton",
      };
      return typeRoles[type] ?? "textbox";
    },
    li: "listitem",
    main: "main",
    meter: "meter",
    nav: "navigation",
    ol: "list",
    option: "option",
    output: "status",
    progress: "progressbar",
    section: "region",
    select: (e) => (e.hasAttribute("multiple") ? "listbox" : "combobox"),
    summary: "button",
    table: "table",
    tbody: "rowgroup",
    td: "cell",
    textarea: "textbox",
    tfoot: "rowgroup",
    th: "columnheader",
    thead: "rowgroup",
    tr: "row",
    ul: "list",
  };

  const mapping = implicitRoles[tag];
  if (!mapping) return null;
  if (typeof mapping === "function") return mapping(el);
  return mapping;
}

/**
 * Get ARIA states and properties that affect screen reader announcements.
 */
function getStates(el: Element): string[] {
  const states: string[] = [];

  if (el instanceof HTMLElement && el.hasAttribute("disabled")) {
    states.push("disabled");
  }
  if (el.getAttribute("aria-disabled") === "true") {
    states.push("disabled");
  }
  if (el.getAttribute("aria-expanded") === "true") {
    states.push("expanded");
  } else if (el.getAttribute("aria-expanded") === "false") {
    states.push("collapsed");
  }
  if (el.getAttribute("aria-pressed") === "true") {
    states.push("pressed");
  }
  if (el.getAttribute("aria-selected") === "true") {
    states.push("selected");
  }
  if (el.getAttribute("aria-checked") === "true") {
    states.push("checked");
  } else if (el.getAttribute("aria-checked") === "mixed") {
    states.push("mixed");
  }
  if (el.getAttribute("aria-required") === "true") {
    states.push("required");
  }
  if (el.getAttribute("aria-invalid") === "true") {
    states.push("invalid");
  }
  if (el.getAttribute("aria-readonly") === "true") {
    states.push("readonly");
  }
  if (el.getAttribute("aria-current")) {
    const val = el.getAttribute("aria-current");
    if (val && val !== "false") {
      states.push(`current: ${val}`);
    }
  }
  if (el.getAttribute("aria-hidden") === "true") {
    states.push("hidden");
  }

  return [...new Set(states)];
}

/**
 * Compute the full accessible info for an element.
 */
export function computeAccessibleInfo(el: Element): AccessibleInfo {
  let name = "";
  let description = "";

  try {
    name = computeAccessibleName(el);
  } catch {
    name = "";
  }

  try {
    description = computeAccessibleDescription(el);
  } catch {
    description = "";
  }

  return {
    name,
    description,
    role: getEffectiveRole(el),
    states: getStates(el),
  };
}

/**
 * Format accessible info as a screen reader would announce it.
 * e.g., '"Submit", button, disabled'
 */
export function formatAnnouncement(info: AccessibleInfo): string {
  const parts: string[] = [];
  if (info.name) parts.push(`"${info.name}"`);
  if (info.role) parts.push(info.role);
  if (info.states.length > 0) parts.push(info.states.join(", "));
  return parts.join(", ");
}
