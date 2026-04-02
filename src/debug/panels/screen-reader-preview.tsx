/**
 * Screen Reader Text Preview panel.
 *
 * Shows what a screen reader would announce for the currently focused
 * element. Computes accessible name, role, and states using
 * dom-accessibility-api. Updates live as focus moves.
 */

import { SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import { PickElementButton } from "../components/pick-element-button";
import {
  getReactComponentName,
  getReactFiberPath,
  highlightElement,
  removeHighlight,
} from "../utils";
import {
  type AccessibleInfo,
  computeAccessibleInfo,
  formatAnnouncement,
} from "../utils/accname";
import { useFocusStream } from "../utils/use-focus-stream";
import { usePickMode } from "../utils/use-pick-mode";

const canSpeak =
  typeof window !== "undefined" &&
  typeof window.speechSynthesis !== "undefined";

function speak(text: string) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export function ScreenReaderPreviewPanel() {
  const { current } = useFocusStream();
  const [element, setElement] = useState<Element | null>(null);
  const [info, setInfo] = useState<AccessibleInfo | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [trackFocus, setTrackFocus] = useState(true);

  // Update from focus stream when tracking
  useEffect(() => {
    if (!current || !trackFocus) return;
    setElement(current.element);
    setInfo(computeAccessibleInfo(current.element));
  }, [current, trackFocus]);

  const handlePick = useCallback((target: Element) => {
    setElement(target);
    setInfo(computeAccessibleInfo(target));
    setPickMode(false);
    setTrackFocus(false);
    highlightElement(target, { color: "#7c3aed" });
  }, []);

  const handleCancel = useCallback(() => {
    setPickMode(false);
  }, []);

  usePickMode({ active: pickMode, onPick: handlePick, onCancel: handleCancel });

  // Clean up highlight on unmount
  useEffect(() => {
    return () => {
      removeHighlight();
    };
  }, []);

  const el = element;
  const tag = el?.tagName?.toLowerCase() ?? "unknown";
  const componentName = el ? getReactComponentName(el) : null;
  const fiberPath = el ? getReactFiberPath(el) : [];
  const announcement = info ? formatAnnouncement(info) : "";

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Screen Reader Text Preview</h3>
      <div className="a11y-panel-toolbar">
        <PickElementButton
          active={pickMode}
          onClick={() => {
            setPickMode((v) => !v);
            if (!pickMode) setTrackFocus(false);
          }}
        />
        <button
          type="button"
          className={`a11y-panel-btn ${trackFocus ? "a11y-panel-btn-active" : ""}`}
          aria-pressed={trackFocus}
          onClick={() => {
            setTrackFocus((v) => {
              if (!v) setPickMode(false);
              return !v;
            });
          }}
        >
          Track Focus
        </button>
      </div>

      {!el ? (
        <div className="a11y-focus-empty">
          Click "Pick Element" to select any element, or "Track Focus" to follow
          keyboard/mouse focus.
        </div>
      ) : (
        <>
          {/* Announcement preview */}
          <div className="a11y-sr-announcement">
            <span className="a11y-sr-announcement-text">
              {announcement || (
                <span className="a11y-sr-empty-name">
                  (nothing announced - no accessible name or role)
                </span>
              )}
            </span>
            {canSpeak && announcement && (
              <button
                type="button"
                className="a11y-sr-speak-btn"
                aria-label="Speak this announcement"
                title="Speak this announcement using text-to-speech"
                onClick={() => speak(announcement)}
              >
                <SpeakerWaveIcon className="a11y-sr-speak-icon" />
              </button>
            )}
          </div>

          {/* Breakdown */}
          <div className="a11y-focus-attrs">
            <div className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">name</span>
              <span className="a11y-focus-attr-value">
                {info?.name || (
                  <span className="a11y-sr-empty-name">(empty)</span>
                )}
              </span>
            </div>
            {info?.description && (
              <div className="a11y-focus-attr">
                <span className="a11y-focus-attr-key">description</span>
                <span className="a11y-focus-attr-value">
                  {info?.description}
                </span>
              </div>
            )}
            <div className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">role</span>
              <span className="a11y-focus-attr-value">
                {info?.role || "(none)"}
              </span>
            </div>
            {(info?.states.length ?? 0) > 0 && (
              <div className="a11y-focus-attr">
                <span className="a11y-focus-attr-key">states</span>
                <span className="a11y-focus-attr-value">
                  {info?.states.join(", ")}
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
          {!info?.name && info?.role && (
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
                  <span
                    key={`path-${i}`}
                    className="a11y-focus-breadcrumb-item"
                  >
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
        </>
      )}
    </div>
  );
}
