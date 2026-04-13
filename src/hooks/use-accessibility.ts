/**
 * useAccessibility uber-hook.
 *
 * Composes all sub-hooks unconditionally (Rules of Hooks).
 * Each sub-hook no-ops when its config key is undefined.
 * Returns a unified result with navigation, resize, and debug handle.
 *
 * Auto-wiring: when both navigation and announcements are enabled,
 * navigation focus changes automatically trigger announcements.
 */

import { useMemo } from "react";
import { useAccessibilityContext } from "./provider";
import type {
  AccessibilityDebugHandle,
  AccessibilityOptions,
  AccessibilityResult,
  AnnouncementsConfig,
} from "./types";
import { useFocusTrap } from "./use-focus-trap";
import { useKeyboardNav } from "./use-keyboard-nav";
import { useKeyboardResize } from "./use-keyboard-resize";
import { useSelectionAnnouncer } from "./use-selection-announcer";

export function useAccessibility(
  options: AccessibilityOptions,
): AccessibilityResult {
  // Always call all hooks (Rules of Hooks) - they no-op when config is undefined
  const focusTrap = useFocusTrap(options.focusTrap);
  const navigation = useKeyboardNav(options.navigation);
  const resizable = useKeyboardResize(options.resize);

  // Auto-wiring: when both navigation and announcements are enabled,
  // feed the active item ID into the announcements selectedItems.
  // This makes navigation focus changes trigger announcements automatically.
  const announcementsConfig = useMemo<AnnouncementsConfig | undefined>(() => {
    if (!options.announcements) return undefined;

    // If navigation is active, auto-wire the active index as a selection
    if (navigation && options.navigation) {
      const items = options.navigation.containerRef.current?.querySelectorAll(
        options.navigation.itemSelector,
      );
      const activeEl = items?.[navigation.activeIndex];
      const activeId = activeEl?.id || String(navigation.activeIndex);

      return {
        ...options.announcements,
        selectedItems: [activeId],
      };
    }

    return options.announcements;
  }, [options.announcements, options.navigation, navigation]);

  useSelectionAnnouncer(announcementsConfig);

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
    resizable,
    focusTrap,
    debug,
  };
}
