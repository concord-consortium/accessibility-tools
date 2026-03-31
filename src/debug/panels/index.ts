import type { ComponentType } from "react";
import { DuplicateIdPanel } from "./duplicate-ids";
import { ElementInspectorPanel } from "./element-inspector";
import { FocusHistoryPanel } from "./focus-history";
import { FocusLossPanel } from "./focus-loss";
import { FocusOrderPanel } from "./focus-order";
import { FocusTrackerPanel } from "./focus-tracker";
import { FocusTrapPanel } from "./focus-trap";
import { FormLabelPanel } from "./form-labels";
import { HeadingHierarchyPanel } from "./heading-hierarchy";
import { LandmarkSummaryPanel } from "./landmark-summary";
import { OverviewPanel } from "./overview";
import { ReducedMotionPanel } from "./reduced-motion";

/**
 * Registry mapping panel IDs (from sidebar-data.ts) to their React components.
 * Panels not yet implemented will fall back to the "TBD" placeholder.
 *
 * Components may accept optional props like onNavigateToPanel - the sidebar
 * passes these as needed.
 */
export const panelComponents: Record<
  string,
  // biome-ignore lint/suspicious/noExplicitAny: panels have varying prop shapes
  ComponentType<any>
> = {
  overview: OverviewPanel,
  headings: HeadingHierarchyPanel,
  landmarks: LandmarkSummaryPanel,
  "duplicate-ids": DuplicateIdPanel,
  "form-labels": FormLabelPanel,
  "reduced-motion": ReducedMotionPanel,
  "focus-tracker": FocusTrackerPanel,
  inspector: ElementInspectorPanel,
  "focus-loss": FocusLossPanel,
  "focus-history": FocusHistoryPanel,
  "focus-trap": FocusTrapPanel,
  "focus-order": FocusOrderPanel,
};
