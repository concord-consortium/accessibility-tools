/**
 * Live Focus Tracker panel.
 *
 * Shows the currently focused element with its React component name,
 * tag, attributes, and a breadcrumb path from root. Highlights the
 * focused element in the page with an overlay outline.
 */

import { useEffect, useState } from "react";
import {
  describeElement,
  getReactComponentName,
  getReactFiberPath,
  highlightElement,
  removeHighlight,
} from "../utils";
import { useFocusStream } from "../utils/use-focus-stream";

interface FocusTrackerProps {
  onNavigateToPanel?: (panelId: string, context?: unknown) => void;
}

export function FocusTrackerPanel({ onNavigateToPanel }: FocusTrackerProps) {
  const { current } = useFocusStream();
  const [trackHighlight, setTrackHighlight] = useState(true);

  // Highlight the currently focused element
  useEffect(() => {
    if (!current) return;
    if (trackHighlight) {
      highlightElement(current.element, { color: "#2563eb" });
    }
  }, [current, trackHighlight]);

  // Clean up highlight on unmount
  useEffect(() => {
    return () => {
      removeHighlight();
    };
  }, []);

  if (!current) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Live Focus Tracker</h3>
        <div className="a11y-panel-toolbar">
          <span className="a11y-panel-count">
            Tab or click an element to begin tracking
          </span>
        </div>
        <div className="a11y-focus-empty">
          No focus events captured yet. Click or Tab into the page to start.
        </div>
      </div>
    );
  }

  const el = current.element;
  const componentName = getReactComponentName(el);
  const fiberPath = getReactFiberPath(el);
  const tag = el.tagName?.toLowerCase() ?? "unknown";
  const role = el.getAttribute("role");
  const ariaLabel = el.getAttribute("aria-label");
  const tabIndex = el.getAttribute("tabindex");
  const id = el.id || null;
  const classAttr = el.getAttribute("class") || null;

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Live Focus Tracker</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          className={`a11y-panel-btn ${trackHighlight ? "a11y-panel-btn-active" : ""}`}
          aria-pressed={trackHighlight}
          onClick={() => {
            setTrackHighlight((v) => {
              if (v) removeHighlight();
              return !v;
            });
          }}
        >
          Highlight
        </button>
        <button
          type="button"
          className="a11y-panel-btn"
          aria-label="Inspect this element in the Element Inspector"
          onClick={() => onNavigateToPanel?.("inspector", current.element)}
        >
          Inspect
        </button>
      </div>

      {/* Current element info */}
      <div className="a11y-focus-current">
        <div className="a11y-focus-element-name">
          {componentName && (
            <span className="a11y-panel-component-name">{componentName}</span>
          )}
          <span className="a11y-panel-tag">&lt;{tag}&gt;</span>
        </div>

        <div className="a11y-focus-attrs">
          {id && (
            <div className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">id</span>
              <span className="a11y-focus-attr-value">{id}</span>
            </div>
          )}
          {role && (
            <div className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">role</span>
              <span className="a11y-focus-attr-value">{role}</span>
            </div>
          )}
          {ariaLabel && (
            <div className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">aria-label</span>
              <span className="a11y-focus-attr-value">{ariaLabel}</span>
            </div>
          )}
          {tabIndex !== null && (
            <div className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">tabIndex</span>
              <span className="a11y-focus-attr-value">{tabIndex}</span>
            </div>
          )}
          {classAttr && (
            <div className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">class</span>
              <span className="a11y-focus-attr-value">{classAttr}</span>
            </div>
          )}
        </div>
      </div>

      {/* Fiber path breadcrumb */}
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

      {/* Previous element */}
      {current.previousElement && (
        <div className="a11y-focus-previous">
          <span className="a11y-focus-path-label">Previous:</span>
          <span className="a11y-focus-previous-desc">
            {describeElement(current.previousElement)}
          </span>
        </div>
      )}
    </div>
  );
}
