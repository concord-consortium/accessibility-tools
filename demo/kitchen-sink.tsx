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

// Intentional a11y violations in the nav (marked with *)
const subtleViolations: Record<
  string,
  { label?: string; attrs?: Record<string, string> }
> = {
  // Generic link text - violates WCAG 2.4.4 (Link Purpose)
  images: { label: "More *" },
  // Redundant role="link" on an <a> - unnecessary ARIA
  landmarks: { attrs: { role: "link" } },
};

export function KitchenSink() {
  return (
    <div className="kitchen-sink">
      <nav className="kitchen-sink-nav" aria-label="Kitchen sink sections">
        <a href="#top">Top</a>
        {sections.map(({ id, label }) => {
          const violation = subtleViolations[id];
          return (
            <a key={id} href={`#section-${id}`} {...(violation?.attrs ?? {})}>
              {violation?.label ?? label}
            </a>
          );
        })}
      </nav>
      <p className="kitchen-sink-nav-footnote">
        * Elements marked with an asterisk have intentional accessibility
        violations for panel testing.
      </p>

      {sections.map(({ id, component: Section }) => (
        <div key={id} id={`section-${id}`}>
          <Section />
        </div>
      ))}
    </div>
  );
}
