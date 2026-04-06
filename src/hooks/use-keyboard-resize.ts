/**
 * useKeyboardResize hook.
 *
 * WAI-ARIA separator pattern for keyboard-accessible resizing.
 * Returns props to spread on a resize handle element: role="separator",
 * aria-valuenow/min/max, arrow key handlers with step/Shift+largeStep.
 */

import { useCallback } from "react";
import type { ResizableConfig, ResizableResult } from "./types";

const DEFAULT_STEP = 10;
const DEFAULT_LARGE_STEP = 50;

export function useKeyboardResize(
  config: ResizableConfig | undefined,
): ResizableResult | null {
  const orientation = config?.orientation;
  const value = config?.value ?? 0;
  const min = config?.min;
  const max = config?.max;
  const step = config?.step ?? DEFAULT_STEP;
  const largeStep = config?.largeStep ?? DEFAULT_LARGE_STEP;
  const onResize = config?.onResize;
  const label = config?.label;

  const constrain = useCallback(
    (v: number) => {
      let result = v;
      if (min != null) result = Math.max(min, result);
      if (max != null) result = Math.min(max, result);
      return result;
    },
    [min, max],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!config || !onResize) return;

      const increment = e.shiftKey ? largeStep : step;
      let newValue: number | null = null;

      if (orientation === "horizontal") {
        if (e.key === "ArrowRight") newValue = constrain(value + increment);
        else if (e.key === "ArrowLeft") newValue = constrain(value - increment);
      } else {
        if (e.key === "ArrowDown") newValue = constrain(value + increment);
        else if (e.key === "ArrowUp") newValue = constrain(value - increment);
      }

      if (e.key === "Home" && min != null) newValue = min;
      else if (e.key === "End" && max != null) newValue = max;

      if (newValue !== null && newValue !== value) {
        e.preventDefault();
        onResize(newValue);
      }
    },
    [
      config,
      orientation,
      value,
      min,
      max,
      step,
      largeStep,
      onResize,
      constrain,
    ],
  );

  if (!config) return null;

  const percentage =
    min != null && max != null && max > min
      ? Math.round(((value - min) / (max - min)) * 100)
      : undefined;

  return {
    resizeHandleProps: {
      role: "separator",
      "aria-orientation": orientation,
      "aria-valuenow": value,
      "aria-valuemin": config.min,
      "aria-valuemax": config.max,
      "aria-label": label,
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      style: {
        cursor: orientation === "horizontal" ? "col-resize" : "row-resize",
      },
      "data-resize-percentage": percentage,
    },
  };
}
