/**
 * useDropdown hook.
 *
 * Manages a trigger + dropdown list pattern following WAI-ARIA listbox practices:
 * - Enter/Space on trigger toggles the list
 * - Arrow keys navigate items when open
 * - Escape closes the list and returns focus to the trigger
 * - Click outside closes the list
 * - aria-expanded on trigger, role="listbox" on list, role="option" on items
 *
 * This is a control-level hook (one per dropdown), not part of the
 * useAccessibility uber-hook (which is container-level).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface DropdownConfig {
  /** Ref to the trigger element (button that opens/closes the list). */
  triggerRef: RefObject<HTMLElement | null>;
  /** Ref to the list container element. */
  listRef: RefObject<HTMLElement | null>;
  /** CSS selector for list items within the list container. */
  itemSelector: string;
  /** Called when an item is selected (Enter/Space/click). */
  onSelect?: (element: HTMLElement, index: number) => void;
  /** Label for the listbox (used as aria-label). */
  label?: string;
  /** Whether the dropdown is disabled. */
  disabled?: boolean;
}

export interface DropdownResult {
  /** Whether the list is currently open. */
  isOpen: boolean;
  /** Open the list. */
  open: () => void;
  /** Close the list. Returns focus to trigger by default; pass false to skip. */
  close: (returnFocus?: boolean) => void;
  /** Toggle the list open/closed. */
  toggle: () => void;
  /** The index of the currently highlighted item (-1 if none). */
  activeIndex: number;
  /** Props to spread on the trigger element. */
  triggerProps: {
    role: "button";
    tabIndex: number;
    "aria-haspopup": "listbox";
    "aria-expanded": boolean;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onClick: () => void;
  };
  /** Props to spread on the list container element. */
  listProps: {
    role: "listbox";
    "aria-label"?: string;
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  /** Returns props to spread on each list item. */
  getItemProps: (index: number) => {
    role: "option";
    "aria-selected": true | undefined;
    tabIndex: number;
    onClick: () => void;
  };
}

export function useDropdown(
  config: DropdownConfig | undefined,
): DropdownResult | null {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemsRef = useRef<HTMLElement[]>([]);

  const triggerRef = config?.triggerRef;
  const listRef = config?.listRef;
  const itemSelector = config?.itemSelector;
  const onSelect = config?.onSelect;
  const label = config?.label;
  const disabled = config?.disabled ?? false;

  // Query items from the DOM
  const queryItems = useCallback((): HTMLElement[] => {
    if (!listRef?.current || !itemSelector) return [];
    const items = Array.from(
      listRef.current.querySelectorAll<HTMLElement>(itemSelector),
    );
    itemsRef.current = items;
    return items;
  }, [listRef, itemSelector]);

  // Focus an item at a given index
  const focusItem = useCallback(
    (index: number) => {
      const items = queryItems();
      if (index < 0 || index >= items.length) return;
      setActiveIndex(index);
      items[index].focus();
    },
    [queryItems],
  );

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  const close = useCallback(
    (returnFocus = true) => {
      setIsOpen(false);
      setActiveIndex(-1);
      if (returnFocus) {
        triggerRef?.current?.focus();
      }
    },
    [triggerRef],
  );

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // When the list opens, focus the first selected item or the first item
  useEffect(() => {
    if (!isOpen) return;
    // Defer to next frame so the list is rendered
    const frame = requestAnimationFrame(() => {
      const items = queryItems();
      if (items.length === 0) return;
      // Find the first item with aria-selected="true", or fall back to first item
      const selectedIdx = items.findIndex(
        (el) => el.getAttribute("aria-selected") === "true",
      );
      focusItem(selectedIdx >= 0 ? selectedIdx : 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, queryItems, focusItem]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef?.current?.contains(target) ||
        listRef?.current?.contains(target)
      ) {
        return;
      }
      close(false);
    };
    document.addEventListener("mousedown", handleDown, true);
    document.addEventListener("touchstart", handleDown, true);
    return () => {
      document.removeEventListener("mousedown", handleDown, true);
      document.removeEventListener("touchstart", handleDown, true);
    };
  }, [isOpen, triggerRef, listRef, close]);

  // Trigger keydown: Enter/Space to toggle, ArrowDown to open and focus first
  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          open();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    },
    [disabled, toggle, isOpen, open, close],
  );

  // List keydown: arrow navigation, Escape to close, Enter/Space to select
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = queryItems();
      if (items.length === 0) return;

      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === "Tab") {
        // Close the list but don't return focus to trigger — let Tab proceed naturally
        close(false);
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          onSelect?.(items[activeIndex], activeIndex);
        }
        close();
        return;
      }

      const current = activeIndex >= 0 ? activeIndex : 0;
      let nextIndex: number | null = null;

      if (e.key === "ArrowDown") {
        nextIndex = current < items.length - 1 ? current + 1 : 0;
      } else if (e.key === "ArrowUp") {
        nextIndex = current > 0 ? current - 1 : items.length - 1;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = items.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        focusItem(nextIndex);
      }
    },
    [queryItems, activeIndex, onSelect, close, focusItem],
  );

  if (!config) return null;

  return {
    isOpen,
    open,
    close,
    toggle,
    activeIndex,
    triggerProps: {
      role: "button" as const,
      tabIndex: disabled ? -1 : 0,
      "aria-haspopup": "listbox" as const,
      "aria-expanded": isOpen,
      onKeyDown: handleTriggerKeyDown,
      onClick: toggle,
    },
    listProps: {
      role: "listbox" as const,
      "aria-label": label,
      tabIndex: -1,
      onKeyDown: handleListKeyDown,
    },
    getItemProps: (index: number) => ({
      role: "option" as const,
      "aria-selected": index === activeIndex ? true : undefined,
      tabIndex: index === activeIndex ? 0 : -1,
      onClick: () => {
        const items = queryItems();
        if (index >= 0 && index < items.length) {
          onSelect?.(items[index], index);
        }
        close();
      },
    }),
  };
}
