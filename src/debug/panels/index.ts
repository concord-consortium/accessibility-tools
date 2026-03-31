import type { ComponentType } from "react";
import { DuplicateIdPanel } from "./duplicate-ids";
import { FormLabelPanel } from "./form-labels";
import { HeadingHierarchyPanel } from "./heading-hierarchy";
import { LandmarkSummaryPanel } from "./landmark-summary";
import { ReducedMotionPanel } from "./reduced-motion";

/**
 * Registry mapping panel IDs (from sidebar-data.ts) to their React components.
 * Panels not yet implemented will fall back to the "TBD" placeholder.
 */
export const panelComponents: Record<string, ComponentType> = {
  headings: HeadingHierarchyPanel,
  landmarks: LandmarkSummaryPanel,
  "duplicate-ids": DuplicateIdPanel,
  "form-labels": FormLabelPanel,
  "reduced-motion": ReducedMotionPanel,
};
