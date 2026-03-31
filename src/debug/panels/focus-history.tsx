/**
 * Focus History Log panel.
 *
 * Passive reverse-chronological log of all focus movement. Each row
 * shows the element, component name, timestamp, and duration the
 * element held focus. Click any row to inspect in Element Inspector.
 */

import { useState } from "react";
import {
  describeElement,
  getReactComponentName,
  scrollToAndHighlight,
} from "../utils";
import type { FocusHistoryEntry } from "../utils/use-focus-stream";
import { useFocusStream } from "../utils/use-focus-stream";

interface FocusHistoryProps {
  onNavigateToPanel?: (panelId: string, context?: unknown) => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "...";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isBodyFocus(entry: FocusHistoryEntry): boolean {
  return (
    entry.element === document.body ||
    entry.element === document.documentElement
  );
}

export function FocusHistoryPanel({ onNavigateToPanel }: FocusHistoryProps) {
  const { history } = useFocusStream();
  const [, forceUpdate] = useState(0);

  const clearableCount = history.length;

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Focus History Log</h3>
      <div className="a11y-panel-toolbar">
        <span className="a11y-panel-count">
          {clearableCount} event{clearableCount !== 1 ? "s" : ""}
        </span>
      </div>

      {history.length === 0 ? (
        <div className="a11y-focus-empty">
          No focus events recorded yet. Tab or click in the page to start.
        </div>
      ) : (
        <div
          className="a11y-panel-list"
          role="log"
          aria-label="Focus history events"
        >
          {history.map((entry, i) => {
            const componentName = getReactComponentName(entry.element);
            const tag = entry.element.tagName?.toLowerCase() ?? "unknown";
            const bodyFocus = isBodyFocus(entry);
            const duration = formatDuration(entry.duration);
            const timeStr = formatTime(entry.timestamp);

            return (
              <button
                type="button"
                key={`fh-${entry.timestamp}-${i}`}
                className={`a11y-panel-row a11y-panel-row-clickable ${bodyFocus ? "a11y-focus-history-body" : ""}`}
                aria-label={`${bodyFocus ? "Body focus" : describeElement(entry.element)} at ${timeStr}, held ${duration}`}
                title={`${describeElement(entry.element)}\nHeld: ${duration}\n${timeStr}`}
                onClick={() => {
                  if (!bodyFocus && document.contains(entry.element)) {
                    scrollToAndHighlight(entry.element);
                    forceUpdate((n) => n + 1);
                  }
                  onNavigateToPanel?.("inspector", entry.element);
                }}
              >
                <span
                  className="a11y-focus-history-dot"
                  style={{
                    background: bodyFocus
                      ? "#9ca3af"
                      : stringToColor(componentName ?? tag),
                  }}
                />
                <span className="a11y-focus-history-name">
                  {bodyFocus ? "document.body" : (componentName ?? `<${tag}>`)}
                </span>
                <span className="a11y-focus-history-time">{timeStr}</span>
                <span
                  className="a11y-focus-history-duration"
                  title={`Focus held for ${duration}`}
                >
                  {duration}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Deterministic color from a string. Used to color-code component dots
 * so patterns are visible (e.g., focus bouncing between two components).
 */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}
