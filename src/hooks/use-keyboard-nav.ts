/**
 * useKeyboardNav hook.
 *
 * Arrow key navigation through a list of items with configurable
 * orientation (horizontal, vertical, grid). Supports Home/End,
 * Enter/Space activation, wrap-around, and optional focus ring.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccessibilityContext } from "./provider";
import type { NavigationConfig, NavigationResult } from "./types";
import { useStableId } from "./use-stable-id";

export function useKeyboardNav(
  config: NavigationConfig | undefined,
): NavigationResult | null {
  const [activeIndex, setActiveIndex] = useState(-1);
  const instanceId = useStableId();
  const debugCtx = useAccessibilityContext();
  const itemsRef = useRef<HTMLElement[]>([]);

  const containerRef = config?.containerRef;
  const itemSelector = config?.itemSelector;
  const orientation = config?.orientation ?? "vertical";
  const wrap = config?.wrap ?? false;
  const columns = config?.columns;
  const onSelect = config?.onSelect;
  const onFocusChange = config?.onFocusChange;
  const focusRing = config?.focusRing ?? false;

  // Query items from the DOM
  const queryItems = useCallback((): HTMLElement[] => {
    if (!containerRef?.current || !itemSelector) return [];
    const items = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(itemSelector),
    );
    itemsRef.current = items;
    return items;
  }, [containerRef, itemSelector]);

  // Focus an item at a specific index
  const focusItem = useCallback(
    (index: number) => {
      const items = queryItems();
      if (index < 0 || index >= items.length) return;
      setActiveIndex(index);
      items[index].focus();
      onFocusChange?.(items[index], index);
      debugCtx?.reportNavState(instanceId, {
        activeIndex: index,
        totalItems: items.length,
      });
    },
    [queryItems, onFocusChange, debugCtx, instanceId],
  );

  // Compute the next index given a direction
  const getNextIndex = useCallback(
    (current: number, key: string, total: number): number | null => {
      if (orientation === "horizontal") {
        if (key === "ArrowRight") {
          if (current < total - 1) return current + 1;
          return wrap ? 0 : null;
        }
        if (key === "ArrowLeft") {
          if (current > 0) return current - 1;
          return wrap ? total - 1 : null;
        }
      } else if (orientation === "vertical") {
        if (key === "ArrowDown") {
          if (current < total - 1) return current + 1;
          return wrap ? 0 : null;
        }
        if (key === "ArrowUp") {
          if (current > 0) return current - 1;
          return wrap ? total - 1 : null;
        }
      } else if (orientation === "grid" && columns) {
        const row = Math.floor(current / columns);
        const col = current % columns;
        const totalRows = Math.ceil(total / columns);

        if (key === "ArrowRight") {
          const next = current + 1;
          if (next < total && Math.floor(next / columns) === row) return next;
          return wrap ? row * columns : null;
        }
        if (key === "ArrowLeft") {
          const next = current - 1;
          if (next >= 0 && Math.floor(next / columns) === row) return next;
          return wrap ? Math.min(row * columns + columns - 1, total - 1) : null;
        }
        if (key === "ArrowDown") {
          const next = current + columns;
          if (next < total) return next;
          return wrap ? col : null;
        }
        if (key === "ArrowUp") {
          const next = current - columns;
          if (next >= 0) return next;
          if (wrap) {
            const lastRow = (totalRows - 1) * columns + col;
            return lastRow < total ? lastRow : total - 1;
          }
          return null;
        }
      }

      if (key === "Home") return 0;
      if (key === "End") return total - 1;

      return null;
    },
    [orientation, wrap, columns],
  );

  // Keydown handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!config) return;
      const items = queryItems();
      if (items.length === 0) return;

      const current = activeIndex >= 0 ? activeIndex : 0;

      // Enter/Space: activate
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          onSelect?.(items[activeIndex], activeIndex);
        }
        return;
      }

      const nextIndex = getNextIndex(current, e.key, items.length);
      if (nextIndex !== null) {
        e.preventDefault();
        focusItem(nextIndex);
      }
    },
    [config, queryItems, activeIndex, onSelect, getNextIndex, focusItem],
  );

  // Get props for an item (click handler navigates, focus ring props optional)
  const getItemProps = useCallback(
    (index: number): Record<string, unknown> => {
      const props: Record<string, unknown> = {
        onClick: () => {
          focusItem(index);
        },
      };
      if (focusRing) {
        props.tabIndex = index === activeIndex ? 0 : -1;
        props.className =
          index === activeIndex ? "keyboard-focused" : undefined;
      }
      return props;
    },
    [focusRing, activeIndex, focusItem],
  );

  // Register with debug context
  useEffect(() => {
    if (!config || !debugCtx) return;
    debugCtx.registerInstance(instanceId, {
      hookType: "navigation",
      containerElement: containerRef?.current,
    });
    debugCtx.registerNav(instanceId, {
      itemSelector: itemSelector ?? "",
      orientation,
    });
    return () => {
      debugCtx.unregisterInstance(instanceId);
      debugCtx.unregisterNav(instanceId);
    };
  }, [config, debugCtx, instanceId, containerRef, itemSelector, orientation]);

  // Initialize: query items and set initial active index
  useEffect(() => {
    if (!config) return;
    const items = queryItems();
    if (items.length > 0 && activeIndex === -1) {
      setActiveIndex(0);
      debugCtx?.reportNavState(instanceId, {
        activeIndex: 0,
        totalItems: items.length,
      });
    }
  }, [config, queryItems, activeIndex, debugCtx, instanceId]);

  if (!config) return null;

  return {
    activeIndex,
    handleKeyDown,
    getItemProps,
  };
}
