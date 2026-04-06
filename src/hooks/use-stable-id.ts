import { useRef } from "react";

/**
 * Generates a stable unique ID for a component instance.
 * React 17-compatible replacement for React 18's useId().
 * The ID persists across re-renders but is unique per mount.
 */
let counter = 0;

export function useStableId(): string {
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    idRef.current = `a11y-${++counter}`;
  }
  return idRef.current;
}
