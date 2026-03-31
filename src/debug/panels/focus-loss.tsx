/**
 * Focus Loss Detector panel.
 *
 * Monitors for focus silently falling to document.body - one of the
 * most common a11y bugs. Shows a warning log with the element that
 * was focused before the loss, a likely cause, and a timestamp.
 */

import { useEffect, useState } from "react";
import {
  describeElement,
  highlightElement,
  removeHighlight,
  scrollToAndHighlight,
} from "../utils";
import { isInsideSidebar } from "../utils/focus-stream";

interface FocusLossEntry {
  previousElementRef: WeakRef<Element>;
  previousDescription: string;
  timestamp: number;
  cause: string;
}

function detectCause(previousElement: Element): string {
  if (!document.contains(previousElement)) {
    return "Element removed from DOM";
  }
  if (previousElement instanceof HTMLElement) {
    const style = getComputedStyle(previousElement);
    if (style.display === "none") return "display:none applied";
    if (style.visibility === "hidden") return "visibility:hidden applied";
  }
  if (
    previousElement instanceof HTMLButtonElement ||
    previousElement instanceof HTMLInputElement ||
    previousElement instanceof HTMLSelectElement ||
    previousElement instanceof HTMLTextAreaElement
  ) {
    if (previousElement.disabled) return "disabled attribute set";
  }
  return "Unknown cause";
}

export function FocusLossPanel() {
  const [entries, setEntries] = useState<FocusLossEntry[]>([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Use focusout + rAF to detect when focus falls to body.
    // The browser fires focusout on the removed element but does NOT
    // fire focusin on document.body, so subscribeFocus misses this.
    const handleFocusOut = (e: FocusEvent) => {
      const lostElement = e.target;
      if (!(lostElement instanceof Element)) return;
      if (isInsideSidebar(lostElement)) return;

      // Skip if focus is moving to another element (relatedTarget)
      if (e.relatedTarget instanceof Element) return;

      // Wait one frame for the browser to settle activeElement
      requestAnimationFrame(() => {
        const active = document.activeElement;
        const focusOnBody =
          !active ||
          active === document.body ||
          active === document.documentElement;
        if (!focusOnBody) return;

        const entry: FocusLossEntry = {
          previousElementRef: new WeakRef(lostElement),
          previousDescription: describeElement(lostElement),
          timestamp: Date.now(),
          cause: detectCause(lostElement),
        };

        setEntries((prev) => {
          const next = [entry, ...prev];
          if (next.length > 100) next.length = 100;
          return next;
        });
      });
    };

    document.addEventListener("focusout", handleFocusOut, true);
    return () => {
      document.removeEventListener("focusout", handleFocusOut, true);
    };
  }, []);

  const clearLog = () => setEntries([]);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Focus Loss Detector</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={clearLog}
          className="a11y-panel-btn"
          disabled={entries.length === 0}
        >
          Clear
        </button>
        <span className="a11y-panel-count">
          {entries.length} loss event{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="a11y-focus-empty">
          No focus loss detected. Focus losses occur when focus silently falls
          to document.body after the focused element is removed, hidden, or
          disabled.
        </div>
      ) : (
        <div
          className="a11y-panel-list"
          role="log"
          aria-label="Focus loss events"
        >
          {entries.map((entry, i) => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return (
              <button
                type="button"
                key={`loss-${entry.timestamp}-${i}`}
                className="a11y-panel-row a11y-panel-row-clickable a11y-panel-row-error"
                aria-label={`Focus lost from ${entry.previousDescription} at ${timeStr}: ${entry.cause}`}
                title={`${entry.previousDescription}\n${entry.cause}\n${timeStr}`}
                onClick={() => {
                  const el = entry.previousElementRef.deref();
                  if (el && document.contains(el)) {
                    scrollToAndHighlight(el, { color: "#dc2626" });
                  } else {
                    highlightElement(document.body, { color: "#dc2626" });
                  }
                  forceUpdate((n) => n + 1);
                }}
              >
                <span className="a11y-focus-loss-time">{timeStr}</span>
                <span className="a11y-panel-text">
                  {entry.previousDescription}
                </span>
                <span className="a11y-focus-loss-cause">{entry.cause}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
