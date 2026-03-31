/**
 * Keyboard Event Log panel.
 *
 * Global capture-phase keydown listener that logs key events with
 * modifier keys, target element, and whether preventDefault/
 * stopPropagation was called. Monkey-patches Event.prototype to
 * detect prevention/propagation interception.
 */

import { useEffect, useState } from "react";
import { describeElement, getReactComponentName, pluralize } from "../utils";
import { isInsideSidebar } from "../utils/focus-stream";

interface KeyboardLogEntry {
  key: string;
  code: string;
  modifiers: string[];
  targetDescription: string;
  componentName: string | null;
  prevented: boolean;
  stopped: boolean;
  timestamp: number;
}

const MAX_ENTRIES = 50;

export function KeyboardLogPanel() {
  const [entries, setEntries] = useState<KeyboardLogEntry[]>([]);

  useEffect(() => {
    const patchedEvents = new WeakSet<Event>();
    const preventedEvents = new WeakSet<Event>();
    const stoppedEvents = new WeakSet<Event>();

    function patchEvent(e: Event) {
      if (patchedEvents.has(e)) return;
      patchedEvents.add(e);

      const origPD = e.preventDefault.bind(e);
      e.preventDefault = () => {
        preventedEvents.add(e);
        origPD();
      };

      const origSP = e.stopPropagation.bind(e);
      e.stopPropagation = () => {
        stoppedEvents.add(e);
        origSP();
      };

      const origSIP = e.stopImmediatePropagation.bind(e);
      e.stopImmediatePropagation = () => {
        stoppedEvents.add(e);
        origSIP();
      };
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (isInsideSidebar(target)) return;

      patchEvent(e);

      // Defer reading prevented/stopped until after all handlers have run
      requestAnimationFrame(() => {
        const modifiers: string[] = [];
        if (e.metaKey) modifiers.push("Meta");
        if (e.ctrlKey) modifiers.push("Ctrl");
        if (e.altKey) modifiers.push("Alt");
        if (e.shiftKey) modifiers.push("Shift");

        const entry: KeyboardLogEntry = {
          key: e.key,
          code: e.code,
          modifiers,
          targetDescription: describeElement(target),
          componentName: getReactComponentName(target),
          prevented: preventedEvents.has(e),
          stopped: stoppedEvents.has(e),
          timestamp: Date.now(),
        };

        setEntries((prev) => {
          const next = [entry, ...prev];
          if (next.length > MAX_ENTRIES) next.length = MAX_ENTRIES;
          return next;
        });
      });
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  const clearLog = () => setEntries([]);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Keyboard Event Log</h3>
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
          {pluralize(entries.length, "event")}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="a11y-focus-empty">
          No keyboard events captured yet. Press any key in the page to start
          logging.
        </div>
      ) : (
        <div
          className="a11y-panel-list"
          role="log"
          aria-label="Keyboard events"
        >
          {entries.map((entry, i) => {
            const statusClass =
              entry.prevented || entry.stopped
                ? "a11y-kbd-prevented"
                : "a11y-kbd-normal";
            const keyDisplay =
              entry.modifiers.length > 0
                ? `${entry.modifiers.join("+")}+${entry.key}`
                : entry.key;
            const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={`kbd-${entry.timestamp}-${i}`}
                className={`a11y-panel-row ${statusClass}`}
                title={`${keyDisplay} on ${entry.targetDescription}${entry.prevented ? " (preventDefault)" : ""}${entry.stopped ? " (stopPropagation)" : ""}`}
              >
                <span className="a11y-kbd-key">{keyDisplay}</span>
                <span className="a11y-panel-text">
                  {entry.componentName ?? entry.targetDescription}
                </span>
                {entry.prevented && <span className="a11y-kbd-badge">PD</span>}
                {entry.stopped && <span className="a11y-kbd-badge">SP</span>}
                <span className="a11y-kbd-time">{timeStr}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
