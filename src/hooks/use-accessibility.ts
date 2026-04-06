/**
 * useAccessibility uber-hook.
 *
 * Composes all sub-hooks unconditionally (Rules of Hooks).
 * Each sub-hook no-ops when its config key is undefined.
 * Returns a unified result with navigation, resize, and debug handle.
 */

import { useMemo } from "react";
import { useAccessibilityContext } from "./provider";
import type {
  AccessibilityDebugHandle,
  AccessibilityOptions,
  AccessibilityResult,
} from "./types";
import { useFocusTrap } from "./use-focus-trap";
import { useKeyboardNav } from "./use-keyboard-nav";

export function useAccessibility(
  options: AccessibilityOptions,
): AccessibilityResult {
  // Always call all hooks (Rules of Hooks) - they no-op when config is undefined
  useFocusTrap(options.focusTrap);
  const navigation = useKeyboardNav(options.navigation);

  // Future hooks will be called here:
  // const resize = useKeyboardResize(options.resize);
  // useSelectionAnnouncer(options.announcements);

  const debugCtx = useAccessibilityContext();

  const debug = useMemo<AccessibilityDebugHandle | null>(() => {
    if (!debugCtx) return null;
    return {
      log: (message, data) => debugCtx.log(message, data),
      reportKeyEvent: (event) => debugCtx.reportKeyEvent(event),
      reportAnnouncement: (text, level) =>
        debugCtx.reportAnnouncement(text, level, "app"),
    };
  }, [debugCtx]);

  return {
    navigation,
    resizable: null,
    debug,
  };
}
