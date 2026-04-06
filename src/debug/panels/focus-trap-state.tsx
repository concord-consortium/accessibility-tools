/**
 * Focus Trap State panel.
 *
 * Shows registered focus trap instances and their event logs.
 * Reads from the AccessibilityContext via subscriptions.
 * Only active when an AccessibilityProvider with debug={true} wraps the app.
 */

import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useAccessibilityContext } from "../../hooks/provider";
import type { FocusTrapEvent } from "../../hooks/types";
import { describeElement, scrollToAndHighlight } from "../utils";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
}

function eventLabel(event: FocusTrapEvent): string {
  switch (event.type) {
    case "enter":
      return "Entered trap";
    case "exit":
      return "Exited trap";
    case "cycle":
      return `Tab to ${event.slot ?? "?"}`;
  }
}

const noopSubscribe = () => () => {};
const emptyMap = new Map();

export function FocusTrapStatePanel() {
  const ctx = useAccessibilityContext();

  const instances = useSyncExternalStore(
    ctx?.subscribeInstances ?? noopSubscribe,
    () => ctx?.getInstances() ?? emptyMap,
  );

  const trapEvents = useSyncExternalStore(
    ctx?.subscribeFocusTrapEvents ?? noopSubscribe,
    () => ctx?.getFocusTrapEvents() ?? emptyMap,
  );

  if (!ctx) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Focus Trap State</h3>
        <div className="a11y-focus-empty">
          No AccessibilityProvider detected. Wrap your app with{" "}
          <code>{"<AccessibilityProvider debug>"}</code> to enable hook
          reporting.
        </div>
      </div>
    );
  }

  const trapInstances = Array.from(instances.entries()).filter(
    ([, state]) => state.hookType === "focusTrap",
  );

  if (trapInstances.length === 0) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Focus Trap State</h3>
        <div className="a11y-focus-empty">
          No focus trap instances registered. Components using{" "}
          <code>useFocusTrap</code> will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Focus Trap State</h3>
      <div className="a11y-panel-count">
        {trapInstances.length} instance{trapInstances.length !== 1 ? "s" : ""}
      </div>

      {trapInstances.map(([id, state]) => {
        const events = trapEvents.get(id) ?? [];
        const lastEvent = events[events.length - 1];
        const isActive =
          lastEvent?.type === "enter" || lastEvent?.type === "cycle";

        return (
          <div
            key={id}
            className={`a11y-trap-card ${isActive ? "a11y-trap-card-active" : ""}`}
          >
            <div className="a11y-trap-header">
              {isActive && <span className="a11y-trap-active-indicator" />}
              <span className="a11y-trap-badge a11y-trap-badge-intentional">
                {isActive ? "active" : "idle"}
              </span>
            </div>

            {state.containerElement && (
              <button
                type="button"
                className="a11y-panel-row a11y-panel-row-clickable"
                aria-label={`Locate trap container: ${describeElement(state.containerElement)}`}
                onClick={() => {
                  if (state.containerElement) {
                    scrollToAndHighlight(state.containerElement);
                  }
                }}
              >
                <span className="a11y-panel-tag">container</span>
                <span className="a11y-panel-text">
                  {describeElement(state.containerElement)}
                </span>
              </button>
            )}

            {events.length > 0 && (
              <div className="a11y-panel-list" style={{ marginTop: 4 }}>
                {events
                  .slice(-10)
                  .reverse()
                  .map((event: FocusTrapEvent, i: number) => (
                    <div
                      key={`${id}-${events.length - i}`}
                      className="a11y-panel-row"
                    >
                      <span className="a11y-focus-history-time">
                        {formatTime(event.timestamp)}
                      </span>
                      <span className="a11y-panel-text">
                        {eventLabel(event)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
