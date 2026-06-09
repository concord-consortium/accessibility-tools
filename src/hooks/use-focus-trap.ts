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
import {
  findFocusableIndex,
  findNextFocusableOutside,
  findNextSlot,
  findSlotIndexFromFocus,
  getManagedSlotElements,
  getVisibleFocusables,
  pickSlotEntryTarget,
} from "./dom-utils";
import { useAccessibilityContext } from "./provider";
import type { FocusTrapConfig, FocusTrapResult } from "./types";
import { useStableId } from "./use-stable-id";

const DEFAULT_CYCLE_ORDER = ["title", "toolbar", "content"];

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
    const managedSlotEls = strategy ? getManagedSlotElements(strategy) : [];
    savedTabIndices.current.clear();
    for (const el of focusable) {
      if (el === container) continue;
      if (managedSlotEls.some((s) => s.contains(el))) continue;
      savedTabIndices.current.set(el, el.getAttribute("tabindex"));
      el.setAttribute("tabindex", "-1");
    }
  }, [containerRef, strategy]);

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
      const entryMode = reverse ? "reverse" : "forward";
      if (
        slotName === contentSlot &&
        strategy.focusContent?.({ entryMode, viaKeydown: true })
      )
        return;
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

    // Re-derive slotIndex from current focus. slotIndex is only updated on
    // Tab cycles and on initial enter, so it can go stale when something else
    // moves focus inside the trap (e.g. a click on a toolbar button, or a
    // programmatic .focus() inside a composite widget).
    const updateSlotIndexFromFocus = (target: HTMLElement) => {
      if (!strategy) return;
      const idx = findSlotIndexFromFocus(target, strategy, cycleOrder);
      if (idx !== null) slotIndexRef.current = idx;
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
        // Per-slot escapeHandlers can opt out of the default exit (e.g. cell
        // editor cancel). Re-derive slotIndex from focus first — it can go
        // stale when focus moves via click or programmatic .focus() while
        // already trapped.
        const activeElForEsc = document.activeElement;
        if (activeElForEsc instanceof HTMLElement) {
          updateSlotIndexFromFocus(activeElForEsc);
        }
        const escSlotName = cycleOrder[slotIndexRef.current];
        const escapeHandler = strategy.escapeHandlers?.[escSlotName];
        if (escapeHandler) {
          const result = escapeHandler(e);
          if (result === "handled") return;
        }
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
        // Re-derive slotIndex from focus before dispatching to handlers —
        // focus may have moved into a different slot via click or programmatic
        // .focus() since the last Tab cycle.
        const activeEl = document.activeElement;
        if (activeEl instanceof HTMLElement) {
          updateSlotIndexFromFocus(activeEl);
        }
        const currentSlotName = cycleOrder[slotIndexRef.current];

        // Per-slot tab handler takes precedence over tabWithinSlots.
        const tabHandler = strategy.tabHandlers?.[currentSlotName];
        if (tabHandler) {
          const result = tabHandler(e, e.shiftKey);
          if (result === "handled") return;
          // result === "exit": advance to the next slot.
          e.preventDefault();
          const reverse = e.shiftKey;
          const direction: 1 | -1 = reverse ? -1 : 1;
          const nextIndex = findNextSlot(
            slotIndexRef.current,
            direction,
            cycleOrder,
            strategy,
          );
          slotIndexRef.current = nextIndex;
          const slotName = cycleOrder[nextIndex];
          focusSlot(slotName, reverse);
          debugCtx?.reportFocusTrapEvent(instanceId, {
            type: "cycle",
            slot: slotName,
            timestamp: Date.now(),
          });
          return;
        }

        const tabWithinSlots = strategy.tabWithinSlots ?? [];

        if (tabWithinSlots.includes(currentSlotName)) {
          const elements = strategy.getElements();
          const slotElement = elements[currentSlotName];

          if (slotElement) {
            const focusables = getVisibleFocusables(slotElement);
            const currentIdx = findFocusableIndex(
              focusables,
              document.activeElement,
            );

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
        const nextIndex = findNextSlot(
          slotIndexRef.current,
          direction,
          cycleOrder,
          strategy,
        );
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
