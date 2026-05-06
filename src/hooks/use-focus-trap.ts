/**
 * useFocusTrap hook.
 *
 * Manages keyboard focus trapping with strategy-driven lifecycle.
 *
 * When not trapped:
 * - Tab/Shift+Tab skip past the container and all children
 * - Mouse clicks on children work normally (trap does not activate)
 * - Enter on the container activates the trap
 *
 * When trapped:
 * - Tab/Shift+Tab cycles through strategy slots
 * - Escape exits the trap and returns focus to the container
 *
 * Uses tabindex=-1 to remove children from tab order, plus a capture-phase
 * focusin guard that redirects any focus that sneaks through (e.g., browser
 * Shift+Tab ignoring tabindex=-1 on native elements).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getVisibleFocusables, pickSlotEntryTarget } from "./dom-utils";
import { useAccessibilityContext } from "./provider";
import type { FocusTrapConfig, FocusTrapResult } from "./types";
import { useStableId } from "./use-stable-id";

const DEFAULT_CYCLE_ORDER = ["title", "toolbar", "content"];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Find the next focusable element outside the container in tab order.
 */
function findNextFocusableOutside(
  container: HTMLElement,
  reverse: boolean,
): HTMLElement | null {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => !container.contains(el) || el === container);
  const idx = all.indexOf(container);
  if (idx === -1) return all[0] ?? null;
  if (reverse) {
    return all[idx - 1] ?? all[all.length - 1] ?? null;
  }
  return all[idx + 1] ?? all[0] ?? null;
}

export function useFocusTrap(
  config: FocusTrapConfig | undefined,
): FocusTrapResult | null {
  const isTrappedRef = useRef(false);
  const [isTrapped, setIsTrapped] = useState(false);
  const setTrapped = useCallback((value: boolean) => {
    isTrappedRef.current = value;
    setIsTrapped(value);
  }, []);
  const slotIndexRef = useRef(0);
  const instanceId = useStableId();
  const debugCtx = useAccessibilityContext();
  const containerRef = config?.containerRef;
  const strategy = config?.strategy;
  const cycleOrder = strategy?.cycleOrder ?? DEFAULT_CYCLE_ORDER;
  // Save/restore tabindex on focusable children
  const savedTabIndices = useRef(new Map<HTMLElement, string | null>());

  const setChildrenNonTabbable = useCallback(() => {
    const container = containerRef?.current;
    if (!container) return;
    const focusable = container.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]",
    );
    savedTabIndices.current.clear();
    for (const el of focusable) {
      if (el === container) continue;
      savedTabIndices.current.set(el, el.getAttribute("tabindex"));
      el.setAttribute("tabindex", "-1");
    }
  }, [containerRef]);

  const restoreChildrenTabbable = useCallback(() => {
    for (const [el, saved] of savedTabIndices.current) {
      if (saved === null) {
        el.removeAttribute("tabindex");
      } else {
        el.setAttribute("tabindex", saved);
      }
    }
    savedTabIndices.current.clear();
  }, []);

  // Announce to screen readers via a temporary aria-live region
  const announce = useCallback((text: string | undefined) => {
    if (!text) return;
    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.style.cssText =
      "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }, []);

  // Focus a specific slot by name.
  // For tabWithinSlots, focus the first (or last if reverse) focusable child.
  const focusSlot = useCallback(
    (slotName: string, reverse = false) => {
      if (!strategy) return;
      const contentSlot = strategy.contentSlot ?? "content";
      if (slotName === contentSlot && strategy.focusContent?.()) return;
      const elements = strategy.getElements();
      const slotEl = elements[slotName];
      if (!slotEl) return;

      // For tabWithinSlots, focus the first/last focusable child
      const tabWithinSlots = strategy.tabWithinSlots ?? [];
      if (tabWithinSlots.includes(slotName)) {
        const target = pickSlotEntryTarget(slotEl, reverse);
        if (target) {
          target.focus();
          return;
        }
      }

      slotEl.focus();
    },
    [strategy],
  );

  // Find the next valid slot index (skipping undefined elements)
  const findNextSlot = useCallback(
    (fromIndex: number, direction: 1 | -1): number => {
      if (!strategy) return fromIndex;
      const elements = strategy.getElements();
      const len = cycleOrder.length;
      for (let i = 1; i <= len; i++) {
        const idx = (fromIndex + i * direction + len * len) % len;
        const slotName = cycleOrder[idx];
        if (elements[slotName]) return idx;
      }
      return fromIndex;
    },
    [strategy, cycleOrder],
  );

  // Check if an element is "inside" the trap (container or external elements)
  const isInsideTrap = useCallback(
    (el: Element | null): boolean => {
      if (!el || !containerRef?.current) return false;
      if (containerRef.current.contains(el)) return true;
      const externals = strategy?.getExternalElements?.() ?? [];
      return externals.some((ext) => ext.contains(el));
    },
    [containerRef, strategy],
  );

  // Main effect: tabindex management, keyboard handler, focusin guard
  useEffect(() => {
    if (!config) return;
    const container = containerRef?.current;
    if (!container) return;

    // Set children non-tabbable if not currently trapped
    if (!isTrappedRef.current) {
      setChildrenNonTabbable();
    }

    // Track whether a Tab key is currently being processed.
    // The focusin guard only fires during Tab navigation, not mouse/JS focus.
    let tabInProgress = false;

    const handleTabDirection = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        tabInProgress = true;
        // Clear on the next microtask (after focusin fires)
        requestAnimationFrame(() => {
          tabInProgress = false;
        });
      }
    };

    // Capture-phase focusin guard: if Tab moves focus into a child when not
    // trapped, redirect to the container. Mouse clicks and JS .focus() pass
    // through unaffected.
    const handleFocusIn = (e: FocusEvent) => {
      if (isTrappedRef.current) return;
      if (!tabInProgress) return;
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target === container) return;
      if (!container.contains(target)) return;

      e.stopImmediatePropagation();
      container.focus();
    };

    // Capture-phase keydown handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!strategy) return;
      const target = e.target as HTMLElement | null;
      const isOnContainer = target === container;
      const isInsideContainer = target ? container.contains(target) : false;
      const trapped = isTrappedRef.current;

      if (!trapped) {
        // Enter on the container: activate trap
        if (e.key === "Enter" && isOnContainer) {
          e.preventDefault();
          setTrapped(true);
          restoreChildrenTabbable();
          strategy.onEnter?.();
          announce(strategy.announceEnter);
          debugCtx?.reportFocusTrapEvent(instanceId, {
            type: "enter",
            timestamp: Date.now(),
          });
          const elements = strategy.getElements();
          for (let i = 0; i < cycleOrder.length; i++) {
            const slotName = cycleOrder[i];
            if (elements[slotName]) {
              slotIndexRef.current = i;
              focusSlot(slotName);
              break;
            }
          }
          return;
        }

        // Tab/Shift+Tab on container or child: skip past
        if (e.key === "Tab" && (isOnContainer || isInsideContainer)) {
          e.preventDefault();
          const next = findNextFocusableOutside(container, e.shiftKey);
          next?.focus();
          return;
        }

        return;
      }

      // --- Trapped ---
      if (!isInsideTrap(document.activeElement)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setTrapped(false);
        setChildrenNonTabbable();
        strategy.onExit?.();
        announce(strategy.announceExit);
        debugCtx?.reportFocusTrapEvent(instanceId, {
          type: "exit",
          timestamp: Date.now(),
        });
        container.focus();
        return;
      }

      if (e.key === "Tab") {
        // Check if we should Tab within the current slot first
        const currentSlotName = cycleOrder[slotIndexRef.current];
        const tabWithinSlots = strategy.tabWithinSlots ?? [];

        if (tabWithinSlots.includes(currentSlotName)) {
          const elements = strategy.getElements();
          const slotElement = elements[currentSlotName];

          if (slotElement) {
            const focusables = getVisibleFocusables(slotElement);
            const activeEl = document.activeElement as HTMLElement;
            const currentIdx = focusables.indexOf(activeEl);

            if (currentIdx !== -1) {
              const nextIdx = e.shiftKey ? currentIdx - 1 : currentIdx + 1;
              if (nextIdx >= 0 && nextIdx < focusables.length) {
                e.preventDefault();
                focusables[nextIdx].focus();
                return; // stayed within slot
              }
            }
          }
        }

        // At boundary or slot not in tabWithinSlots - cycle to next slot
        e.preventDefault();
        const reverse = e.shiftKey;
        const direction: 1 | -1 = reverse ? -1 : 1;
        const nextIndex = findNextSlot(slotIndexRef.current, direction);
        slotIndexRef.current = nextIndex;
        const slotName = cycleOrder[nextIndex];
        focusSlot(slotName, reverse);
        debugCtx?.reportFocusTrapEvent(instanceId, {
          type: "cycle",
          slot: slotName,
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener("keydown", handleTabDirection, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      document.removeEventListener("keydown", handleTabDirection, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      restoreChildrenTabbable();
    };
  }, [
    config,
    containerRef,
    strategy,
    cycleOrder,
    announce,
    focusSlot,
    findNextSlot,
    isInsideTrap,
    setChildrenNonTabbable,
    restoreChildrenTabbable,
    setTrapped,
    debugCtx,
    instanceId,
  ]);

  // Register with debug context
  useEffect(() => {
    if (!config || !debugCtx) return;
    debugCtx.registerInstance(instanceId, {
      hookType: "focusTrap",
      containerElement: containerRef?.current,
    });
    return () => {
      debugCtx.unregisterInstance(instanceId);
    };
  }, [config, debugCtx, instanceId, containerRef]);

  // Clean up on unmount if still trapped
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only runs on unmount
  useEffect(() => {
    return () => {
      if (isTrappedRef.current && strategy) {
        strategy.onExit?.();
      }
    };
  }, []);

  if (!config) return null;

  return {
    isTrapped,
    enterTrap: () => {
      if (!strategy) return;
      setTrapped(true);
      restoreChildrenTabbable();
      strategy.onEnter?.();
      announce(strategy.announceEnter);
      const elements = strategy.getElements();
      for (let i = 0; i < cycleOrder.length; i++) {
        const slotName = cycleOrder[i];
        if (elements[slotName]) {
          slotIndexRef.current = i;
          focusSlot(slotName);
          break;
        }
      }
    },
    exitTrap: () => {
      if (!strategy) return;
      setTrapped(false);
      setChildrenNonTabbable();
      strategy.onExit?.();
      announce(strategy.announceExit);
      containerRef?.current?.focus();
    },
  };
}
