import type { ComponentType } from "react";
import { DuplicateIdPanel } from "./duplicate-ids";
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
};
