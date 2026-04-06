/**
 * AccessibilityProvider - debug context for hook-to-sidebar communication.
 *
 * When debug={true}, creates state management for all reporting functions.
 * When debug={false} (default), context value is null - zero overhead.
 * Hooks use optional chaining (ctx?.reportX) so calls are no-ops in production.
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import type {
  AccessibilityContextValue,
  AccessibilityInstanceState,
  FocusTrapEvent,
  KeyboardEventReport,
} from "./types";

export const AccessibilityReactContext =
  createContext<AccessibilityContextValue | null>(null);

export interface AccessibilityProviderProps {
  children: ReactNode;
  debug?: boolean;
}

export function AccessibilityProvider({
  children,
  debug = false,
}: AccessibilityProviderProps) {
  const instancesRef = useRef(new Map<string, AccessibilityInstanceState>());
  const navsRef = useRef(
    new Map<string, { itemSelector: string; orientation: string }>(),
  );

  const registerInstance = useCallback(
    (id: string, state: AccessibilityInstanceState) => {
      instancesRef.current.set(id, state);
    },
    [],
  );

  const unregisterInstance = useCallback((id: string) => {
    instancesRef.current.delete(id);
  }, []);

  const reportFocusTrapEvent = useCallback(
    (_id: string, _event: FocusTrapEvent) => {
      // Sidebar panels can subscribe to these events in a future iteration
    },
    [],
  );

  const registerNav = useCallback(
    (id: string, config: { itemSelector: string; orientation: string }) => {
      navsRef.current.set(id, config);
    },
    [],
  );

  const unregisterNav = useCallback((id: string) => {
    navsRef.current.delete(id);
  }, []);

  const reportNavState = useCallback(
    (_id: string, _state: { activeIndex: number; totalItems: number }) => {
      // Sidebar panels can subscribe to these in a future iteration
    },
    [],
  );

  const reportAnnouncement = useCallback(
    (_text: string, _level: "polite" | "assertive", _source: string) => {
      // Sidebar Announcements Log can subscribe in a future iteration
    },
    [],
  );

  const reportKeyEvent = useCallback((_event: KeyboardEventReport) => {
    // Sidebar Keyboard Event Log can subscribe in a future iteration
  }, []);

  const log = useCallback(
    (_message: string, _data?: Record<string, unknown>) => {
      // Sidebar Custom App Log can subscribe in a future iteration
    },
    [],
  );

  const value = useMemo<AccessibilityContextValue | null>(() => {
    if (!debug) return null;
    return {
      registerInstance,
      unregisterInstance,
      reportFocusTrapEvent,
      registerNav,
      unregisterNav,
      reportNavState,
      reportAnnouncement,
      reportKeyEvent,
      log,
    };
  }, [
    debug,
    registerInstance,
    unregisterInstance,
    reportFocusTrapEvent,
    registerNav,
    unregisterNav,
    reportNavState,
    reportAnnouncement,
    reportKeyEvent,
    log,
  ]);

  return (
    <AccessibilityReactContext.Provider value={value}>
      {children}
    </AccessibilityReactContext.Provider>
  );
}

/**
 * Returns the debug context value, or null when no provider or debug=false.
 * Hooks use this internally to report state with zero overhead in production.
 */
export function useAccessibilityContext(): AccessibilityContextValue | null {
  return useContext(AccessibilityReactContext);
}
