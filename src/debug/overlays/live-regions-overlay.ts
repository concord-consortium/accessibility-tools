/**
 * Live Regions Overlay toggle.
 *
 * Highlights all aria-live regions with colored borders.
 * Blue = polite, orange = assertive, gray = off.
 * Borders flash when content changes.
 */

import { isInsideSidebar } from "../utils/focus-stream";
import { onReposition } from "./reposition";

let active = false;
let overlays: Array<{ overlay: HTMLElement; element: Element }> = [];
let unregisterReposition: (() => void) | null = null;
let observers: MutationObserver[] = [];

const COLORS: Record<string, string> = {
  assertive: "#f97316",
  polite: "#2563eb",
  off: "#9ca3af",
};

function updatePositions() {
  for (const { overlay, element } of overlays) {
    const rect = element.getBoundingClientRect();
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }
}

function flashOverlay(element: Element) {
  const entry = overlays.find((o) => o.element === element);
  if (!entry) return;
  entry.overlay.style.background = "rgba(249, 115, 22, 0.15)";
  setTimeout(() => {
    entry.overlay.style.background = "transparent";
  }, 500);
}

function createOverlays() {
  removeOverlays();

  const regions = document.querySelectorAll("[aria-live]");
  for (const el of regions) {
    if (isInsideSidebar(el)) continue;

    const politeness = el.getAttribute("aria-live") || "polite";
    const color = COLORS[politeness] || COLORS.polite;
    const rect = el.getBoundingClientRect();

    const overlay = document.createElement("div");
    overlay.setAttribute("data-a11y-debug", "live-region-overlay");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${color};
      border-radius: 2px;
      background: transparent;
      z-index: 999997;
      pointer-events: none;
      transition: background 0.3s ease;
    `;

    // Label badge
    const badge = document.createElement("div");
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = politeness;
    badge.style.cssText = `
      position: absolute;
      top: -1px;
      left: -1px;
      background: ${color};
      color: white;
      font-size: 9px;
      font-weight: 700;
      padding: 0 4px;
      border-radius: 0 0 3px 0;
      font-family: system-ui, sans-serif;
    `;
    overlay.appendChild(badge);

    document.body.appendChild(overlay);
    overlays.push({ overlay, element: el });
  }

  unregisterReposition = onReposition(updatePositions);

  // Watch each live region individually for content changes
  for (const { element } of overlays) {
    const obs = new MutationObserver(() => {
      flashOverlay(element);
    });
    obs.observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    observers.push(obs);
  }
}

function removeOverlays() {
  unregisterReposition?.();
  unregisterReposition = null;
  for (const obs of observers) obs.disconnect();
  observers = [];
  for (const { overlay } of overlays) {
    overlay.remove();
  }
  overlays = [];
}

export function toggleLiveRegionsOverlay(): boolean {
  active = !active;
  if (active) {
    createOverlays();
  } else {
    removeOverlays();
  }
  return active;
}
