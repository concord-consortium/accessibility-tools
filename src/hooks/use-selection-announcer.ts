/**
 * useSelectionAnnouncer hook.
 *
 * Watches selectedItems for changes and announces them to screen readers
 * via an aria-live region. Supports debouncing for rapid multi-select,
 * singular/plural messaging, and custom announcement refs.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAccessibilityContext } from "./provider";
import type { AnnouncementsConfig } from "./types";

const DEFAULT_DEBOUNCE_MS = 150;

function getItems(
  items: ReadonlyArray<string> | ReadonlySet<string>,
): string[] {
  return items instanceof Set ? Array.from(items) : [...items];
}

export function useSelectionAnnouncer(
  config: AnnouncementsConfig | undefined,
): void {
  const debugCtx = useAccessibilityContext();
  const liveRegionRef = useRef<HTMLElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevItemsRef = useRef<string[]>([]);

  const selectedItems = config?.selectedItems;
  const getLabel = config?.getLabel;
  const multiSelectMessage = config?.multiSelectMessage;
  const announceRef = config?.announceRef;
  const debounceMs = config?.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  // Get or create the aria-live region
  const getLiveRegion = useCallback((): HTMLElement => {
    // Use provided ref if available
    if (announceRef?.current) return announceRef.current;

    // Create one if needed
    if (!liveRegionRef.current) {
      const el = document.createElement("div");
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      el.style.cssText =
        "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;";
      document.body.appendChild(el);
      liveRegionRef.current = el;
    }
    return liveRegionRef.current;
  }, [announceRef]);

  // Announce text to the live region
  const announce = useCallback(
    (text: string) => {
      const region = getLiveRegion();
      // Clear then set to ensure re-announcement of same text
      region.textContent = "";
      requestAnimationFrame(() => {
        region.textContent = text;
      });
      debugCtx?.reportAnnouncement(text, "polite", "useSelectionAnnouncer");
    },
    [getLiveRegion, debugCtx],
  );

  // Watch for selection changes
  useEffect(() => {
    if (!config || !selectedItems || !getLabel) return;

    const currentItems = getItems(selectedItems);
    const prevItems = prevItemsRef.current;

    // Find newly added items
    const prevSet = new Set(prevItems);
    const added = currentItems.filter((id) => !prevSet.has(id));

    prevItemsRef.current = currentItems;

    // Nothing changed or initial render
    if (added.length === 0 && currentItems.length === prevItems.length) return;

    // Debounce the announcement
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      if (currentItems.length === 0) return;

      let text: string;
      if (currentItems.length === 1) {
        text = getLabel(currentItems[0]);
      } else if (multiSelectMessage) {
        text = multiSelectMessage.replace(
          "{count}",
          String(currentItems.length),
        );
      } else {
        text = `${currentItems.length} items selected`;
      }

      announce(text);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [
    config,
    selectedItems,
    getLabel,
    multiSelectMessage,
    debounceMs,
    announce,
  ]);

  // Clean up created live region on unmount
  useEffect(() => {
    return () => {
      if (liveRegionRef.current) {
        liveRegionRef.current.remove();
        liveRegionRef.current = null;
      }
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);
}
