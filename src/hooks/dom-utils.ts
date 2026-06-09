/**
 * DOM utilities for focus management.
 */

import type { FocusTrapStrategy } from "./types";

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
 * Returns true if `el` is currently rendered/visible. Handles aria-hidden,
 * SVG elements (which may fail checkVisibility), the modern checkVisibility
 * API (filters opacity:0 / visibility:hidden / display:none), and a
 * bounding-rect + connected fallback for environments without checkVisibility.
 */
function isVisible(el: HTMLElement): boolean {
  if (el.getAttribute("aria-hidden") === "true") return false;
  // SVG elements fail checkVisibility (no own rendering box) — use bounding rect instead
  if (el instanceof SVGElement) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }
  // checkVisibility is the modern API. Pass checkOpacity and checkVisibilityCSS
  // so elements hidden via `visibility: hidden` or `opacity: 0` are correctly
  // filtered out.
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
}

/**
 * Returns all visible, focusable elements within a container, in DOM order.
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
    return isVisible(el);
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
  // letting the slot fail silently. Use the same visibility filter as the
  // primary path to avoid focusing hidden elements.
  const candidates = Array.from(
    slotEl.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [contenteditable]:not([contenteditable="false"]), [tabindex="-1"]',
    ),
  ).filter(isVisible);
  if (candidates.length === 0) return null;
  return reverse ? candidates[candidates.length - 1] : candidates[0];
}

/**
 * Find the next/previous focusable element outside `container` in document tab
 * order. Used to "skip past" a focus-trap container when the trap is enabled
 * but not yet entered.
 *
 * Note on perf: this runs on every Tab keypress while the trap is enabled but
 * not entered. The container-descendant filter runs *before* `isVisible`, so
 * trap-internal focusables (often the bulk on a tile-heavy page) skip the
 * checkVisibility() call.
 */
/**
 * Returns the cycleOrder index of the slot containing `target` (the slot's
 * root element or any descendant), or the externals-slot index if `target`
 * lives in a portaled external element and the strategy declares
 * `externalElementsSlot`. Returns null when the target maps to no known slot.
 */
export function findSlotIndexFromFocus(
  target: HTMLElement,
  strategy: FocusTrapStrategy,
  cycleOrder: string[],
): number | null {
  const elements = strategy.getElements();
  for (let i = 0; i < cycleOrder.length; i++) {
    const slotEl = elements[cycleOrder[i]];
    if (slotEl && (slotEl === target || slotEl.contains(target))) {
      return i;
    }
  }
  const externals = strategy.getExternalElements?.() ?? [];
  if (externals.length === 0) return null;
  const externalsSlot = strategy.externalElementsSlot;
  if (!externalsSlot) return null;
  if (!externals.some((ext) => ext.contains(target))) return null;
  const externalsIdx = cycleOrder.indexOf(externalsSlot);
  return externalsIdx !== -1 ? externalsIdx : null;
}

/**
 * Find the next slot index (in `direction`) whose element is present in
 * `strategy.getElements()`. Wraps. Returns `fromIndex` if no other slot has
 * an element (e.g. the trap has only one populated slot).
 */
export function findNextSlot(
  fromIndex: number,
  direction: 1 | -1,
  cycleOrder: string[],
  strategy: FocusTrapStrategy,
): number {
  const elements = strategy.getElements();
  const len = cycleOrder.length;
  for (let i = 1; i <= len; i++) {
    const idx = (fromIndex + i * direction + len * len) % len;
    if (elements[cycleOrder[idx]]) return idx;
  }
  return fromIndex;
}

/**
 * Returns the root element of each "managed" slot — a slot with an entry in
 * `strategy.tabHandlers`. Managed slot elements + their descendants are
 * off-limits to the trap's tabindex machinery, since the slot has its own
 * focus management (e.g. roving tabindex) that the trap must not perturb.
 *
 * Caller pattern (loop-friendly): hoist this out of the per-element loop,
 * then check `managedSlotEls.some((s) => s.contains(el))`. `contains` returns
 * true when `s === el`, covering the "managed slot root itself" case.
 */
export function getManagedSlotElements(
  strategy: FocusTrapStrategy,
): HTMLElement[] {
  const elements = strategy.getElements();
  // Managed slots are those with a custom tabHandler (own roving tabindex) OR
  // those declared as nativeTabSlots (the iframe-slot, which has no tabHandler
  // but still must be off-limits to the tabindex sweep — §8). Set preserves
  // insertion order and de-dupes a slot listed in both.
  const names = new Set<string>([
    ...Object.keys(strategy.tabHandlers ?? {}),
    ...(strategy.nativeTabSlots ?? []),
  ]);
  const result: HTMLElement[] = [];
  for (const slotName of names) {
    const slotEl = elements[slotName];
    if (slotEl) result.push(slotEl);
  }
  return result;
}

/**
 * Per-direction intercept flags for an iframe-slot's sentinels (§4).
 *
 * A direction is "not intercepted" (sentinel stays tabindex=-1, native flow
 * passes straight through) ONLY when the directional neighbor in cycleOrder is
 * also a DOM-adjacent, enterable iframe-slot. Otherwise it is intercepted
 * (sentinel becomes tabindex=0 while focus is inside, so the trap redirects):
 *   - trap boundary (neighbor wraps to the other DOM side),
 *   - a non-iframe (normal) slot neighbor, or
 *   - a non-DOM-adjacent or non-enterable iframe neighbor.
 */
export function deriveIntercept(params: {
  slotName: string;
  cycleOrder: string[];
  getElements: () => Record<string, HTMLElement | undefined>;
  /** Slot names that are iframe-slots, with current enterable state. */
  iframeSlots: Record<string, { enterable: boolean } | undefined>;
}): { forward: boolean; reverse: boolean } {
  const { slotName, cycleOrder, getElements, iframeSlots } = params;
  const elements = getElements();
  const self = elements[slotName];

  const neighborFlows = (direction: 1 | -1): boolean => {
    if (!self) return false; // no element → safest is to intercept
    const fakeStrategy = { getElements } as FocusTrapStrategy;
    const fromIndex = cycleOrder.indexOf(slotName);
    if (fromIndex === -1) return false;
    const neighborIdx = findNextSlot(
      fromIndex,
      direction,
      cycleOrder,
      fakeStrategy,
    );
    const neighborName = cycleOrder[neighborIdx];
    if (neighborName === slotName) return false; // single-slot trap → intercept
    const neighbor = iframeSlots[neighborName];
    if (!neighbor || !neighbor.enterable) return false; // normal / locked
    const neighborEl = elements[neighborName];
    if (!neighborEl) return false;
    // DOM adjacency in the travel direction: forward neighbor must FOLLOW
    // self in DOM; reverse neighbor must PRECEDE it. A wrap-boundary neighbor
    // sits on the wrong DOM side and is therefore intercepted.
    const pos = self.compareDocumentPosition(neighborEl);
    const follows = (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    const precedes = (pos & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
    return direction === 1 ? follows : precedes;
  };

  return {
    forward: !neighborFlows(1),
    reverse: !neighborFlows(-1),
  };
}

export function findNextFocusableOutside(
  container: HTMLElement,
  reverse: boolean,
): HTMLElement | null {
  const all = Array.from(
    document.body.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => {
    if (container.contains(el) && el !== container) return false;
    const tabindex = el.getAttribute("tabindex");
    if (tabindex !== null && Number.parseInt(tabindex, 10) < 0) return false;
    return isVisible(el);
  });
  const idx = all.indexOf(container);
  if (idx === -1) {
    // Container isn't in the list (e.g. it has no tabindex). Pick the
    // direction-appropriate end so Shift+Tab moves backward and Tab forward.
    return reverse ? (all[all.length - 1] ?? null) : (all[0] ?? null);
  }
  if (reverse) {
    return all[idx - 1] ?? all[all.length - 1] ?? null;
  }
  return all[idx + 1] ?? all[0] ?? null;
}
