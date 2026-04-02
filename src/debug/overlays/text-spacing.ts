/**
 * Text Spacing Override overlay toggle (WCAG 1.4.12).
 *
 * Injects CSS that applies the WCAG 1.4.12 text spacing test values:
 * - Line height: 1.5x font size
 * - Paragraph spacing: 2x font size
 * - Letter spacing: 0.12em
 * - Word spacing: 0.16em
 *
 * Visually scan for text that clips, overlaps, or disappears -
 * those are 1.4.12 failures.
 */

import { toggleOverlayCSS } from "./inject-css";

const CSS = `
/* WCAG 1.4.12 Text Spacing Override */
*:not([data-a11y-debug]):not([data-a11y-debug] *) {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p:not([data-a11y-debug]):not([data-a11y-debug] *) {
  margin-bottom: 2em !important;
}
/* Prevent inheritance from parent into sidebar */
.a11y-debug-sidebar {
  line-height: normal !important;
  letter-spacing: normal !important;
  word-spacing: normal !important;
}
`;

export function toggleTextSpacing(): boolean {
  return toggleOverlayCSS("text-spacing", CSS);
}
