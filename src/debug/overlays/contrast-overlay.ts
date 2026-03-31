/**
 * Contrast Overlay toggle.
 *
 * Shows contrast ratio badges on text elements in the page.
 * Color-coded: green (passes AA+AAA), yellow (AA only), red (fails AA).
 */

import { computeContrast, formatRatio } from "../utils/contrast";
import { isInsideSidebar } from "../utils/focus-stream";

const BADGE_CLASS = "a11y-contrast-overlay-badge";
let active = false;
let overlayBadges: HTMLElement[] = [];

function createBadges() {
  removeBadges();

  const walker = document.createTreeWalker(
    document.body,
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
      if (style.display === "none" || style.visibility === "hidden") {
        node = walker.nextNode();
        continue;
      }

      const result = computeContrast(el);
      if (!result.canCompute) {
        node = walker.nextNode();
        continue;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        node = walker.nextNode();
        continue;
      }

      const color = result.passesAAA
        ? "#16a34a"
        : result.passesAA
          ? "#ca8a04"
          : "#dc2626";

      const badge = document.createElement("div");
      badge.className = BADGE_CLASS;
      badge.setAttribute("data-a11y-debug", "contrast-badge");
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = formatRatio(result.ratio);
      badge.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.right + 2}px;
        background: ${color};
        color: white;
        font-size: 9px;
        font-weight: 700;
        padding: 1px 3px;
        border-radius: 2px;
        z-index: 999998;
        pointer-events: none;
        font-family: system-ui, sans-serif;
        white-space: nowrap;
      `;
      document.body.appendChild(badge);
      overlayBadges.push(badge);
    }
    node = walker.nextNode();
  }
}

function removeBadges() {
  for (const badge of overlayBadges) {
    badge.remove();
  }
  overlayBadges = [];
}

export function toggleContrastOverlay(): boolean {
  active = !active;
  if (active) {
    createBadges();
  } else {
    removeBadges();
  }
  return active;
}
