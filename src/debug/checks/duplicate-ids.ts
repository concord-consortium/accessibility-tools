import { getReactComponentName, isInsideSidebar } from "../utils";
import type { CheckIssue, CheckResult } from "./types";

export interface DuplicateIdGroup {
  id: string;
  elements: Array<{
    tag: string;
    component: string | null;
    element: Element;
  }>;
  ariaRefs: string[];
}

function findAriaReferences(id: string, root: Element | Document): string[] {
  const refs: string[] = [];
  const selectors = [
    `[aria-labelledby~="${id}"]`,
    `[aria-describedby~="${id}"]`,
    `[aria-controls~="${id}"]`,
    `[aria-owns~="${id}"]`,
    `label[for="${id}"]`,
  ];
  for (const selector of selectors) {
    try {
      if (root.querySelector(selector)) {
        const attr = selector.match(/\[([a-z-]+)/)?.[1] || selector;
        refs.push(attr);
      }
    } catch {
      // invalid selector, skip
    }
  }
  return refs;
}

export function scanDuplicateIds(
  root: Element | Document = document,
): CheckResult<DuplicateIdGroup> {
  const idMap = new Map<string, Element[]>();

  for (const el of root.querySelectorAll("[id]")) {
    if (isInsideSidebar(el)) continue;
    const id = el.id;
    if (!id) continue;

    const existing = idMap.get(id);
    if (existing) {
      existing.push(el);
    } else {
      idMap.set(id, [el]);
    }
  }

  const items: DuplicateIdGroup[] = [];
  const issues: CheckIssue[] = [];

  for (const [id, elements] of idMap) {
    if (elements.length > 1) {
      const ariaRefs = findAriaReferences(id, root);
      items.push({
        id,
        elements: elements.map((el) => ({
          tag: el.tagName.toLowerCase(),
          component: getReactComponentName(el),
          element: el,
        })),
        ariaRefs,
      });
      const components = elements
        .map((el) => getReactComponentName(el))
        .filter(Boolean);
      const inComponents =
        components.length > 0
          ? ` (in ${[...new Set(components)].join(", ")})`
          : "";
      issues.push({
        type: "duplicate-id",
        severity: "error",
        wcag: "1.3.1",
        message: `Duplicate id="${id}" - ${elements.length} elements share this ID${inComponents}`,
        fix: `Make each id attribute unique, e.g., "${id}-1", "${id}-2"`,
        element: elements[0],
      });
    }
  }

  return { items, issues };
}
