/**
 * Contrast Overlay toggle.
 *
 * Shows contrast ratio badges on text elements in the page.
 * Color-coded: green (passes AA+AAA), yellow (AA only), red (fails AA).
 * Badges reposition on scroll, resize, and layout changes via the
 * shared reposition manager.
 */

import { computeContrast, formatRatio } from "../utils/contrast";
import { isInsideSidebar } from "../utils/focus-stream";
import { onReposition } from "./reposition";

const BADGE_CLASS = "a11y-contrast-overlay-badge";
let active = false;
let overlayBadges: Array<{ badge: HTMLElement; element: Element }> = [];
let unregisterReposition: (() => void) | null = null;
let domObserver: MutationObserver | null = null;

function updatePositions() {
  for (const { badge, element } of overlayBadges) {
    const rect = element.getBoundingClientRect();
    badge.style.top = `${rect.top}px`;
    badge.style.left = `${rect.right + 2}px`;
  }
}

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
        ? "#15803d"
        : result.passesAA
          ? "#a16207"
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
      overlayBadges.push({ badge, element: el });
    }
    node = walker.nextNode();
  }

  unregisterReposition = onReposition(updatePositions);

  domObserver = new MutationObserver((mutations) => {
    // Ignore mutations from our own badge elements
    const isOwnMutation = mutations.every((m) =>
      [...m.addedNodes, ...m.removedNodes].every(
        (n) =>
          n instanceof HTMLElement &&
          n.getAttribute("data-a11y-debug") === "contrast-badge",
      ),
    );
    if (isOwnMutation) return;
    if (active) {
      domObserver?.disconnect();
      createBadges();
    }
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
}

function removeBadges() {
  domObserver?.disconnect();
  domObserver = null;
  unregisterReposition?.();
  unregisterReposition = null;
  for (const { badge } of overlayBadges) {
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
