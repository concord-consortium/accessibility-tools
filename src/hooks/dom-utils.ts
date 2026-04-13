/**
 * DOM utilities for focus management.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Returns all visible, focusable elements within a container, in DOM order.
 * Handles SVG elements (which may fail checkVisibility) via bounding rect fallback.
 */
export function getVisibleFocusables(
  container: HTMLElement | Element,
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    // SVG elements fail checkVisibility (no own rendering box) — use bounding rect instead
    if (el instanceof SVGElement) {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    }
    // checkVisibility is the modern API
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility();
    }
    // Fall back to bounding rect; in jsdom all rects are zero,
    // so also check if the element is connected to the DOM
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) return true;
    return el.isConnected;
  });
}
