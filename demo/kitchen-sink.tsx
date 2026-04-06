import { AnimationMotionSection } from "./sections/animation-motion";
import { AnnouncementsSection } from "./sections/announcements";
import { AriaAttributesSection } from "./sections/aria-attributes";
import { AuditReportSection } from "./sections/audit-report";
import { ColorContrastSection } from "./sections/color-contrast";
import { DuplicateIdsSection } from "./sections/duplicate-ids";
import { FocusLossSection } from "./sections/focus-loss";
import { FocusTrapSection } from "./sections/focus-trap";
import { FocusableElementsSection } from "./sections/focusable-elements";
import { FormLabelsSection } from "./sections/form-labels";
import { HeadingHierarchySection } from "./sections/heading-hierarchy";
import { ImagesSection } from "./sections/images";
import { KeyboardHandlingSection } from "./sections/keyboard-handling";
import { KeyboardNavSection } from "./sections/keyboard-nav";
import { LandmarksSection } from "./sections/landmarks";
import { LinksAndButtonsSection } from "./sections/links-and-buttons";
import { ScreenReaderPreviewSection } from "./sections/screen-reader-preview";
import { TouchTargetsSection } from "./sections/touch-targets";

const sections = [
  {
    id: "focusable",
    label: "Focusable Elements",
    component: FocusableElementsSection,
  },
  { id: "aria", label: "ARIA Attributes", component: AriaAttributesSection },
  { id: "keyboard", label: "Keyboard", component: KeyboardHandlingSection },
  {
    id: "announcements",
    label: "Announcements",
    component: AnnouncementsSection,
  },
  { id: "focus-trap", label: "Focus Trap", component: FocusTrapSection },
  { id: "keyboard-nav", label: "Keyboard Nav", component: KeyboardNavSection },
  { id: "contrast", label: "Contrast", component: ColorContrastSection },
  { id: "headings", label: "Headings", component: HeadingHierarchySection },
  { id: "forms", label: "Form Labels", component: FormLabelsSection },
  { id: "touch", label: "Touch Targets", component: TouchTargetsSection },
  {
    id: "screen-reader",
    label: "Screen Reader",
    component: ScreenReaderPreviewSection,
  },
  { id: "images", label: "Images", component: ImagesSection },
  { id: "links", label: "Links & Buttons", component: LinksAndButtonsSection },
  { id: "focus-loss", label: "Focus Loss", component: FocusLossSection },
  { id: "dupe-ids", label: "Duplicate IDs", component: DuplicateIdsSection },
  { id: "animation", label: "Animation", component: AnimationMotionSection },
  { id: "landmarks", label: "Landmarks", component: LandmarksSection },
  { id: "audit", label: "Audit Report", component: AuditReportSection },
] as const;

export function KitchenSink() {
  return (
    <div className="kitchen-sink">
      <nav className="kitchen-sink-nav" aria-label="Kitchen sink sections">
        {sections.map(({ id, label }) => (
          <a key={id} href={`#section-${id}`}>
            {label}
          </a>
        ))}
      </nav>

      {sections.map(({ id, component: Section }) => (
        <div key={id} id={`section-${id}`}>
          <Section />
        </div>
      ))}
    </div>
  );
}
