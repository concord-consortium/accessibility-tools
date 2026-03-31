/**
 * Forced Colors Mode overlay toggle (WCAG 1.4.11).
 *
 * Simulates Windows High Contrast Mode by stripping custom colors.
 * Reveals UI elements that disappear when colors are removed:
 * icon-only buttons without borders, states conveyed only by color,
 * focus indicators using only background color.
 */

import { toggleOverlayCSS } from "./inject-css";

const CSS = `
/* Forced Colors Mode Simulation (WCAG 1.4.11) */
*:not([data-a11y-debug]):not([data-a11y-debug] *) {
  background-color: Canvas !important;
  color: CanvasText !important;
  border-color: CanvasText !important;
  outline-color: Highlight !important;
  fill: CanvasText !important;
  stroke: CanvasText !important;
  forced-color-adjust: none !important;
}
a:not([data-a11y-debug]):not([data-a11y-debug] *) {
  color: LinkText !important;
}
a:visited:not([data-a11y-debug]):not([data-a11y-debug] *) {
  color: VisitedText !important;
}
::selection {
  background-color: Highlight !important;
  color: HighlightText !important;
}
*:focus-visible:not([data-a11y-debug]):not([data-a11y-debug] *) {
  outline: 2px solid Highlight !important;
}
`;

export function toggleForcedColors(): boolean {
  return toggleOverlayCSS("forced-colors", CSS);
}
