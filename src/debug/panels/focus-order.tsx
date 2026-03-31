/**
 * Focus Order Recorder panel.
 *
 * Records a sequence of focus events on demand (start/stop), then
 * displays the recorded order with element details. Supports export
 * to markdown or JSON.
 */

import { useEffect, useRef, useState } from "react";
import {
  describeElement,
  getReactComponentName,
  scrollToAndHighlight,
} from "../utils";
import type { A11yFocusEvent } from "../utils/focus-stream";
import { subscribeFocus } from "../utils/focus-stream";
import { showToast } from "../utils/toast";

interface RecordedEntry {
  elementRef: WeakRef<Element>;
  tag: string;
  id: string;
  ariaLabel: string | null;
  description: string;
  componentName: string | null;
  timestamp: number;
}

export function FocusOrderPanel() {
  const [recording, setRecording] = useState(false);
  const [entries, setEntries] = useState<RecordedEntry[]>([]);
  const [, forceUpdate] = useState(0);
  const unsubRef = useRef<(() => void) | null>(null);

  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

  const startRecording = () => {
    setEntries([]);
    setRecording(true);

    const unsub = subscribeFocus((event: A11yFocusEvent) => {
      const el = event.element;
      const entry: RecordedEntry = {
        elementRef: new WeakRef(el),
        tag: el.tagName?.toLowerCase() ?? "unknown",
        id: el.id || "",
        ariaLabel: el.getAttribute("aria-label"),
        description: describeElement(el),
        componentName: getReactComponentName(el),
        timestamp: event.timestamp,
      };
      setEntries((prev) => [...prev, entry]);
    });

    unsubRef.current = unsub;
  };

  const stopRecording = () => {
    setRecording(false);
    unsubRef.current?.();
    unsubRef.current = null;
  };

  const clearRecording = () => {
    stopRecording();
    setEntries([]);
  };

  const exportMarkdown = () => {
    if (entries.length === 0) return;

    const lines: string[] = [];
    lines.push("## Focus Order Recording");
    lines.push("");
    lines.push(`Recorded: ${new Date().toISOString()}`);
    lines.push(`Events: ${entries.length}`);
    lines.push("");
    lines.push("| # | Element | Component | Time |");
    lines.push("|---|---|---|---|");

    const startTime = entries[0].timestamp;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const elapsed = entry.timestamp - startTime;
      const esc = (s: string) => s.replace(/\|/g, "\\|");
      lines.push(
        `| ${i + 1} | ${esc(entry.description)} | ${esc(entry.componentName ?? "-")} | +${elapsed}ms |`,
      );
    }

    const md = lines.join("\n");
    navigator.clipboard.writeText(md).then(
      () => showToast("Focus order copied to clipboard"),
      () => showToast("Failed to copy - check clipboard permissions"),
    );
  };

  const exportJson = () => {
    if (entries.length === 0) return;

    const startTime = entries[0].timestamp;
    const data = entries.map((entry, i) => ({
      order: i + 1,
      element: entry.description,
      componentName: entry.componentName,
      elapsed: entry.timestamp - startTime,
    }));

    const json = JSON.stringify(
      {
        type: "focus-order-recording",
        recorded: new Date().toISOString(),
        events: data,
      },
      null,
      2,
    );

    navigator.clipboard.writeText(json).then(
      () => showToast("Focus order JSON copied to clipboard"),
      () => showToast("Failed to copy - check clipboard permissions"),
    );
  };

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Focus Order Recorder</h3>
      <div className="a11y-panel-toolbar">
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="a11y-panel-btn a11y-panel-btn-active"
            aria-label="Stop recording focus order"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="a11y-panel-btn"
            aria-label="Start recording focus order"
          >
            Record
          </button>
        )}
        <button
          type="button"
          onClick={clearRecording}
          className="a11y-panel-btn"
          disabled={entries.length === 0 && !recording}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={exportMarkdown}
          className="a11y-panel-btn"
          disabled={entries.length === 0}
          aria-label="Export as markdown to clipboard"
        >
          Export
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="a11y-panel-btn"
          disabled={entries.length === 0}
          aria-label="Export as JSON to clipboard"
        >
          JSON
        </button>
      </div>

      {recording && (
        <div className="a11y-recorder-status">
          <span className="a11y-recorder-dot" />
          Recording... ({entries.length} event{entries.length !== 1 ? "s" : ""})
        </div>
      )}

      {!recording && entries.length === 0 ? (
        <div className="a11y-focus-empty">
          Click "Record" then Tab through the page. Click "Stop" when done. The
          recorded focus order can be exported as markdown or JSON.
        </div>
      ) : (
        <div className="a11y-panel-list">
          {entries.map((entry, i) => (
            <button
              type="button"
              key={`fo-${entry.timestamp}-${i}`}
              className="a11y-panel-row a11y-panel-row-clickable"
              aria-label={`Step ${i + 1}: ${entry.description}`}
              title={entry.description}
              onClick={() => {
                const el = entry.elementRef.deref();
                if (el && document.contains(el)) {
                  scrollToAndHighlight(el);
                  forceUpdate((n) => n + 1);
                }
              }}
            >
              <span className="a11y-recorder-order">{i + 1}</span>
              {entry.componentName && (
                <span className="a11y-panel-component-name">
                  {entry.componentName}
                </span>
              )}
              <span className="a11y-panel-tag">&lt;{entry.tag}&gt;</span>
              <span className="a11y-panel-text">
                {entry.id ? `#${entry.id}` : (entry.ariaLabel ?? "")}
              </span>
            </button>
          ))}
        </div>
      )}

      {!recording && entries.length > 0 && (
        <div className="a11y-panel-toolbar" style={{ marginTop: 8 }}>
          <span className="a11y-panel-count">
            {entries.length} step{entries.length !== 1 ? "s" : ""} recorded
          </span>
        </div>
      )}
    </div>
  );
}
