/**
 * Navigation State panel.
 *
 * Shows registered keyboard navigation instances and their state.
 * Reads from the AccessibilityContext via subscriptions.
 */

import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useAccessibilityContext } from "../../hooks/provider";

const noopSubscribe = () => () => {};

export function NavStatePanel() {
  const ctx = useAccessibilityContext();

  // Use a version counter to detect changes (Map ref is stable)
  const instanceVersion = useSyncExternalStore(
    ctx?.subscribeInstances ?? noopSubscribe,
    () => ctx?.getInstances()?.size ?? 0,
  );
  const instances = ctx?.getInstances();

  if (!ctx || !instances) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Navigation State</h3>
        <div className="a11y-focus-empty">
          No AccessibilityProvider detected. Wrap your app with{" "}
          <code>{"<AccessibilityProvider debug>"}</code> to enable hook
          reporting.
        </div>
      </div>
    );
  }

  // instanceVersion used to trigger re-render when instances change
  void instanceVersion;
  const navInstances = Array.from(instances.entries()).filter(
    ([, state]) => state.hookType === "navigation",
  );

  if (navInstances.length === 0) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Navigation State</h3>
        <div className="a11y-focus-empty">
          No keyboard navigation instances registered. Components using{" "}
          <code>useKeyboardNav</code> will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Navigation State</h3>
      <div className="a11y-panel-count">
        {navInstances.length} instance{navInstances.length !== 1 ? "s" : ""}
      </div>

      {navInstances.map(([id, state]) => (
        <div key={id} className="a11y-panel-group">
          <div className="a11y-panel-group-header">
            <span className="a11y-panel-tag">navigation</span>
          </div>
          {state.containerElement && (
            <div className="a11y-panel-row">
              <span className="a11y-focus-attr-key">container</span>
              <span className="a11y-focus-attr-value">
                {state.containerElement.tagName.toLowerCase()}
                {state.containerElement.id
                  ? `#${state.containerElement.id}`
                  : ""}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
