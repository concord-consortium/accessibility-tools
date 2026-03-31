/**
 * Screen Reader Text Preview panel.
 *
 * Shows what a screen reader would announce for the currently focused
 * element. Computes accessible name, role, and states using
 * dom-accessibility-api. Updates live as focus moves.
 */

import { useEffect, useState } from "react";
import { getReactComponentName, getReactFiberPath } from "../utils";
import {
  type AccessibleInfo,
  computeAccessibleInfo,
  formatAnnouncement,
} from "../utils/accname";
import { useFocusStream } from "../utils/use-focus-stream";

export function ScreenReaderPreviewPanel() {
  const { current } = useFocusStream();
  const [info, setInfo] = useState<AccessibleInfo | null>(null);

  useEffect(() => {
    if (!current) return;
    setInfo(computeAccessibleInfo(current.element));
  }, [current]);

  if (!current || !info) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Screen Reader Text Preview</h3>
        <div className="a11y-focus-empty">
          Focus an element to see what a screen reader would announce. Tab or
          click into the page to start.
        </div>
      </div>
    );
  }

  const el = current.element;
  const tag = el.tagName?.toLowerCase() ?? "unknown";
  const componentName = getReactComponentName(el);
  const fiberPath = getReactFiberPath(el);
  const announcement = formatAnnouncement(info);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Screen Reader Text Preview</h3>

      {/* Announcement preview */}
      <div className="a11y-sr-announcement">
        {announcement || (
          <span className="a11y-sr-empty-name">
            (nothing announced - no accessible name or role)
          </span>
        )}
      </div>

      {/* Breakdown */}
      <div className="a11y-focus-attrs">
        <div className="a11y-focus-attr">
          <span className="a11y-focus-attr-key">name</span>
          <span className="a11y-focus-attr-value">
            {info.name || <span className="a11y-sr-empty-name">(empty)</span>}
          </span>
        </div>
        {info.description && (
          <div className="a11y-focus-attr">
            <span className="a11y-focus-attr-key">description</span>
            <span className="a11y-focus-attr-value">{info.description}</span>
          </div>
        )}
        <div className="a11y-focus-attr">
          <span className="a11y-focus-attr-key">role</span>
          <span className="a11y-focus-attr-value">{info.role || "(none)"}</span>
        </div>
        {info.states.length > 0 && (
          <div className="a11y-focus-attr">
            <span className="a11y-focus-attr-key">states</span>
            <span className="a11y-focus-attr-value">
              {info.states.join(", ")}
            </span>
          </div>
        )}
        <div className="a11y-focus-attr">
          <span className="a11y-focus-attr-key">element</span>
          <span className="a11y-focus-attr-value">
            {componentName ? `${componentName} ` : ""}&lt;{tag}&gt;
          </span>
        </div>
      </div>

      {/* Warning for empty name on interactive elements */}
      {!info.name && info.role && (
        <div className="a11y-inspector-warning" style={{ marginTop: 8 }}>
          No accessible name - screen reader will only announce the role
        </div>
      )}

      {/* Component path */}
      {fiberPath.length > 0 && (
        <div className="a11y-focus-path">
          <span className="a11y-focus-path-label">Component path:</span>
          <div className="a11y-focus-breadcrumb">
            {fiberPath.map((name, i) => (
              <span key={`path-${i}`} className="a11y-focus-breadcrumb-item">
                {i > 0 && (
                  <span className="a11y-focus-breadcrumb-sep">{" > "}</span>
                )}
                <span
                  className={
                    i === fiberPath.length - 1
                      ? "a11y-focus-breadcrumb-current"
                      : ""
                  }
                >
                  {name}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
