export {
  getReactComponentName,
  getReactFiberPath,
  describeElement,
  attachMockFiber,
} from "./fiber";

export {
  highlightElement,
  removeHighlight,
  updateHighlightPosition,
  destroyHighlight,
  scrollToAndHighlight,
  isHighlighted,
} from "./highlight";

export {
  subscribeFocus,
  setSidebarRoot,
  isInsideSidebar,
  withSelfExclusionDisabled,
  withSelfExclusionDisabledAsync,
  type A11yFocusEvent,
} from "./focus-stream";

export { showToast } from "./toast";

export {
  useFocusStream,
  type FocusHistoryEntry,
} from "./use-focus-stream";

export {
  subscribeAnnouncements,
  getLiveRegions,
  type LiveRegionInfo,
  type AnnouncementEvent,
} from "./live-region-observer";
