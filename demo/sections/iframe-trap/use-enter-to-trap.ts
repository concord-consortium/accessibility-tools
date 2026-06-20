import {
  type MutableRefObject,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  FocusTrapController,
  FocusTrapStrategy,
} from "../../../src/hooks";
import { findNextFocusableOutside } from "../../../src/hooks/dom-utils";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";

export interface EnterToTrapResult {
  trap: FocusTrapController;
  /** Spread onto the trap container element. */
  containerProps: {
    ref: (el: HTMLElement | null) => void;
    onKeyDown: (e: ReactKeyboardEvent) => void;
  };
}

/**
 * Model a CLUE-style "dormant tile" trap, where `enabled` is tied to selection
 * rather than to trap entry: an unselected tile sits `enabled=false` and routes
 * Tab to `onTabWhenInactive` for inter-tile navigation.
 *
 * Most scenarios don't need this. The unified engine already gives an *enabled*
 * but not-yet-trapped trap "Enter to enter, Tab skips past" for free (the
 * not-trapped branch of FocusTrapController.handleKeyDown), so the other
 * scenarios — like focus-trap.tsx — just call `useFocusTrap({ strategy })`
 * directly. This hook is kept on the canonical scenario to exercise the one
 * integration shape that path doesn't cover: a trap driven `enabled=false` while
 * dormant, the way CLUE drives every unselected tile (docs/trap-composition.md →
 * "CLUE picked Model B"). It is the demo's only exercise of `onTabWhenInactive`
 * (which also has a controller unit test).
 *
 * What it does:
 * - starts disabled, so Tab on the container skips past the whole trap (the
 *   iframe slot is a nativeTabSlot and stays tabbable, so a plain disable isn't
 *   enough — onTabWhenInactive actively moves focus out);
 * - Enter on the container enables + enters (the engine ignores Enter while
 *   disabled, so the host has to bridge it);
 * - keeps `enabled` mirrored to `isTrapped`, so the trap re-disarms after it
 *   releases (Escape) and stays consistent when the engine enters on a click.
 */
export function useEnterToTrap(
  containerRef: MutableRefObject<HTMLElement | null>,
  strategy: FocusTrapStrategy,
): EnterToTrapResult {
  const [enabled, setEnabled] = useState(false);
  const pendingEnter = useRef(false);

  const strategyWithSkip = useMemo<FocusTrapStrategy>(
    () => ({
      ...strategy,
      onTabWhenInactive: (_e, reverse) => {
        const container = containerRef.current;
        if (!container) return false;
        findNextFocusableOutside(container, reverse)?.focus();
        return true;
      },
    }),
    [strategy, containerRef],
  );

  const trap = useFocusTrap({
    strategy: strategyWithSkip,
    enabled,
  });
  const isTrapped = trap.isTrapped;

  // Attach the container to both the host RefObject (read by onTabWhenInactive)
  // and the controller. Identity is stable: containerRef and trap are stable.
  const setContainer = useCallback(
    (el: HTMLElement | null) => {
      containerRef.current = el;
      trap.containerRef(el);
    },
    [containerRef, trap],
  );

  // Read the latest trap without re-running the entry effect every render.
  const trapRef = useRef(trap);
  trapRef.current = trap;

  // Deferred entry: the wrapper's setEnabled effect runs before this one, so the
  // controller is enabled by the time we enter. Guarded by pendingEnter so a
  // click-entry (which the engine activates on its own) doesn't double-enter.
  useEffect(() => {
    if (enabled && pendingEnter.current) {
      pendingEnter.current = false;
      trapRef.current?.enterTrap();
    }
  }, [enabled]);

  // Mirror enabled to trapped so the trap is disabled whenever it isn't active
  // (Tab then skips past). Covers Escape exit and engine-driven click entry; the
  // manual setEnabled(true) on Enter bridges the gap until isTrapped catches up.
  useEffect(() => {
    setEnabled(isTrapped);
  }, [isTrapped]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === "Enter" && e.target === e.currentTarget && !isTrapped) {
        e.preventDefault();
        pendingEnter.current = true;
        setEnabled(true);
      }
    },
    [isTrapped],
  );

  return { trap, containerProps: { ref: setContainer, onKeyDown } };
}
