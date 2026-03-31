/**
 * Shared live region observer.
 *
 * Uses MutationObserver to watch all [aria-live] elements for text
 * content changes. Used by the Announcements Log (panel 3) and
 * Live Region Inventory (panel 21).
 */

import { describeElement, getReactComponentName } from "./fiber";
import { isInsideSidebar } from "./focus-stream";

export interface LiveRegionInfo {
  element: Element;
  description: string;
  componentName: string | null;
  politeness: "assertive" | "polite" | "off";
}

export interface AnnouncementEvent {
  text: string;
  previousText: string;
  region: LiveRegionInfo;
  timestamp: number;
}

type AnnouncementSubscriber = (event: AnnouncementEvent) => void;

let subscribers: AnnouncementSubscriber[] = [];
let observer: MutationObserver | null = null;
let scanInterval: ReturnType<typeof setInterval> | null = null;
const trackedRegions = new Map<Element, string>();

function getPoliteness(el: Element): "assertive" | "polite" | "off" {
  const value = el.getAttribute("aria-live");
  if (value === "assertive") return "assertive";
  if (value === "off") return "off";
  return "polite";
}

function getRegionInfo(el: Element): LiveRegionInfo {
  return {
    element: el,
    description: describeElement(el),
    componentName: getReactComponentName(el),
    politeness: getPoliteness(el),
  };
}

function handleMutation(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    const target = mutation.target;
    const el = target instanceof Element ? target : target.parentElement;
    if (!el) continue;

    // Find the closest aria-live ancestor
    const liveRegion = el.closest("[aria-live]");
    if (!liveRegion) continue;
    if (isInsideSidebar(liveRegion)) continue;

    const newText = (liveRegion.textContent ?? "").trim();
    const oldText = trackedRegions.get(liveRegion) ?? "";

    if (newText !== oldText) {
      trackedRegions.set(liveRegion, newText);

      const event: AnnouncementEvent = {
        text: newText,
        previousText: oldText,
        region: getRegionInfo(liveRegion),
        timestamp: Date.now(),
      };

      const snapshot = [...subscribers];
      for (const sub of snapshot) {
        sub(event);
      }
    }
  }
}

function startObserving() {
  if (observer) return;

  observer = new MutationObserver(handleMutation);
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  // Initial scan to track existing regions
  scanRegions();

  // Periodic rescan for dynamically added regions
  scanInterval = setInterval(scanRegions, 2000);
}

function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  trackedRegions.clear();
}

function scanRegions() {
  const regions = document.querySelectorAll("[aria-live]");
  for (const region of regions) {
    if (isInsideSidebar(region)) continue;
    if (!trackedRegions.has(region)) {
      trackedRegions.set(region, (region.textContent ?? "").trim());
    }
  }
}

/**
 * Subscribe to announcement events. Returns an unsubscribe function.
 * Automatically starts observing when the first subscriber is added.
 */
export function subscribeAnnouncements(
  callback: AnnouncementSubscriber,
): () => void {
  subscribers.push(callback);

  if (subscribers.length === 1) {
    startObserving();
  }

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    subscribers = subscribers.filter((s) => s !== callback);
    if (subscribers.length === 0) {
      stopObserving();
    }
  };
}

/**
 * Get all currently tracked live regions.
 */
export function getLiveRegions(): LiveRegionInfo[] {
  scanRegions();
  const regions: LiveRegionInfo[] = [];
  for (const [el] of trackedRegions) {
    if (!document.contains(el)) {
      trackedRegions.delete(el);
      continue;
    }
    regions.push(getRegionInfo(el));
  }
  return regions;
}
