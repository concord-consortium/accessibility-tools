export type { CheckIssue, CheckResult, SerializedCheckIssue } from "./types";
export { serializeIssue } from "./types";
export { scanHeadings, type HeadingItem } from "./headings";
export { scanLandmarks, type LandmarkItem } from "./landmarks";
export { scanDuplicateIds, type DuplicateIdGroup } from "./duplicate-ids";
export { scanFormControls, type FormControlItem } from "./form-labels";
export { scanAnimations, type AnimationItem } from "./reduced-motion";
export { scanColorContrast, type ContrastItem } from "./color-contrast";
export { scanImages, type ImageItem } from "./images";
export { scanLinksButtons, type LinkButtonItem } from "./links-buttons";
export {
  scanAriaValidation,
  type AriaIssueItem,
} from "./aria-validation";
export { scanTouchTargets, type TouchTargetItem } from "./touch-targets";
export {
  scoreCheck,
  scoreColor,
  calculateOverallScore,
  generateMarkdownReport,
  type CheckScore,
  type OverallScore,
  type ScoreExplanation,
} from "./scoring";
