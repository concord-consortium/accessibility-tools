/**
 * AccessibilityProvider - debug context for hook-to-sidebar communication.
 *
 * When debug={true}, creates state management for all reporting functions
 * and exposes subscription-based read access for sidebar panels.
 * When debug={false} (default), context value is null - zero overhead.
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
  LogEntry,
} from "./types";

export const AccessibilityReactContext =
  createContext<AccessibilityContextValue | null>(null);

export interface AccessibilityProviderProps {
  children: ReactNode;
  debug?: boolean;
}

const MAX_EVENTS_PER_INSTANCE = 100;
const MAX_LOG_ENTRIES = 200;

export function AccessibilityProvider({
  children,
  debug = false,
}: AccessibilityProviderProps) {
  // Data stores (refs to avoid re-rendering the whole tree)
  const instancesRef = useRef(new Map<string, AccessibilityInstanceState>());
  const instancesVersionRef = useRef(0);
  const instanceSubscribers = useRef(new Set<() => void>());

  const focusTrapEventsRef = useRef(new Map<string, FocusTrapEvent[]>());
  const trapEventsVersionRef = useRef(0);
  const trapEventSubscribers = useRef(new Set<() => void>());

  const logEntriesRef = useRef<LogEntry[]>([]);
  const logVersionRef = useRef(0);
  const logSubscribers = useRef(new Set<() => void>());

  const navsRef = useRef(
    new Map<string, { itemSelector: string; orientation: string }>(),
  );

  // Notify helpers
  const notifyInstances = useCallback(() => {
    instancesVersionRef.current++;
    for (const cb of instanceSubscribers.current) cb();
  }, []);

  const notifyTrapEvents = useCallback(() => {
    trapEventsVersionRef.current++;
    for (const cb of trapEventSubscribers.current) cb();
  }, []);

  const notifyLog = useCallback(() => {
    logVersionRef.current++;
    for (const cb of logSubscribers.current) cb();
  }, []);

  // Write-side: reporting functions
  const registerInstance = useCallback(
    (id: string, state: AccessibilityInstanceState) => {
      instancesRef.current.set(id, state);
      notifyInstances();
    },
    [notifyInstances],
  );

  const unregisterInstance = useCallback(
    (id: string) => {
      instancesRef.current.delete(id);
      focusTrapEventsRef.current.delete(id);
      notifyInstances();
      notifyTrapEvents();
    },
    [notifyInstances, notifyTrapEvents],
  );

  const reportFocusTrapEvent = useCallback(
    (id: string, event: FocusTrapEvent) => {
      const events = focusTrapEventsRef.current.get(id) ?? [];
      events.push(event);
      if (events.length > MAX_EVENTS_PER_INSTANCE) {
        events.splice(0, events.length - MAX_EVENTS_PER_INSTANCE);
      }
      focusTrapEventsRef.current.set(id, events);
      notifyTrapEvents();
    },
    [notifyTrapEvents],
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
      // Navigation State panel will subscribe in a future iteration
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
    (message: string, data?: Record<string, unknown>) => {
      const entries = logEntriesRef.current;
      entries.push({ message, data, timestamp: Date.now() });
      if (entries.length > MAX_LOG_ENTRIES) {
        entries.splice(0, entries.length - MAX_LOG_ENTRIES);
      }
      // Replace array ref so useSyncExternalStore detects the change
      logEntriesRef.current = [...entries];
      notifyLog();
    },
    [notifyLog],
  );

  // Read-side: getters and subscriptions for sidebar panels
  const getInstances = useCallback(() => instancesRef.current, []);

  const subscribeInstances = useCallback((cb: () => void) => {
    instanceSubscribers.current.add(cb);
    return () => {
      instanceSubscribers.current.delete(cb);
    };
  }, []);

  const getFocusTrapEvents = useCallback(() => focusTrapEventsRef.current, []);

  const subscribeFocusTrapEvents = useCallback((cb: () => void) => {
    trapEventSubscribers.current.add(cb);
    return () => {
      trapEventSubscribers.current.delete(cb);
    };
  }, []);

  const getLogEntries = useCallback(() => logEntriesRef.current, []);

  const subscribeLog = useCallback((cb: () => void) => {
    logSubscribers.current.add(cb);
    return () => {
      logSubscribers.current.delete(cb);
    };
  }, []);

  const clearLog = useCallback(() => {
    logEntriesRef.current = [];
    notifyLog();
  }, [notifyLog]);

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
      getInstances,
      subscribeInstances,
      getFocusTrapEvents,
      subscribeFocusTrapEvents,
      getLogEntries,
      subscribeLog,
      clearLog,
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
    getInstances,
    subscribeInstances,
    getFocusTrapEvents,
    subscribeFocusTrapEvents,
    getLogEntries,
    subscribeLog,
    clearLog,
  ]);

  return (
    <AccessibilityReactContext.Provider value={value}>
      {children}
    </AccessibilityReactContext.Provider>
  );
}

/**
 * Returns the debug context value, or null when no provider or debug=false.
 */
export function useAccessibilityContext(): AccessibilityContextValue | null {
  return useContext(AccessibilityReactContext);
}
