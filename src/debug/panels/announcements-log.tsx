/**
 * Announcements Log panel.
 *
 * Passive chronological log of all aria-live region text changes.
 * Uses MutationObserver via the shared live region observer to detect
 * content changes on any [aria-live] element without code changes.
 * The log persists even after announcements are cleared from the DOM.
 */

import { useEffect, useState } from "react";
import type { AnnouncementEvent } from "../utils/live-region-observer";
import { subscribeAnnouncements } from "../utils/live-region-observer";

const MAX_ENTRIES = 100;

export function AnnouncementsLogPanel() {
  const [entries, setEntries] = useState<AnnouncementEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((event) => {
      setEntries((prev) => {
        const next = [event, ...prev];
        if (next.length > MAX_ENTRIES) next.length = MAX_ENTRIES;
        return next;
      });
    });

    return unsubscribe;
  }, []);

  const clearLog = () => setEntries([]);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Announcements Log</h3>
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
          {entries.length} announcement{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="a11y-focus-empty">
          No announcements captured yet. This panel logs text changes in
          aria-live regions. Interact with the page to trigger announcements.
        </div>
      ) : (
        <div
          className="a11y-panel-list"
          role="log"
          aria-label="Screen reader announcements"
        >
          {entries.map((entry, i) => {
            const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const isCleared = entry.text === "";

            return (
              <div
                key={`ann-${entry.timestamp}-${i}`}
                className={`a11y-panel-row a11y-announcement-row ${entry.region.politeness === "assertive" ? "a11y-announcement-assertive" : ""}`}
                title={`${entry.region.politeness}: "${entry.text || "(cleared)"}"\nFrom: ${entry.region.description}\n${timeStr}`}
              >
                <span
                  className={`a11y-announcement-badge a11y-announcement-badge-${entry.region.politeness}`}
                >
                  {entry.region.politeness === "assertive" ? "A" : "P"}
                </span>
                <span className="a11y-panel-text">
                  {isCleared ? (
                    <span className="a11y-announcement-cleared">(cleared)</span>
                  ) : (
                    entry.text
                  )}
                </span>
                {entry.region.componentName && (
                  <span className="a11y-panel-component">
                    {entry.region.componentName}
                  </span>
                )}
                <span className="a11y-announcement-time">{timeStr}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
