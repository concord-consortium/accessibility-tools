import type { CSSProperties } from "react";

/**
 * Shared style for a scenario's trap container.
 *
 * Focus and trapped state are shown by two independent, non-overlapping
 * indicators so both are visible at once when the container is focused while
 * trapped:
 * - Focus: the browser's default focus outline (drawn OUTSIDE the border). The
 *   container deliberately does NOT set `outline`, so a keyboard user gets a
 *   visible focus ring even before entering the trap.
 * - Trapped: an inset ring drawn INSIDE the border, in a violet distinct from
 *   the blue focus outline.
 */
const TRAPPED_COLOR = "#7c3aed";

export function trapContainerStyle(
  isTrapped: boolean,
  extra?: CSSProperties,
): CSSProperties {
  return {
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: 12,
    boxShadow: isTrapped ? `inset 0 0 0 3px ${TRAPPED_COLOR}` : "none",
    ...extra,
  };
}
