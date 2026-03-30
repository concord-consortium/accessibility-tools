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
} from "./highlight";

export {
  subscribeFocus,
  setSidebarRoot,
  isInsideSidebar,
  withSelfExclusionDisabled,
  withSelfExclusionDisabledAsync,
  type A11yFocusEvent,
} from "./focus-stream";
