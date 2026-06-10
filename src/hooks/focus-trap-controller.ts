/**
 * FocusTrapController — imperative (non-hook) API for focus trap management.
 *
 * Designed for class components that can't use hooks. Mirrors the behavior of
 * useFocusTrap but with explicit lifecycle management (constructor/destroy).
 *
 * Usage:
 *   // componentDidMount
 *   this.trap = new FocusTrapController(this.domElement, strategy);
 *
 *   // componentDidUpdate — toggle based on selection
 *   this.trap.setEnabled(isSelected);
 *
 *   // Enter key handler
 *   this.trap.enterTrap();
 *
 *   // Escape key handler
 *   this.trap.exitTrap();
 *
 *   // componentWillUnmount
 *   this.trap.destroy();
 */

import {
  findFocusableIndex,
  findNextSlot,
  findSlotIndexFromFocus,
  getManagedSlotElements,
  getVisibleFocusables,
  pickSlotEntryTarget,
} from "./dom-utils";
import type { FocusContentTrigger, FocusTrapStrategy } from "./types";

const DEFAULT_CYCLE_ORDER = ["title", "toolbar", "content"];

function announce(text: string | undefined) {
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
}

export class FocusTrapController {
  private container: HTMLElement;
  private strategy: FocusTrapStrategy;
  private enabled = false;
  private trapped = false;
  private slotIndex = 0;
  private savedTabIndices = new Map<HTMLElement, string | null>();
  private destroyed = false;

  // Bound handlers for cleanup
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleTabDirection: (e: KeyboardEvent) => void;
  private boundHandleFocusIn: (e: FocusEvent) => void;
  private tabInProgress = false;

  constructor(container: HTMLElement, strategy: FocusTrapStrategy) {
    this.container = container;
    this.strategy = strategy;

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleTabDirection = this.handleTabDirection.bind(this);
    this.boundHandleFocusIn = this.handleFocusIn.bind(this);

    document.addEventListener("keydown", this.boundHandleTabDirection, true);
    document.addEventListener("keydown", this.boundHandleKeyDown, true);
    document.addEventListener("focusin", this.boundHandleFocusIn, true);
  }

  get isTrapped(): boolean {
    return this.trapped;
  }

  get cycleOrder(): string[] {
    return this.strategy.cycleOrder ?? DEFAULT_CYCLE_ORDER;
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed) return;
    const wasEnabled = this.enabled;
    this.enabled = enabled;

    if (enabled && !wasEnabled) {
      // Becoming enabled: if focus is already inside, just enable Tab cycling.
      // Don't enter trap explicitly — that's for Enter key.
      // But if previously trapped and re-enabled (e.g., selection restored), re-trap.
    }

    if (!enabled && wasEnabled && this.trapped) {
      // Becoming disabled while trapped: auto-exit
      this.trapped = false;
      this.setChildrenNonTabbable();
      this.strategy.onExit?.();
      announce(this.strategy.announceExit);
      this.container.focus();
    }

    if (!enabled && !this.trapped) {
      // Make sure children are non-tabbable when disabled
      this.setChildrenNonTabbable();
    }
  }

  setStrategy(strategy: FocusTrapStrategy): void {
    this.strategy = strategy;
  }

  enterTrap(): void {
    if (this.destroyed || !this.enabled) return;
    this.trapped = true;
    this.restoreChildrenTabbable();
    this.strategy.onEnter?.();
    announce(this.strategy.announceEnter);

    // Focus the first available slot. enterTrap is a programmatic entry (no
    // pending Tab default to descend with), so a content slot must enter in
    // landing mode (trigger "programmatic") rather than positioner mode —
    // otherwise focus would rest silently on the invisible sentinel with no hint.
    const elements = this.strategy.getElements();
    const order = this.cycleOrder;
    for (let i = 0; i < order.length; i++) {
      if (elements[order[i]]) {
        this.slotIndex = i;
        this.focusSlot(order[i], false, "programmatic");
        break;
      }
    }
  }

  /**
   * Release the trap and fire `onExit`.
   *
   * By default focus is returned to the container — correct for a keyboard exit
   * (Escape) where focus was inside the trap and must land somewhere visible.
   * Pass `{ refocus: false }` when the host is releasing because focus has
   * *already* left the container (e.g. the user clicked a control outside an
   * inline, non-modal trap): refocusing would yank focus back from where the
   * user just put it. Modality is the host's policy — see docs/trap-composition.md.
   */
  exitTrap(options?: { refocus?: boolean }): void {
    if (this.destroyed) return;
    const refocus = options?.refocus ?? true;
    this.trapped = false;
    this.setChildrenNonTabbable();
    this.strategy.onExit?.();
    announce(this.strategy.announceExit);
    if (refocus) this.container.focus();
  }

  cycleToAdjacentSlot(direction: 1 | -1): void {
    if (this.destroyed) return;
    const reverse = direction === -1;
    const nextIndex = this.findNextSlot(this.slotIndex, direction);
    this.slotIndex = nextIndex;
    // Programmatic entry: trigger "programmatic" ⇒ a nativeTabSlot uses landing.
    this.focusSlot(this.cycleOrder[nextIndex], reverse, "programmatic");
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    document.removeEventListener("keydown", this.boundHandleTabDirection, true);
    document.removeEventListener("keydown", this.boundHandleKeyDown, true);
    document.removeEventListener("focusin", this.boundHandleFocusIn, true);

    this.restoreChildrenTabbable();

    if (this.trapped) {
      this.strategy.onExit?.();
    }
  }

  // --- Private methods ---

  private handleTabDirection(e: KeyboardEvent): void {
    if (e.key === "Tab") {
      this.tabInProgress = true;
      requestAnimationFrame(() => {
        this.tabInProgress = false;
      });
    }
  }

  private handleFocusIn(e: FocusEvent): void {
    if (this.trapped) return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target === this.container) return;
    if (!this.container.contains(target)) return;

    if (this.tabInProgress) {
      // Tab moved focus into a child when not trapped — the trap is enabled (tile selected)
      // so we should allow this and start trapping from the current position.
      if (!this.enabled) return;
      this.trapped = true;
      this.restoreChildrenTabbable();
      this.strategy.onEnter?.();
      // Don't announce — this is implicit entry via Tab, not explicit Enter.
      // Determine which slot the focus landed in.
      this.updateSlotIndexFromFocus(target);
      return;
    }

    // Focus entered via non-Tab event (e.g., mouse click) — enter trap if coming from outside.
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const cameFromOutside =
      !relatedTarget || !this.container.contains(relatedTarget);
    if (cameFromOutside) {
      if (!this.enabled) {
        this.enabled = true;
      }
      this.trapped = true;
      this.restoreChildrenTabbable();
      this.strategy.onEnter?.();
      this.updateSlotIndexFromFocus(target);
      // Notify the tile it can select/activate itself (e.g., for tiles with tileHandlesOwnSelection).
      this.strategy.onFocusEnter?.();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.destroyed) return;
    const target = e.target as HTMLElement | null;
    const isOnContainer = target === this.container;
    const isInsideContainer = target ? this.container.contains(target) : false;

    if (!this.enabled) {
      // When disabled, call onTabWhenInactive for inter-tile navigation
      if (e.key === "Tab" && (isOnContainer || isInsideContainer)) {
        const handled = this.strategy.onTabWhenInactive?.(e, e.shiftKey);
        if (handled) {
          e.preventDefault();
        }
      }
      return;
    }

    if (!this.trapped) {
      // Enabled but not trapped

      // Enter on container: activate trap explicitly (focus first slot + announce)
      if (e.key === "Enter" && isOnContainer) {
        e.preventDefault();
        this.enterTrap();
        return;
      }

      // Tab on container when enabled but not trapped: enter trap implicitly
      // Shift+Tab enters from the last slot, Tab enters from the first.
      if (e.key === "Tab" && isOnContainer) {
        e.preventDefault();
        this.trapped = true;
        this.restoreChildrenTabbable();
        this.strategy.onEnter?.();
        announce(this.strategy.announceEnter);
        const elements = this.strategy.getElements();
        const order = this.cycleOrder;
        if (e.shiftKey) {
          // Reverse entry: focus last available slot
          for (let i = order.length - 1; i >= 0; i--) {
            if (elements[order[i]]) {
              this.slotIndex = i;
              this.focusSlot(order[i], true);
              break;
            }
          }
        } else {
          // Forward entry: focus first available slot
          for (let i = 0; i < order.length; i++) {
            if (elements[order[i]]) {
              this.slotIndex = i;
              this.focusSlot(order[i]);
              break;
            }
          }
        }
        return;
      }

      // Escape when enabled but not trapped (e.g., mouse click put focus inside):
      // exit to container and notify via onExit.
      if (e.key === "Escape" && (isOnContainer || isInsideContainer)) {
        e.preventDefault();
        e.stopPropagation();
        this.exitTrap();
        return;
      }

      // Tab from inside when enabled but not trapped (e.g., click put focus inside)
      // Start trapping from current position
      if (e.key === "Tab" && isInsideContainer) {
        this.trapped = true;
        this.restoreChildrenTabbable();
        this.strategy.onEnter?.();
        this.updateSlotIndexFromFocus(document.activeElement as HTMLElement);
        // Fall through to the trapped Tab handler below
      }

      if (!this.trapped) return;
    }

    // --- Trapped or enabled with focus inside ---
    if (!this.isInsideTrap(document.activeElement)) return;

    // Escape: per-slot escapeHandlers can opt out of the default exit
    // (e.g. cell editor cancel). Otherwise exit the trap.
    if (e.key === "Escape") {
      // Re-derive slotIndex from where focus actually is. slotIndex can go stale
      // when focus moves via click or programmatic .focus() while already trapped
      // (handleFocusIn returns early when trapped=true). Mirrors Tab handling.
      const activeElForEsc = document.activeElement;
      if (activeElForEsc instanceof HTMLElement) {
        this.updateSlotIndexFromFocus(activeElForEsc);
      }
      const escSlotName = this.cycleOrder[this.slotIndex];
      const escapeHandler = this.strategy.escapeHandlers?.[escSlotName];
      if (escapeHandler) {
        const result = escapeHandler(e);
        if (result === "handled") return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.exitTrap();
      return;
    }

    // Tab only cycles when trapped
    if (!this.trapped) return;

    if (e.key === "Tab") {
      // Re-derive slotIndex from where focus actually is. slotIndex is only
      // updated on Tab cycles and on focus-in from outside, so it can go stale
      // when something else moves focus inside the trap (e.g. a click on a
      // toolbar button, or a programmatic .focus() inside a composite widget).
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement) {
        this.updateSlotIndexFromFocus(activeEl);
      }

      const currentSlotName = this.cycleOrder[this.slotIndex];

      // §3 resting-sentinel rule: if the current slot is a nativeTabSlot,
      // focus is resting on one of its sentinels. Resolve the four cases.
      const nativeTabSlots = this.strategy.nativeTabSlots ?? [];
      if (nativeTabSlots.includes(currentSlotName)) {
        const sentinels =
          this.strategy.getNativeTabSlotSentinels?.(currentSlotName);
        const active = document.activeElement;
        const onBefore = !!sentinels && active === sentinels.before;
        const onAfter = !!sentinels && active === sentinels.after;
        const reverse = e.shiftKey;
        const descend = (!reverse && onBefore) || (reverse && onAfter);
        if (descend) return; // native descent — do not preventDefault
        e.preventDefault();
        const direction: 1 | -1 = reverse ? -1 : 1;
        const nextIndex = this.findNextSlot(this.slotIndex, direction);
        this.slotIndex = nextIndex;
        this.focusSlot(
          this.cycleOrder[nextIndex],
          reverse,
          "sequentialNavigation",
        );
        return;
      }

      // Per-slot tab handler takes precedence over tabWithinSlots.
      const tabHandler = this.strategy.tabHandlers?.[currentSlotName];
      if (tabHandler) {
        const result = tabHandler(e, e.shiftKey);
        if (result === "handled") return;
        // result === "exit": advance to the next slot.
        const reverse = e.shiftKey;
        const direction: 1 | -1 = reverse ? -1 : 1;
        const nextIndex = this.findNextSlot(this.slotIndex, direction);
        this.slotIndex = nextIndex;
        const nextName = this.cycleOrder[nextIndex];
        if (!(this.strategy.nativeTabSlots ?? []).includes(nextName))
          e.preventDefault();
        this.focusSlot(nextName, reverse, "sequentialNavigation");
        return;
      }

      const tabWithinSlots = this.strategy.tabWithinSlots ?? [];

      // Try Tab within current slot first
      if (tabWithinSlots.includes(currentSlotName)) {
        const elements = this.strategy.getElements();
        const slotElement = elements[currentSlotName];
        if (slotElement) {
          const focusables = getVisibleFocusables(slotElement);
          const currentIdx = findFocusableIndex(focusables, activeEl);

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

      // At boundary or slot not in tabWithinSlots — cycle to next slot
      const reverse = e.shiftKey;
      const direction: 1 | -1 = reverse ? -1 : 1;
      const nextIndex = this.findNextSlot(this.slotIndex, direction);
      this.slotIndex = nextIndex;
      const nextName = this.cycleOrder[nextIndex];
      if (!(this.strategy.nativeTabSlots ?? []).includes(nextName))
        e.preventDefault();
      this.focusSlot(nextName, reverse, "sequentialNavigation");
    }
  }

  private focusSlot(
    slotName: string,
    reverse = false,
    trigger: FocusContentTrigger = "sequentialNavigation",
  ): void {
    const contentSlot = this.strategy.contentSlot ?? "content";
    const entryMode = reverse ? "reverse" : "forward";
    if (
      slotName === contentSlot &&
      this.strategy.focusContent?.({ entryMode, trigger })
    )
      return;

    const elements = this.strategy.getElements();
    const slotEl = elements[slotName];
    if (!slotEl) return;

    const tabWithinSlots = this.strategy.tabWithinSlots ?? [];
    if (tabWithinSlots.includes(slotName)) {
      const target = pickSlotEntryTarget(slotEl, reverse);
      if (target) {
        target.focus();
        return;
      }
    }

    // Try to focus the slot element directly
    slotEl.focus();
    if (document.activeElement === slotEl) return;

    // If the slot element isn't focusable (e.g., toolbar div), focus its first focusable child
    const target = pickSlotEntryTarget(slotEl, reverse);
    if (target) {
      target.focus();
    }
  }

  private findNextSlot(fromIndex: number, direction: 1 | -1): number {
    return findNextSlot(fromIndex, direction, this.cycleOrder, this.strategy);
  }

  private isInsideTrap(el: Element | null): boolean {
    if (!el) return false;
    if (this.container.contains(el)) return true;
    const externals = this.strategy.getExternalElements?.() ?? [];
    return externals.some((ext) => ext.contains(el));
  }

  private updateSlotIndexFromFocus(target: HTMLElement): void {
    const idx = findSlotIndexFromFocus(target, this.strategy, this.cycleOrder);
    if (idx !== null) this.slotIndex = idx;
  }

  private setChildrenNonTabbable(): void {
    const focusable = this.container.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]",
    );
    // Remove stale entries for elements no longer in the container
    for (const [el] of this.savedTabIndices) {
      if (!this.container.contains(el)) {
        this.savedTabIndices.delete(el);
      }
    }
    const managedSlotEls = getManagedSlotElements(this.strategy);
    // Only save original tabindex if not already saved (preserve originals across multiple calls)
    for (const el of focusable) {
      if (el === this.container) continue;
      if (managedSlotEls.some((s) => s.contains(el))) continue;
      if (!this.savedTabIndices.has(el)) {
        this.savedTabIndices.set(el, el.getAttribute("tabindex"));
      }
      el.setAttribute("tabindex", "-1");
    }
  }

  private restoreChildrenTabbable(): void {
    for (const [el, saved] of this.savedTabIndices) {
      if (saved === null) {
        el.removeAttribute("tabindex");
      } else {
        el.setAttribute("tabindex", saved);
      }
    }
    this.savedTabIndices.clear();
  }
}
