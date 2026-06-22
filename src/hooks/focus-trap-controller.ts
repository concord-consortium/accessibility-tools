/**
 * FocusTrapController — imperative (non-hook) API for focus trap management.
 *
 * Two-phase lifecycle:
 *   1. Construct with `(strategy, options)` only — this sets up engine state
 *      (strategy, options, bound handlers) but wires NO DOM. All public methods
 *      are safe no-ops until a container is attached.
 *   2. Attach the DOM by handing the container element to `containerRef` (a
 *      stable ref-callback): a non-null element attaches (installs document
 *      listeners, runs tabindex sweeps); null detaches silently. React keeps the
 *      same callback identity across renders, so the node attaches/detaches/
 *      remounts precisely when the DOM node does — even inside deferred portals.
 *   3. Call `destroy()` on teardown.
 *
 * **Ownership when obtained from `useFocusTrap`:** the hook owns
 * `setEnabled`, `setStrategy`, and `destroy` — consumers must NOT call them.
 * The consumer-facing surface is `containerRef`, `isTrapped`, `enterTrap`,
 * `exitTrap`, and `cycleToAdjacentSlot`.
 *
 * Class-component usage (where hooks aren't available):
 *   // constructor / field initializer
 *   this.trap = new FocusTrapController(strategy);
 *
 *   // render — wire the seam onto the root element
 *   <div ref={this.trap.containerRef}>…</div>
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
  findNextFocusableOutside,
  findNextSlot,
  findSlotIndexFromFocus,
  getManagedSlotElements,
  getVisibleFocusables,
  pickSlotEntryTarget,
} from "./dom-utils";
import type {
  FocusContentTrigger,
  FocusTrapEvent,
  FocusTrapStrategy,
} from "./types";

const DEFAULT_CYCLE_ORDER = ["title", "toolbar", "content"];

/**
 * Optional callbacks for observers (e.g. a React wrapper or debug tooling).
 * The controller stays framework-agnostic — these are the only seams through
 * which it reports state outward.
 */
export interface FocusTrapControllerOptions {
  /**
   * Called whenever the internal `trapped` flag changes — including implicit
   * entry via a click from outside, not just enterTrap/exitTrap. Lets a React
   * wrapper mirror `isTrapped` into component state.
   */
  onTrappedChange?: (trapped: boolean) => void;
  /**
   * Called when the trap is entered, exited, or cycles to another slot. Lets
   * debug instrumentation observe the trap's lifecycle.
   */
  onEvent?: (event: FocusTrapEvent) => void;
  /**
   * Called whenever the container attaches (el) or detaches (null), so a
   * wrapper can mirror the element (e.g. into the debug inspector).
   */
  onContainerChange?: (el: HTMLElement | null) => void;
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
  private container: HTMLElement | null = null;
  private attached = false;
  private destroyed = false;
  private strategy: FocusTrapStrategy;
  private options: FocusTrapControllerOptions;
  private enabled = false;
  private trapped = false;
  private slotIndex = 0;
  private savedTabIndices = new Map<HTMLElement, string | null>();
  private tabInProgress = false;

  // Bound handlers for cleanup
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleTabDirection: (e: KeyboardEvent) => void;
  private boundHandleFocusIn: (e: FocusEvent) => void;

  constructor(
    strategy: FocusTrapStrategy,
    options: FocusTrapControllerOptions = {},
  ) {
    this.strategy = strategy;
    this.options = options;

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleTabDirection = this.handleTabDirection.bind(this);
    this.boundHandleFocusIn = this.handleFocusIn.bind(this);

    // Bind the consumer-facing methods so the hook can return the raw
    // controller and consumers can safely destructure them.
    this.enterTrap = this.enterTrap.bind(this);
    this.exitTrap = this.exitTrap.bind(this);
    this.cycleToAdjacentSlot = this.cycleToAdjacentSlot.bind(this);
    // NOTE: no document.addEventListener here — that moves to attach().
  }

  /**
   * The single container seam. Spread onto the container element
   * (`ref={controller.containerRef}`) from a hook or class component, or call
   * imperatively. Stable identity (bound arrow field), so React never
   * detaches/reattaches it across renders. Non-null attaches; null tears down
   * silently (see detach()).
   */
  containerRef = (el: HTMLElement | null): void => {
    if (this.destroyed) return;
    if (el === this.container) return;
    if (this.attached) this.detach();
    this.container = el;
    if (el) this.attach();
    this.options.onContainerChange?.(el);
  };

  private attach(): void {
    this.attached = true;
    document.addEventListener("keydown", this.boundHandleTabDirection, true);
    document.addEventListener("keydown", this.boundHandleKeyDown, true);
    document.addEventListener("focusin", this.boundHandleFocusIn, true);
    // Match constructor-era startup: if enabled-but-not-trapped, make children
    // non-tabbable now that we have a container.
    if (this.enabled && !this.trapped) this.setChildrenNonTabbable();
  }

  /** Silent teardown: no onExit / no announce (that's exitTrap's job). */
  private detach(): void {
    if (!this.attached) return;
    this.attached = false;
    document.removeEventListener("keydown", this.boundHandleTabDirection, true);
    document.removeEventListener("keydown", this.boundHandleKeyDown, true);
    document.removeEventListener("focusin", this.boundHandleFocusIn, true);
    this.restoreChildrenTabbable();
    if (this.trapped) this.setTrapped(false); // fires onTrappedChange; NO onExit/announce
    this.container = null;
  }

  get isTrapped(): boolean {
    return this.trapped;
  }

  get cycleOrder(): string[] {
    return this.strategy.cycleOrder ?? DEFAULT_CYCLE_ORDER;
  }

  /**
   * Single write path for `trapped`. Every transition — explicit
   * (enterTrap/exitTrap) and implicit (handleFocusIn, Tab-into-trap) — routes
   * through here so onTrappedChange fires for all of them.
   */
  private setTrapped(value: boolean): void {
    if (this.trapped === value) return;
    this.trapped = value;
    this.options.onTrappedChange?.(value);
  }

  private emit(type: FocusTrapEvent["type"], slot?: string): void {
    this.options.onEvent?.({ type, slot, timestamp: Date.now() });
  }

  /**
   * Shared trap-entry sequence: flip to trapped, restore children to the tab
   * order, fire onEnter, optionally announce, and emit the "enter" event.
   *
   * Deliberately does NOT place focus — callers follow with focusEntrySlot()
   * for a fresh entry (focus a boundary slot) or updateSlotIndexFromFocus() to
   * adopt wherever focus already landed (a click into a child).
   *
   * @param announce whether to make the screen-reader announcement. Explicit
   *   keyboard entry (Enter) announces; implicit entry via focusin (a click
   *   from outside) does not.
   */
  private activateTrap({ announce: doAnnounce = false } = {}): void {
    this.setTrapped(true);
    this.restoreChildrenTabbable();
    this.strategy.onEnter?.();
    if (doAnnounce) announce(this.strategy.announceEnter);
    this.emit("enter");
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed) return;
    const wasEnabled = this.enabled;
    this.enabled = enabled;
    // Record the flag above; defer all DOM effects (tabindex sweeps, focus
    // moves) until a container is attached.
    if (!this.attached) return;
    const container = this.container as HTMLElement;

    if (!enabled && wasEnabled && this.trapped) {
      // Becoming disabled while trapped: auto-exit
      this.setTrapped(false);
      this.setChildrenNonTabbable();
      this.strategy.onExit?.();
      announce(this.strategy.announceExit);
      this.emit("exit");
      container.focus();
      return;
    }

    // Whenever not trapped — enabled or disabled — children stay out of the tab
    // order so the container is the single tab stop and Tab does not walk into
    // a child. Entry is always explicit: Enter/enterTrap() or a click from
    // outside (handleFocusIn). Without this, a freshly-enabled trap (or a
    // disable→enable cycle) would leave children tabbable and Tab would fall
    // straight in. Mirrors useFocusTrap's "Tab skips past when not trapped".
    if (!this.trapped) {
      this.setChildrenNonTabbable();
    }
  }

  setStrategy(strategy: FocusTrapStrategy): void {
    this.strategy = strategy;
  }

  enterTrap(options?: { suppressHint?: boolean }): void {
    if (this.destroyed || !this.attached || !this.enabled) return;
    this.activateTrap({ announce: true });
    // enterTrap is a programmatic entry (no pending Tab default to descend
    // with), so a content slot must enter in landing mode (trigger
    // "programmatic") rather than positioner — otherwise focus rests silently on
    // the invisible sentinel with no hint. Live-Tab engage paths use
    // focusEntrySlot() with the positioner default and are unaffected. A host may
    // pass { suppressHint: true } for a pointer-driven entry: focus still rests on
    // the sentinel, but no visible hint is shown. See specs/2026-06-09-iframe-slot-support.md.
    this.focusEntrySlot(false, "programmatic", options?.suppressHint ?? false);
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
    if (this.destroyed || !this.attached) return;
    const container = this.container as HTMLElement;
    const refocus = options?.refocus ?? true;
    this.setTrapped(false);
    this.setChildrenNonTabbable();
    this.strategy.onExit?.();
    announce(this.strategy.announceExit);
    this.emit("exit");
    if (refocus) container.focus();
  }

  cycleToAdjacentSlot(direction: 1 | -1): void {
    if (this.destroyed || !this.attached) return;
    const reverse = direction === -1;
    const nextIndex = this.findNextSlot(this.slotIndex, direction);
    this.slotIndex = nextIndex;
    // Programmatic entry: trigger "programmatic" ⇒ a nativeTabSlot uses landing.
    this.focusSlot(this.cycleOrder[nextIndex], reverse, "programmatic");
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.detach(); // safe if !attached
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
    // No focus-out exit: a trapped trap stays trapped until Escape/
    // setEnabled(false)/destroy, not when focus leaves it. Keeping exactly one
    // trap active is the owner's job. See docs/trap-composition.md.
    // Only invoked via the document listener installed in attach(), so the
    // container is always present here.
    const container = this.container;
    if (!container) return;
    if (this.trapped) return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target === container) return;
    if (!container.contains(target)) return;

    if (this.tabInProgress) {
      // Tab moved focus into a child when not trapped. Entry is explicit (Enter
      // or a click from outside), so don't trap here — redirect focus back to
      // the container so it stays the single tab stop. With children parked at
      // tabindex=-1 this rarely fires; it's a guard for browsers that move
      // focus onto a child ignoring tabindex=-1 (e.g. Shift+Tab onto some
      // native elements). Only when enabled — a disabled trap lets Tab pass.
      if (!this.enabled) return;
      e.stopImmediatePropagation();
      container.focus();
      return;
    }

    // Focus entered via non-Tab event (e.g., mouse click) — enter trap if coming from outside.
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const cameFromOutside =
      !relatedTarget || !container.contains(relatedTarget);
    if (cameFromOutside) {
      if (!this.enabled) {
        this.enabled = true;
      }
      this.activateTrap();
      this.updateSlotIndexFromFocus(target);
      // Notify the tile it can select/activate itself (e.g., for tiles with tileHandlesOwnSelection).
      this.strategy.onFocusEnter?.();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.destroyed) return;
    // Only invoked via the document listener installed in attach(), so the
    // container is always present here.
    const container = this.container;
    if (!container) return;
    const target = e.target as HTMLElement | null;
    const isOnContainer = target === container;
    const isInsideContainer = target ? container.contains(target) : false;

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

      // Tab on the container or a child when enabled but not trapped: skip past
      // the whole trap to the next focusable outside it. Entry is explicit
      // (Enter, above, or a click from outside via handleFocusIn) — Tab never
      // enters. Mirrors useFocusTrap's "Tab/Shift+Tab skip past the container
      // and all children when not trapped" behavior.
      if (e.key === "Tab" && (isOnContainer || isInsideContainer)) {
        e.preventDefault();
        const next = findNextFocusableOutside(container, e.shiftKey);
        next?.focus();
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
        const direction: 1 | -1 = reverse ? -1 : 1;
        const nextIndex = this.findNextSlot(this.slotIndex, direction);
        const nextSlotName = this.cycleOrder[nextIndex];
        // Only suppress the native default when the next slot is a regular
        // element. If it's another nativeTabSlot — including a SOLO trap wrapping
        // back into the same iframe — the positioner needs the pending native
        // (Shift+)Tab to descend, so we must NOT preventDefault (mirrors the
        // tabHandler / final-cycle branches below). Preventing it here strands
        // focus on the opposite, invisible sentinel.
        if (!nativeTabSlots.includes(nextSlotName)) e.preventDefault();
        this.slotIndex = nextIndex;
        this.focusSlot(nextSlotName, reverse, "sequentialNavigation");
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
        const nextSlotName = this.cycleOrder[nextIndex];
        if (!(this.strategy.nativeTabSlots ?? []).includes(nextSlotName))
          e.preventDefault();
        this.focusSlot(nextSlotName, reverse, "sequentialNavigation");
        this.emit("cycle", nextSlotName);
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
      const nextSlotName = this.cycleOrder[nextIndex];
      if (!(this.strategy.nativeTabSlots ?? []).includes(nextSlotName))
        e.preventDefault();
      this.focusSlot(nextSlotName, reverse, "sequentialNavigation");
      this.emit("cycle", nextSlotName);
    }
  }

  /**
   * Place focus at a boundary slot for a fresh entry: the first available slot
   * in cycle order, or the last when entering in reverse (Shift+Tab). Syncs
   * slotIndex to the chosen slot.
   */
  private focusEntrySlot(
    reverse = false,
    trigger: FocusContentTrigger = "sequentialNavigation",
    suppressHint = false,
  ): void {
    const elements = this.strategy.getElements();
    const order = this.cycleOrder;
    const start = reverse ? order.length - 1 : 0;
    const end = reverse ? -1 : order.length;
    const step = reverse ? -1 : 1;
    for (let i = start; i !== end; i += step) {
      if (elements[order[i]]) {
        this.slotIndex = i;
        this.focusSlot(order[i], reverse, trigger, suppressHint);
        return;
      }
    }
  }

  private focusSlot(
    slotName: string,
    reverse = false,
    trigger: FocusContentTrigger = "sequentialNavigation",
    suppressHint = false,
  ): void {
    const contentSlot = this.strategy.contentSlot ?? "content";
    const entryMode = reverse ? "reverse" : "forward";
    if (
      slotName === contentSlot &&
      this.strategy.focusContent?.({ entryMode, trigger, suppressHint })
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
    if (!this.container) return false;
    if (this.container.contains(el)) return true;
    const externals = this.strategy.getExternalElements?.() ?? [];
    return externals.some((ext) => ext.contains(el));
  }

  private updateSlotIndexFromFocus(target: HTMLElement): void {
    const idx = findSlotIndexFromFocus(target, this.strategy, this.cycleOrder);
    if (idx !== null) this.slotIndex = idx;
  }

  private setChildrenNonTabbable(): void {
    const container = this.container;
    if (!container) return;
    const focusable = container.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]",
    );
    // Remove stale entries for elements no longer in the container
    for (const [el] of this.savedTabIndices) {
      if (!container.contains(el)) {
        this.savedTabIndices.delete(el);
      }
    }
    const managedSlotEls = getManagedSlotElements(this.strategy);
    // Only save original tabindex if not already saved (preserve originals across multiple calls)
    for (const el of focusable) {
      if (el === container) continue;
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
