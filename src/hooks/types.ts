/**
 * Core types for the accessibility hook system.
 *
 * The generic package handles keyboard mechanics (which key does what).
 * Apps provide a FocusTrapStrategy that handles lifecycle (where elements
 * are, what to announce, what happens on enter/exit).
 */

import type { RefObject } from "react";

// ---------------------------------------------------------------------------
// Focus Trap Strategy (provided by consuming apps)
// ---------------------------------------------------------------------------

export interface FocusTrapStrategy {
  /** Elements in the trap, keyed by slot name (e.g., "title", "toolbar", "content"). */
  getElements: () => Record<string, HTMLElement | undefined>;

  /** Custom focus for complex editors (Slate, CodeMirror, etc.). Return true to skip default .focus(). */
  focusContent?: () => boolean;

  /** Called when entering/exiting the trap. */
  onEnter?: () => void;
  onExit?: () => void;

  /** Tab cycle order through slots. Default: ["title", "toolbar", "content"]. */
  cycleOrder?: string[];

  /** Screen reader announcements on enter/exit. */
  announceEnter?: string;
  announceExit?: string;

  /** Elements outside the container DOM that are part of the trap (e.g., portaled toolbars). */
  getExternalElements?: () => HTMLElement[];
}

// ---------------------------------------------------------------------------
// Focus Trap Config (passed to useFocusTrap / useAccessibility)
// ---------------------------------------------------------------------------

export interface FocusTrapConfig {
  containerRef: RefObject<HTMLElement | null>;
  strategy: FocusTrapStrategy;
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
