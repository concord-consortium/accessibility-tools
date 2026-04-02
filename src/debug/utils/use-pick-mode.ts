/**
 * Shared hook for pick-element mode.
 *
 * Captures clicks, highlights hovered elements, and supports
 * Escape to cancel. Adds the a11y-pick-mode class to body while active.
 */

import { useEffect } from "react";
import { highlightElement, removeHighlight } from "../utils";

interface UsePickModeOptions {
  active: boolean;
  onPick: (element: Element) => void;
  onCancel: () => void;
  highlightColor?: string;
}

export function usePickMode({
  active,
  onPick,
  onCancel,
  highlightColor = "#f59e0b",
}: UsePickModeOptions) {
  useEffect(() => {
    if (!active) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-a11y-debug]")) return;
      e.preventDefault();
      e.stopPropagation();
      onPick(target);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-a11y-debug]")) return;
      highlightElement(target, { color: highlightColor });
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget || !(e.relatedTarget instanceof Element)) {
        removeHighlight();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        removeHighlight();
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.body.classList.add("a11y-pick-mode");

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.classList.remove("a11y-pick-mode");
      removeHighlight();
    };
  }, [active, onPick, onCancel, highlightColor]);
}
