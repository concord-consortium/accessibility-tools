/**
 * Custom App Log panel.
 *
 * Shows timestamped log entries from a11y.debug?.log() calls in app code.
 * Reads from the AccessibilityContext via subscriptions.
 */

import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useAccessibilityContext } from "../../hooks/provider";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
}

const noopSubscribe = () => () => {};
const emptyArray: never[] = [];

export function CustomAppLogPanel() {
  const ctx = useAccessibilityContext();

  const entries = useSyncExternalStore(
    ctx?.subscribeLog ?? noopSubscribe,
    () => ctx?.getLogEntries() ?? emptyArray,
  );

  if (!ctx) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Custom App Log</h3>
        <div className="a11y-focus-empty">
          No AccessibilityProvider detected. Wrap your app with{" "}
          <code>{"<AccessibilityProvider debug>"}</code> to enable hook
          reporting.
        </div>
      </div>
    );
  }

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Custom App Log</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          className="a11y-panel-btn"
          onClick={() => ctx.clearLog()}
          disabled={entries.length === 0}
        >
          Clear
        </button>
        <span className="a11y-panel-count">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="a11y-focus-empty">
          No log entries. Use <code>a11y.debug?.log()</code> in your app code to
          log events here.
        </div>
      ) : (
        <div className="a11y-panel-list">
          {entries
            .slice()
            .reverse()
            .map((entry, i) => (
              <div key={entries.length - i} className="a11y-panel-row">
                <span className="a11y-focus-history-time">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="a11y-panel-text">{entry.message}</span>
                {entry.data && (
                  <span className="a11y-panel-component">
                    {JSON.stringify(entry.data)}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
