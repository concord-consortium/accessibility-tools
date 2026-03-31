/**
 * Touch Targets Overlay toggle.
 *
 * Highlights undersized interactive elements with colored borders.
 * Red = below AA (24x24), yellow = below AAA (44x44).
 */

import { toggleOverlayCSS } from "./inject-css";

const CSS = `
/* Touch Targets Overlay */
a[href], button, input:not([type=hidden]), select, textarea,
[tabindex], [role=button], [role=link], [role=checkbox],
[role=radio], [role=tab], [role=menuitem], summary {
  outline: 2px dashed #ca8a04 !important;
  outline-offset: 1px !important;
}
/* Reset sidebar */
.a11y-debug-sidebar a[href],
.a11y-debug-sidebar button,
.a11y-debug-sidebar input,
.a11y-debug-sidebar select,
.a11y-debug-sidebar textarea,
.a11y-debug-sidebar [tabindex],
.a11y-debug-sidebar [role=button],
.a11y-debug-sidebar [role=link],
.a11y-debug-sidebar summary {
  outline: none !important;
}
:not([data-a11y-debug]):not([data-a11y-debug] *) {
  /* Only targets outside sidebar */
}
`;

export function toggleTouchTargetsOverlay(): boolean {
  return toggleOverlayCSS("touch-targets", CSS);
}
