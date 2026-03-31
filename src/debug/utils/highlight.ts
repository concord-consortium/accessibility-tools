/**
 * Element highlight overlay utility.
 *
 * Draws a colored outline around a DOM element by positioning an absolutely
 * placed overlay div on top of it. Used by Focus Tracker, Contrast Checker,
 * Focus Loss Detector, and various overlays.
 *
 * The overlay has data-a11y-debug attribute so isInsideSidebar() excludes
 * it from DOM scans.
 */

const HIGHLIGHT_ID = "a11y-debug-highlight";

function findScrollParent(element: Element): Element | null {
  let current = element.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    if (
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowX === "auto" ||
      style.overflowX === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll"
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

let activeHighlight: HTMLElement | null = null;
let activeElementRef: WeakRef<Element> | null = null;
let scrollListenerActive = false;
let rafPending = false;

/**
 * Check if an element is currently highlighted.
 */
export function isHighlighted(element: Element): boolean {
  return (
    activeElementRef?.deref() === element &&
    activeHighlight?.style.display === "block"
  );
}

function updatePosition(): void {
  const el = activeElementRef?.deref();
  if (!el || !activeHighlight || activeHighlight.style.display === "none") {
    return;
  }
  const rect = el.getBoundingClientRect();
  activeHighlight.style.top = `${rect.top}px`;
  activeHighlight.style.left = `${rect.left}px`;
  activeHighlight.style.width = `${rect.width}px`;
  activeHighlight.style.height = `${rect.height}px`;
}

function handleScroll(): void {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    updatePosition();
  });
}

function startScrollListener(): void {
  if (scrollListenerActive) return;
  // Capture phase to catch scroll on any container
  document.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleScroll);
  scrollListenerActive = true;
}

function stopScrollListener(): void {
  if (!scrollListenerActive) return;
  document.removeEventListener("scroll", handleScroll, true);
  window.removeEventListener("resize", handleScroll);
  scrollListenerActive = false;
}

function getOrCreateOverlay(): HTMLElement {
  let overlay = document.getElementById(HIGHLIGHT_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = HIGHLIGHT_ID;
    overlay.setAttribute("data-a11y-debug", "highlight");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      border: 2px solid #2563eb;
      border-radius: 2px;
      background: rgba(37, 99, 235, 0.08);
      transition: all 0.15s ease;
      display: none;
    `;
    document.body.appendChild(overlay);
  }
  return overlay;
}

/**
 * Highlight a DOM element with a colored overlay outline.
 * Only one element can be highlighted at a time.
 */
export function highlightElement(
  element: Element,
  options?: {
    color?: string;
  },
): void {
  const overlay = getOrCreateOverlay();
  const rect = element.getBoundingClientRect();

  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = "block";

  if (options?.color) {
    overlay.style.borderColor = options.color;
    overlay.style.background = "transparent";
  } else {
    overlay.style.borderColor = "#2563eb";
    overlay.style.background = "rgba(37, 99, 235, 0.08)";
  }

  activeHighlight = overlay;
  activeElementRef = new WeakRef(element);
  startScrollListener();
}

/**
 * Remove the current highlight overlay.
 */
export function removeHighlight(): void {
  if (activeHighlight) {
    activeHighlight.style.display = "none";
  }
  activeHighlight = null;
  activeElementRef = null;
  stopScrollListener();
}

/**
 * Update the highlight position for the currently highlighted element.
 * Call on scroll/resize. If an element is provided, updates for that
 * element instead. No-op if nothing is highlighted.
 */
export function updateHighlightPosition(element?: Element): void {
  const target = element ?? activeElementRef?.deref() ?? null;
  if (!activeHighlight || !target || activeHighlight.style.display === "none") {
    return;
  }
  const rect = target.getBoundingClientRect();
  activeHighlight.style.top = `${rect.top}px`;
  activeHighlight.style.left = `${rect.left}px`;
  activeHighlight.style.width = `${rect.width}px`;
  activeHighlight.style.height = `${rect.height}px`;
}

/**
 * Scroll to an element in the page and highlight it.
 * Useful for panels that list elements - click a row to jump to it.
 */
export function scrollToAndHighlight(
  element: Element,
  options?: { color?: string },
): void {
  // Toggle off if clicking the same element
  if (
    activeElementRef?.deref() === element &&
    activeHighlight?.style.display === "block"
  ) {
    removeHighlight();
    return;
  }
  // Find the scrollable container (the element with overflow: auto)
  const scrollParent = findScrollParent(element);
  if (scrollParent) {
    const rect = element.getBoundingClientRect();
    const containerRect = scrollParent.getBoundingClientRect();
    const padding = 60;

    if (rect.top < containerRect.top + padding) {
      // Element is above or pinned to top - scroll up with padding
      scrollParent.scrollBy({
        top: rect.top - containerRect.top - padding,
        behavior: "smooth",
      });
    } else if (rect.bottom > containerRect.bottom - padding) {
      // Element is below or pinned to bottom - scroll down with padding
      scrollParent.scrollBy({
        top: rect.bottom - containerRect.bottom + padding,
        behavior: "smooth",
      });
    }
  } else {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  highlightElement(element, options);
}

/**
 * Fully remove the highlight overlay from the DOM and reset state.
 * Call when the debug tool is unmounted.
 */
export function destroyHighlight(): void {
  const overlay = document.getElementById(HIGHLIGHT_ID);
  if (overlay) {
    overlay.remove();
  }
  activeHighlight = null;
  activeElementRef = null;
  stopScrollListener();
}
