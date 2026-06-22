/**
 * Core types for the accessibility hook system.
 *
 * The generic package handles keyboard mechanics (which key does what).
 * Apps provide a FocusTrapStrategy that handles lifecycle (where elements
 * are, what to announce, what happens on enter/exit).
 */

import type { RefObject } from "react";
import type { FocusTrapController } from "./focus-trap-controller";

// ---------------------------------------------------------------------------
// Focus Trap Strategy (provided by consuming apps)
// ---------------------------------------------------------------------------

export type TabHandlerResult = "handled" | "exit";

// Same shape as TabHandlerResult; left as a distinct type for now in case
// future handler types diverge. Can be unified if a third clone appears.
export type EscapeHandlerResult = "handled" | "exit";

/**
 * What triggered a focusContent call — the browser-navigation function behind
 * the entry, NOT the literal key. See §3/§4 of specs/2026-06-09-iframe-slot-support.md.
 * - "sequentialNavigation": a live sequential-focus-navigation keypress (the
 *   Tab key's browser function) is being processed, so the browser has a
 *   pending native focus advance to descend with ⇒ positioner mode.
 * - "programmatic": entry with no pending native focus advance — enterTrap,
 *   cycleToAdjacentSlot (wrap-around), or restore ⇒ landing mode. (Note an
 *   Enter/click that engages the trap is a keydown but is still "programmatic"
 *   here, because it carries no pending focus advance.)
 */
export type FocusContentTrigger = "sequentialNavigation" | "programmatic";

export type FocusContentContext = {
  /**
   * Direction the trap is entering the content slot.
   * - "forward": cycling forward (Tab from previous slot, or initial entry).
   * - "reverse": cycling backward (Shift+Tab from next slot).
   */
  entryMode: "forward" | "reverse";

  /**
   * Whether this call rides the browser's pending native focus advance
   * ("sequentialNavigation" ⇒ positioner: focus the sentinel silently so the
   * pending Tab default descends) or is a programmatic entry with no such
   * advance ("programmatic" ⇒ landing: place a visible, labeled
   * "Press Tab to enter …" hint (non-cooperating) or send focusEnter
   * (cooperating)).
   */
  trigger: FocusContentTrigger;

  /**
   * Suppress the *visible* hint for this entry (default false). When true, a slot
   * that would otherwise show a hint (a non-cooperating iframe) focuses its
   * sentinel quietly: focus still rests there and a screen reader still reads the
   * sentinel text, but no visible "Press Tab …" affordance appears. Used by a host
   * for pointer-driven entries (e.g. a mouse-opened dialog). Cooperating slots and
   * normal focusable slots are unaffected.
   */
  suppressHint?: boolean;
};

export interface FocusTrapStrategy {
  /** Elements in the trap, keyed by slot name (e.g., "title", "toolbar", "content"). */
  getElements: () => Record<string, HTMLElement | undefined>;

  /**
   * Custom focus-the-content callback. Called when the trap enters the
   * content slot. Receives a context object (see FocusContentContext) so
   * additional fields can be added over time.
   */
  focusContent?: (context: FocusContentContext) => boolean;

  /** Which slot name focusContent applies to. Default: "content". */
  contentSlot?: string;

  /** Called when entering/exiting the trap. */
  onEnter?: () => void;
  onExit?: () => void;

  /** Tab cycle order through slots. Default: ["title", "toolbar", "content"]. */
  cycleOrder?: string[];

  /** Screen reader announcements on enter/exit. */
  announceEnter?: string;
  announceExit?: string;

  /** Slots where Tab navigates through focusable children before cycling to the next slot.
   *  Slots not listed cycle immediately on Tab. Default: [] (all slots cycle immediately). */
  tabWithinSlots?: string[];

  /**
   * Slot names whose entry hands off to the browser's native Tab traversal
   * (§1). When the trap cycles INTO one of these slots it calls focusContent
   * (the positioner) but does NOT call preventDefault, so the browser's
   * default Tab action runs from the now-focused sentinel and descends into
   * the iframe. Default: [].
   */
  nativeTabSlots?: string[];

  /**
   * For a slot in `nativeTabSlots`: the slot's before/after sentinel elements
   * (§3). When a Tab keydown fires while the current slot is this slot, focus
   * is resting on one of these sentinels; the trap uses these to resolve the
   * "Tab from a resting sentinel" four cases. Returns nulls for unknown slots.
   */
  getNativeTabSlotSentinels?: (slotName: string) => {
    before: HTMLElement | null;
    after: HTMLElement | null;
  };

  /** Elements outside the container DOM that are part of the trap (e.g., portaled toolbars). */
  getExternalElements?: () => HTMLElement[];

  /** Slot name (in cycleOrder) that getExternalElements() belongs to. Used to
   *  resolve slotIndex when focus enters an external element (e.g. a portaled
   *  toolbar). If omitted, focus into externals leaves slotIndex unchanged. */
  externalElementsSlot?: string;

  /**
   * Per-slot custom Tab handler. Called from the controller's keydown listener
   * when Tab is pressed and focus is in this slot. Return "handled" to take
   * over (the handler is responsible for preventDefault and focus movement);
   * return "exit" to let the controller advance to the next slot.
   * Takes precedence over `tabWithinSlots` for slots that have both.
   *
   * **Managed-for-tabindex semantic:** any slot present in `tabHandlers` is
   * treated as managing its own tabindex. The trap's mount-time
   * `setChildrenNonTabbable` will not mutate `tabindex` on the slot's element
   * or its descendants — the slot is responsible for whatever roving /
   * tabindex pattern it uses internally (e.g. RDG, custom widgets).
   */
  tabHandlers?: Record<
    string,
    (event: KeyboardEvent, reverse: boolean) => TabHandlerResult
  >;

  /**
   * Per-slot custom Escape handler. Return "handled" to suppress the trap's
   * default exit (the handler is responsible for whatever should happen);
   * return "exit" to fall through to the controller's standard exit logic.
   */
  escapeHandlers?: Record<
    string,
    (event: KeyboardEvent) => EscapeHandlerResult
  >;

  /** Called when Tab is pressed but the trap is not active (enabled=false or not yet entered).
   *  Return true to prevent default Tab behavior. */
  onTabWhenInactive?: (e: KeyboardEvent, reverse: boolean) => boolean;

  /** Called when focus enters the container from outside via a non-Tab event (e.g., mouse click).
   *  Use this to select/activate the tile so it becomes part of the keyboard navigation flow. */
  onFocusEnter?: () => void;
}

// ---------------------------------------------------------------------------
// Focus Trap Config (passed to useFocusTrap / useAccessibility)
// ---------------------------------------------------------------------------

export interface FocusTrapConfig {
  strategy: FocusTrapStrategy;
  /** When false, the trap is dormant — no Tab interception, no Enter activation.
   *  When true, Tab cycles within slots and Enter on the container enters the trap.
   *  Defaults to true. */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Future hook configs (stubs - implemented in later phases)
// ---------------------------------------------------------------------------

export interface NavigationConfig {
  containerRef: RefObject<HTMLElement | null>;
  itemSelector: string;
  orientation: "horizontal" | "vertical" | "grid";
  columns?: number;
  wrap?: boolean;
  focusRing?: boolean;
  onSelect?: (element: HTMLElement, index: number) => void;
  onFocusChange?: (element: HTMLElement, index: number) => void;
}

export interface AnnouncementsConfig {
  selectedItems: ReadonlyArray<string> | ReadonlySet<string>;
  getLabel: (id: string) => string;
  multiSelectMessage?: string;
  announceRef?: RefObject<HTMLElement | null>;
  debounceMs?: number;
}

export interface ResizableConfig {
  orientation: "horizontal" | "vertical";
  value: number;
  min?: number;
  max?: number;
  step?: number;
  largeStep?: number;
  onResize: (value: number) => void;
  label: string;
  /** ARIA role for the handle. Use "separator" for split pane dividers. Omit for button elements. */
  role?: string;
}

// ---------------------------------------------------------------------------
// Uber-hook options and result
// ---------------------------------------------------------------------------

export interface AccessibilityOptions {
  focusTrap?: FocusTrapConfig;
  navigation?: NavigationConfig;
  announcements?: AnnouncementsConfig;
  resize?: ResizableConfig;
}

export interface NavigationResult {
  activeIndex: number;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  getItemProps: (index: number) => Record<string, unknown>;
}

export interface ResizableResult {
  resizeHandleProps: Record<string, unknown>;
}

export interface AccessibilityResult {
  navigation: NavigationResult | null;
  resizable: ResizableResult | null;
  focusTrap: FocusTrapController | null;
  debug: AccessibilityDebugHandle | null;
}

// ---------------------------------------------------------------------------
// Debug context (internal - hooks report through this)
// ---------------------------------------------------------------------------

export interface FocusTrapEvent {
  type: "enter" | "exit" | "cycle";
  slot?: string;
  timestamp: number;
}

export interface AccessibilityInstanceState {
  hookType: "focusTrap" | "navigation" | "announcements" | "resize";
  containerElement?: HTMLElement | null;
}

export interface KeyboardEventReport {
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: string;
  prevented: boolean;
  stopped: boolean;
  timestamp: number;
}

export interface LogEntry {
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface AccessibilityContextValue {
  // Write-side: hooks call these to report state
  registerInstance: (id: string, state: AccessibilityInstanceState) => void;
  unregisterInstance: (id: string) => void;
  reportFocusTrapEvent: (id: string, event: FocusTrapEvent) => void;
  registerNav: (
    id: string,
    config: { itemSelector: string; orientation: string },
  ) => void;
  unregisterNav: (id: string) => void;
  reportNavState: (
    id: string,
    state: { activeIndex: number; totalItems: number },
  ) => void;
  reportAnnouncement: (
    text: string,
    level: "polite" | "assertive",
    source: string,
  ) => void;
  reportKeyEvent: (event: KeyboardEventReport) => void;
  log: (message: string, data?: Record<string, unknown>) => void;

  // Read-side: sidebar panels subscribe to reported data
  getInstances: () => Map<string, AccessibilityInstanceState>;
  subscribeInstances: (cb: () => void) => () => void;
  getFocusTrapEvents: () => Map<string, FocusTrapEvent[]>;
  subscribeFocusTrapEvents: (cb: () => void) => () => void;
  getLogEntries: () => LogEntry[];
  subscribeLog: (cb: () => void) => () => void;
  clearLog: () => void;
}

/** Subset of debug context safe for app use. */
export interface AccessibilityDebugHandle {
  log: (message: string, data?: Record<string, unknown>) => void;
  reportKeyEvent: (event: KeyboardEventReport) => void;
  reportAnnouncement: (text: string, level: "polite" | "assertive") => void;
}
