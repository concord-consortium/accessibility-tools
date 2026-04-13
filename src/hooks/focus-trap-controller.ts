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

import { getVisibleFocusables } from "./dom-utils";
import type { FocusTrapStrategy } from "./types";

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

    // Focus the first available slot
    const elements = this.strategy.getElements();
    const order = this.cycleOrder;
    for (let i = 0; i < order.length; i++) {
      if (elements[order[i]]) {
        this.slotIndex = i;
        this.focusSlot(order[i]);
        break;
      }
    }
  }

  exitTrap(): void {
    if (this.destroyed) return;
    this.trapped = false;
    this.setChildrenNonTabbable();
    this.strategy.onExit?.();
    announce(this.strategy.announceExit);
    this.container.focus();
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

    // Escape: exit trap when either trapped or enabled (click put focus inside)
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.exitTrap();
      return;
    }

    // Tab only cycles when trapped
    if (!this.trapped) return;

    if (e.key === "Tab") {
      const currentSlotName = this.cycleOrder[this.slotIndex];
      const tabWithinSlots = this.strategy.tabWithinSlots ?? [];

      // Try Tab within current slot first
      if (tabWithinSlots.includes(currentSlotName)) {
        const elements = this.strategy.getElements();
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

      // At boundary or slot not in tabWithinSlots — cycle to next slot
      e.preventDefault();
      const reverse = e.shiftKey;
      const direction: 1 | -1 = reverse ? -1 : 1;
      const nextIndex = this.findNextSlot(this.slotIndex, direction);
      this.slotIndex = nextIndex;
      this.focusSlot(this.cycleOrder[nextIndex], reverse);
    }
  }

  private focusSlot(slotName: string, reverse = false): void {
    const contentSlot = this.strategy.contentSlot ?? "content";
    if (slotName === contentSlot && this.strategy.focusContent?.()) return;

    const elements = this.strategy.getElements();
    const slotEl = elements[slotName];
    if (!slotEl) return;

    const tabWithinSlots = this.strategy.tabWithinSlots ?? [];
    if (tabWithinSlots.includes(slotName)) {
      const focusables = getVisibleFocusables(slotEl);
      if (focusables.length > 0) {
        const target = reverse
          ? focusables[focusables.length - 1]
          : focusables[0];
        target.focus();
        return;
      }
    }

    // Try to focus the slot element directly
    slotEl.focus();
    if (document.activeElement === slotEl) return;

    // If the slot element isn't focusable (e.g., toolbar div), focus its first focusable child
    const focusables = getVisibleFocusables(slotEl);
    if (focusables.length > 0) {
      const target = reverse
        ? focusables[focusables.length - 1]
        : focusables[0];
      target.focus();
    }
  }

  private findNextSlot(fromIndex: number, direction: 1 | -1): number {
    const elements = this.strategy.getElements();
    const order = this.cycleOrder;
    const len = order.length;
    for (let i = 1; i <= len; i++) {
      const idx = (fromIndex + i * direction + len * len) % len;
      if (elements[order[idx]]) return idx;
    }
    return fromIndex;
  }

  private isInsideTrap(el: Element | null): boolean {
    if (!el) return false;
    if (this.container.contains(el)) return true;
    const externals = this.strategy.getExternalElements?.() ?? [];
    return externals.some((ext) => ext.contains(el));
  }

  private updateSlotIndexFromFocus(target: HTMLElement): void {
    const elements = this.strategy.getElements();
    const order = this.cycleOrder;
    for (let i = 0; i < order.length; i++) {
      const slotEl = elements[order[i]];
      if (slotEl && (slotEl === target || slotEl.contains(target))) {
        this.slotIndex = i;
        return;
      }
    }
    // Also check external elements (toolbar)
    const externals = this.strategy.getExternalElements?.() ?? [];
    for (let i = 0; i < order.length; i++) {
      const slotEl = elements[order[i]];
      if (!slotEl) continue;
      for (const ext of externals) {
        if (ext.contains(target)) {
          // External element — find which slot it maps to.
          // Toolbar is typically the slot that's in getExternalElements.
          this.slotIndex = i;
          return;
        }
      }
    }
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
    // Only save original tabindex if not already saved (preserve originals across multiple calls)
    for (const el of focusable) {
      if (el === this.container) continue;
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
