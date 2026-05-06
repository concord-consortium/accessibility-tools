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
    // The selector above matches native focusables (button, input, etc.)
    // regardless of tabindex, so explicitly exclude any negative tabindex —
    // those elements are programmatically focusable but not in the Tab cycle.
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null && Number.parseInt(tabindex, 10) < 0) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    // SVG elements fail checkVisibility (no own rendering box) — use bounding rect instead
    if (el instanceof SVGElement) {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    }
    // checkVisibility is the modern API. Pass checkOpacity and checkVisibilityCSS
    // so elements hidden via `visibility: hidden` or `opacity: 0` (e.g. Chakra's
    // closed menus) are correctly filtered out.
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    }
    // Fall back to bounding rect; in jsdom all rects are zero,
    // so also check if the element is connected to the DOM
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) return true;
    return el.isConnected;
  });
}

/**
 * Find the index of `activeEl` in `focusables`. If `activeEl` is itself not in
 * the list (e.g. it has tabindex="-1" inside a composite widget) but is a
 * descendant of one of the focusables, return that ancestor's index. This lets
 * Tab from a control inside a composite widget continue from the widget's slot.
 */
export function findFocusableIndex(
  focusables: HTMLElement[],
  activeEl: Element | null,
): number {
  if (!activeEl) return -1;
  const direct = focusables.indexOf(activeEl as HTMLElement);
  if (direct !== -1) return direct;
  for (let i = 0; i < focusables.length; i++) {
    if (focusables[i].contains(activeEl)) return i;
  }
  return -1;
}

/**
 * Pick the element to focus when entering a slot programmatically. Prefers a
 * roving-tabindex target (tabindex="0") if present, then falls back to the
 * first/last visible focusable, then to any interactive descendant — even ones
 * with tabindex="-1", which are still programmatically focusable.
 */
export function pickSlotEntryTarget(
  slotEl: HTMLElement,
  reverse: boolean,
): HTMLElement | null {
  const focusables = getVisibleFocusables(slotEl);
  const rovingTarget = focusables.find(
    (el) => el.getAttribute("tabindex") === "0",
  );
  if (rovingTarget) return rovingTarget;
  if (focusables.length > 0) {
    return reverse ? focusables[focusables.length - 1] : focusables[0];
  }
  // Nothing in the Tab cycle — but the slot may still hold interactive
  // elements with tabindex="-1" (e.g. a toolbar mid-cycle, or composite-widget
  // descendants). Programmatic focus works on those, so prefer them over
  // letting the slot fail silently.
  const fallback = slotEl.querySelector<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [role="button"]',
  );
  return fallback;
}
