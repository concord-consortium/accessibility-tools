/**
 * Reflow Test overlay toggle (WCAG 1.4.10).
 *
 * Constrains app content to a narrow width to test reflow behavior.
 * WCAG reference: no horizontal scrolling at 1280px viewport / 400% zoom = 320px.
 *
 * Scan for horizontal scrollbars, content overflow, or elements that
 * don't reflow into a single column.
 */

import {
  injectOverlayCSS,
  isOverlayActive,
  removeOverlayCSS,
} from "./inject-css";

const PRESETS = [320, 256] as const;
let currentPresetIndex = 0;

function getCSS(width: number): string {
  return `
/* WCAG 1.4.10 Reflow Test - ${width}px */
main, [role="main"] {
  max-width: ${width}px !important;
  overflow-x: auto !important;
}
`;
}

/**
 * Cycle through reflow presets, or turn off if at end.
 * Returns the active width or null if turned off.
 */
export function toggleReflow(): number | null {
  if (!isOverlayActive("reflow")) {
    currentPresetIndex = 0;
    injectOverlayCSS("reflow", getCSS(PRESETS[0]));
    return PRESETS[0];
  }

  currentPresetIndex++;
  if (currentPresetIndex >= PRESETS.length) {
    removeOverlayCSS("reflow");
    currentPresetIndex = 0;
    return null;
  }

  removeOverlayCSS("reflow");
  injectOverlayCSS("reflow", getCSS(PRESETS[currentPresetIndex]));
  return PRESETS[currentPresetIndex];
}
