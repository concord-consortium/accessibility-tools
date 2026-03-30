/**
 * Shared focus event stream with sidebar self-exclusion.
 *
 * Listens to `focusin` events on the document and dispatches to subscribers.
 * Filters out focus events targeting elements inside the sidebar's root
 * container to avoid noise and infinite recursion.
 *
 * Used by: Live Focus Tracker, Focus Loss Detector, Focus History Log,
 * Focus Trap Detector, Focus Order Recorder.
 */

export interface A11yFocusEvent {
  element: Element;
  previousElement: Element | null;
  timestamp: number;
}

type FocusSubscriber = (event: A11yFocusEvent) => void;

let sidebarRoot: Element | null = null;
let subscribers: FocusSubscriber[] = [];
let previousElementRef: WeakRef<Element> | null = null;
let listening = false;
let selfExclusionDisableCount = 0;

function handleFocusIn(e: globalThis.FocusEvent): void {
  const target = e.target;
  if (!(target instanceof Element)) return;

  // Self-exclusion: skip focus events inside the sidebar
  if (selfExclusionDisableCount === 0 && sidebarRoot?.contains(target)) {
    return;
  }

  const previousElement = previousElementRef?.deref() ?? null;

  const event: A11yFocusEvent = {
    element: target,
    previousElement,
    timestamp: Date.now(),
  };

  previousElementRef = new WeakRef(target);

  // Snapshot to protect against mutation during dispatch
  const snapshot = [...subscribers];
  for (const subscriber of snapshot) {
    subscriber(event);
  }
}

/**
 * Set the sidebar root element for self-exclusion filtering.
 * Call this when the sidebar mounts.
 */
export function setSidebarRoot(element: Element | null): void {
  sidebarRoot = element;
}

/**
 * Run a function with self-exclusion temporarily disabled.
 * Guarantees re-enable even if the function throws.
 * Used by the "Audit Sidebar" button.
 */
export function withSelfExclusionDisabled<T>(fn: () => T): T {
  selfExclusionDisableCount++;
  try {
    return fn();
  } finally {
    selfExclusionDisableCount--;
  }
}

/**
 * Async version of withSelfExclusionDisabled.
 */
export async function withSelfExclusionDisabledAsync<T>(
  fn: () => Promise<T>,
): Promise<T> {
  selfExclusionDisableCount++;
  try {
    return await fn();
  } finally {
    selfExclusionDisableCount--;
  }
}

/**
 * Subscribe to focus events. Returns an unsubscribe function.
 * Automatically starts listening when the first subscriber is added.
 */
export function subscribeFocus(callback: FocusSubscriber): () => void {
  subscribers.push(callback);

  if (!listening) {
    document.addEventListener("focusin", handleFocusIn, true);
    listening = true;
  }

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    subscribers = subscribers.filter((s) => s !== callback);
    if (subscribers.length === 0 && listening) {
      document.removeEventListener("focusin", handleFocusIn, true);
      listening = false;
      previousElementRef = null;
    }
  };
}

/**
 * Check if an element is inside the sidebar (for use by panels
 * that do their own DOM scanning rather than using the focus stream).
 * Also checks for the data-a11y-debug attribute used by overlay elements.
 */
export function isInsideSidebar(element: Element): boolean {
  if (selfExclusionDisableCount > 0) return false;
  if (element.closest("[data-a11y-debug]")) return true;
  if (sidebarRoot?.contains(element)) return true;
  return false;
}
