import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  Bars3Icon,
  BarsArrowDownIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  EyeDropperIcon,
  EyeIcon,
  HashtagIcon,
  LinkIcon,
  ListBulletIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MegaphoneIcon,
  NumberedListIcon,
  PaintBrushIcon,
  PhotoIcon,
  PlayPauseIcon,
  ShieldCheckIcon,
  SignalIcon,
  SwatchIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

export interface PanelDef {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isLog?: boolean;
}

export interface CategoryDef {
  id: string;
  label: string;
  panels: PanelDef[];
  disabled?: boolean;
}

export const categories: CategoryDef[] = [
  {
    id: "checks",
    label: "Checks",
    panels: [
      { id: "overview", label: "Overview", icon: ChartBarIcon },
      {
        id: "headings",
        label: "Heading Hierarchy",
        icon: BarsArrowDownIcon,
      },
      { id: "form-labels", label: "Form Label Checker", icon: TagIcon },
      {
        id: "contrast",
        label: "Color Contrast Checker",
        icon: SwatchIcon,
      },
      { id: "images", label: "Image Audit", icon: PhotoIcon },
      {
        id: "links-buttons",
        label: "Link & Button Audit",
        icon: LinkIcon,
      },
      {
        id: "aria-validation",
        label: "ARIA Validation",
        icon: ShieldCheckIcon,
      },
      { id: "landmarks", label: "Landmark Summary", icon: MapIcon },
      {
        id: "duplicate-ids",
        label: "Duplicate ID Detector",
        icon: DocumentDuplicateIcon,
      },
      {
        id: "touch-targets",
        label: "Touch Target Size",
        icon: CursorArrowRaysIcon,
      },
      {
        id: "reduced-motion",
        label: "Reduced Motion",
        icon: PlayPauseIcon,
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    panels: [
      {
        id: "inspector",
        label: "Element Inspector",
        icon: MagnifyingGlassIcon,
      },
      { id: "focus-tracker", label: "Live Focus Tracker", icon: EyeIcon },
      {
        id: "keyboard-log",
        label: "Keyboard Event Log",
        icon: CommandLineIcon,
        isLog: true,
      },
      {
        id: "screen-reader",
        label: "Screen Reader Text Preview",
        icon: ChatBubbleLeftIcon,
      },
      { id: "aria-tree", label: "ARIA Tree View", icon: NumberedListIcon },
      { id: "tab-order", label: "Tab Order Overlay", icon: HashtagIcon },
      {
        id: "announcements",
        label: "Announcements Log",
        icon: MegaphoneIcon,
        isLog: true,
      },
      {
        id: "live-regions",
        label: "Live Region Inventory",
        icon: SignalIcon,
      },
      {
        id: "focus-history",
        label: "Focus History Log",
        icon: ClockIcon,
        isLog: true,
      },
      {
        id: "focus-loss",
        label: "Focus Loss Detector",
        icon: ExclamationTriangleIcon,
      },
      {
        id: "focus-trap",
        label: "Focus Trap Detector",
        icon: LockClosedIcon,
      },
      {
        id: "focus-order",
        label: "Focus Order Recorder",
        icon: ListBulletIcon,
      },
      {
        id: "audit-report",
        label: "WCAG Audit Report",
        icon: ClipboardDocumentCheckIcon,
      },
    ],
  },
  {
    id: "hooks",
    label: "Hooks",
    disabled: true,
    panels: [
      {
        id: "trap-state",
        label: "Focus Trap State",
        icon: ArrowsRightLeftIcon,
      },
      {
        id: "nav-state",
        label: "Navigation State",
        icon: ArrowsUpDownIcon,
      },
      {
        id: "custom-log",
        label: "Custom App Log",
        icon: CodeBracketIcon,
      },
    ],
  },
];

export interface OverlayToggleDef {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export const overlayToggles: OverlayToggleDef[] = [
  {
    id: "tab-order",
    label: "Tab Order",
    description: "Show numbered badges on tabbable elements",
    icon: HashtagIcon,
  },
  {
    id: "contrast",
    label: "Contrast Ratios",
    description: "Show contrast ratio badges on text elements",
    icon: PaintBrushIcon,
  },
  {
    id: "touch-targets",
    label: "Touch Targets",
    description: "Highlight undersized touch targets",
    icon: CursorArrowRaysIcon,
  },
  {
    id: "live-regions",
    label: "Live Regions",
    description: "Highlight aria-live regions on the page",
    icon: SignalIcon,
  },
  {
    id: "text-spacing",
    label: "Text Spacing",
    description: "Apply WCAG 1.4.12 text spacing overrides",
    icon: Bars3Icon,
  },
  {
    id: "reflow",
    label: "Reflow Test",
    description:
      "Constrain width to test WCAG 1.4.10 reflow (standalone mode only)",
    icon: DevicePhoneMobileIcon,
    disabled: true,
  },
  {
    id: "forced-colors",
    label: "Forced Colors",
    description: "Simulate high contrast / forced colors mode",
    icon: EyeDropperIcon,
  },
];
