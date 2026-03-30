import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  Bars3Icon,
  BarsArrowDownIcon,
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
    id: "focus",
    label: "Focus",
    panels: [
      { id: "focus-tracker", label: "Live Focus Tracker", icon: EyeIcon },
      {
        id: "focus-trap",
        label: "Focus Trap Detector",
        icon: LockClosedIcon,
      },
      {
        id: "focus-loss",
        label: "Focus Loss Detector",
        icon: ExclamationTriangleIcon,
      },
      {
        id: "focus-history",
        label: "Focus History Log",
        icon: ClockIcon,
        isLog: true,
      },
      {
        id: "focus-order",
        label: "Focus Order Recorder",
        icon: ListBulletIcon,
      },
    ],
  },
  {
    id: "structure",
    label: "Structure",
    panels: [
      {
        id: "inspector",
        label: "Element Inspector",
        icon: MagnifyingGlassIcon,
      },
      { id: "aria-tree", label: "ARIA Tree View", icon: Bars3Icon },
      {
        id: "headings",
        label: "Heading Hierarchy",
        icon: BarsArrowDownIcon,
      },
      {
        id: "duplicate-ids",
        label: "Duplicate ID Detector",
        icon: DocumentDuplicateIcon,
      },
      { id: "tab-order", label: "Tab Order Overlay", icon: HashtagIcon },
    ],
  },
  {
    id: "validate",
    label: "Validate",
    panels: [
      {
        id: "aria-validation",
        label: "ARIA Validation",
        icon: ShieldCheckIcon,
      },
      {
        id: "contrast",
        label: "Color Contrast Checker",
        icon: SwatchIcon,
      },
      { id: "form-labels", label: "Form Label Checker", icon: TagIcon },
      { id: "images", label: "Image Audit", icon: PhotoIcon },
      {
        id: "links-buttons",
        label: "Link & Button Text Audit",
        icon: LinkIcon,
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
        id: "keyboard-log",
        label: "Keyboard Event Log",
        icon: CommandLineIcon,
        isLog: true,
      },
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
        id: "screen-reader",
        label: "Screen Reader Text Preview",
        icon: ChatBubbleLeftIcon,
      },
      { id: "landmarks", label: "Landmark Summary", icon: MapIcon },
    ],
  },
  {
    id: "hooks",
    label: "Hook State",
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
  icon: ComponentType<{ className?: string }>;
}

export const overlayToggles: OverlayToggleDef[] = [
  { id: "tab-order", label: "Tab Order", icon: HashtagIcon },
  { id: "contrast", label: "Contrast Ratios", icon: PaintBrushIcon },
  { id: "touch-targets", label: "Touch Targets", icon: CursorArrowRaysIcon },
  { id: "live-regions", label: "Live Regions", icon: SignalIcon },
  { id: "text-spacing", label: "Text Spacing", icon: Bars3Icon },
  { id: "reflow", label: "Reflow Test", icon: DevicePhoneMobileIcon },
  { id: "forced-colors", label: "Forced Colors", icon: EyeDropperIcon },
];

export interface FooterActionDef {
  id: string;
  label: string;
  ariaLabel: string;
  icon: ComponentType<{ className?: string }>;
}

export const footerActions: FooterActionDef[] = [
  {
    id: "audit-page",
    label: "Audit Page",
    ariaLabel: "Run WCAG audit on entire page",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    id: "audit-sidebar",
    label: "Audit Sidebar",
    ariaLabel: "Run WCAG audit on the sidebar itself",
    icon: ClipboardDocumentCheckIcon,
  },
];
