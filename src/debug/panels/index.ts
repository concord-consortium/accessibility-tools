import type { ComponentType } from "react";
import { AnnouncementsLogPanel } from "./announcements-log";
import { AriaTreePanel } from "./aria-tree";
import { AriaValidationPanel } from "./aria-validation";
import { ColorContrastPanel } from "./color-contrast";
import { DuplicateIdPanel } from "./duplicate-ids";
import { ElementInspectorPanel } from "./element-inspector";
import { FocusHistoryPanel } from "./focus-history";
import { FocusLossPanel } from "./focus-loss";
import { FocusOrderPanel } from "./focus-order";
import { FocusTrackerPanel } from "./focus-tracker";
import { FocusTrapPanel } from "./focus-trap";
import { FormLabelPanel } from "./form-labels";
import { HeadingHierarchyPanel } from "./heading-hierarchy";
import { ImageAuditPanel } from "./image-audit";
import { KeyboardLogPanel } from "./keyboard-log";
import { LandmarkSummaryPanel } from "./landmark-summary";
import { LinksButtonsPanel } from "./links-buttons";
import { LiveRegionsPanel } from "./live-regions";
import { OverviewPanel } from "./overview";
import { ReducedMotionPanel } from "./reduced-motion";
import { ScreenReaderPreviewPanel } from "./screen-reader-preview";
import { TabOrderPanel } from "./tab-order";
import { TouchTargetsPanel } from "./touch-targets";

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
  "keyboard-log": KeyboardLogPanel,
  announcements: AnnouncementsLogPanel,
  "live-regions": LiveRegionsPanel,
  images: ImageAuditPanel,
  "touch-targets": TouchTargetsPanel,
  "tab-order": TabOrderPanel,
  "aria-validation": AriaValidationPanel,
  "screen-reader": ScreenReaderPreviewPanel,
  contrast: ColorContrastPanel,
  "links-buttons": LinksButtonsPanel,
  "aria-tree": AriaTreePanel,
};
