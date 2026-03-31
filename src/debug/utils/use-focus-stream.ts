/**
 * React hook wrapping the focus event stream.
 *
 * Subscribes on mount, unsubscribes on unmount. Provides the latest
 * focus event and a full history log. Used by Live Focus Tracker,
 * Focus Loss Detector, and Focus History Log panels.
 */

import { useEffect, useRef, useState } from "react";
import type { A11yFocusEvent } from "./focus-stream";
import { subscribeFocus } from "./focus-stream";

export interface FocusHistoryEntry extends A11yFocusEvent {
  duration: number | null;
}

const MAX_HISTORY = 200;

/**
 * Subscribe to the shared focus event stream.
 * Returns the current focus event and a reverse-chronological history.
 */
export function useFocusStream(): {
  current: A11yFocusEvent | null;
  history: FocusHistoryEntry[];
} {
  const [current, setCurrent] = useState<A11yFocusEvent | null>(null);
  const [history, setHistory] = useState<FocusHistoryEntry[]>([]);
  const lastTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeFocus((event) => {
      setCurrent(event);

      setHistory((prev) => {
        // Update duration of the previous entry
        const updated = [...prev];
        if (updated.length > 0) {
          updated[0] = {
            ...updated[0],
            duration: event.timestamp - updated[0].timestamp,
          };
        }

        const entry: FocusHistoryEntry = {
          ...event,
          duration: null,
        };

        const next = [entry, ...updated];
        if (next.length > MAX_HISTORY) {
          next.length = MAX_HISTORY;
        }
        return next;
      });

      lastTimestampRef.current = event.timestamp;
    });

    return unsubscribe;
  }, []);

  return { current, history };
}
