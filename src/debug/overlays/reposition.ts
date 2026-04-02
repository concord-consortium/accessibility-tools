/**
 * Shared scroll/resize reposition manager for overlays.
 *
 * A single capture-phase scroll listener and resize listener that
 * calls all registered reposition callbacks. Overlays register their
 * element-to-badge pairs and get automatic repositioning on scroll,
 * resize, and layout changes.
 *
 * Uses requestAnimationFrame throttling to avoid layout thrashing.
 */

type RepositionCallback = () => void;

const callbacks = new Set<RepositionCallback>();
let listening = false;
let rafPending = false;

function handleEvent() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    for (const cb of callbacks) {
      cb();
    }
  });
}

function startListening() {
  if (listening) return;
  document.addEventListener("scroll", handleEvent, true);
  window.addEventListener("resize", handleEvent);
  listening = true;
}

function stopListening() {
  if (!listening) return;
  document.removeEventListener("scroll", handleEvent, true);
  window.removeEventListener("resize", handleEvent);
  listening = false;
  rafPending = false;
}

/**
 * Manually trigger all reposition callbacks.
 * Call after layout-changing operations like overlay toggles.
 */
export function triggerReposition() {
  handleEvent();
}

/**
 * Register a reposition callback. Returns an unregister function.
 * Automatically starts/stops the shared listeners based on
 * whether any callbacks are registered.
 */
export function onReposition(callback: RepositionCallback): () => void {
  callbacks.add(callback);
  if (callbacks.size === 1) startListening();

  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) stopListening();
  };
}
