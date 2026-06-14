/**
 * useFocusTrap hook.
 *
 * A thin React wrapper over {@link FocusTrapController}. The controller is the
 * single focus-trap engine; this hook owns its lifecycle (construct on first
 * render, destroy on unmount) and forwards trap events to the debug context.
 *
 * The hook RETURNS the controller instance directly. Wire its `containerRef`
 * onto the trap's root element:
 *
 *   const trap = useFocusTrap({ strategy });
 *   return <div ref={trap.containerRef}>…</div>;
 *
 * **Portal- and defer-safe.** The controller is container-less at construction
 * and attaches its DOM listeners only when `containerRef` receives a non-null
 * element. Because `containerRef` is a stable bound arrow-field, React invokes
 * it exactly when the container node commits — even if that commit is deferred
 * (mounted in a later effect) or happens inside a `ReactDOM.createPortal`. No
 * "first commit" timing assumptions are baked in.
 *
 * **Re-render on trapped change.** The controller instance is stable across
 * renders, so a render-time read of `controller.isTrapped` would otherwise go
 * stale. The hook subscribes to the controller's `onTrappedChange` and bumps a
 * tick of local state, forcing a re-render so consumers that read
 * `controller.isTrapped` during render always see the current value.
 *
 * **Ownership.** `setEnabled`, `setStrategy`, and `destroy` are hook-owned —
 * the hook drives them from `config.enabled` / `config.strategy` and the
 * unmount cleanup. Consumers MUST NOT call them on the returned controller; the
 * consumer-facing surface is `containerRef`, `isTrapped`, `enterTrap`,
 * `exitTrap`, and `cycleToAdjacentSlot`.
 *
 * Behavior is whatever the controller does:
 * - When enabled but not trapped: Enter on the container enters the trap;
 *   Tab into a child (or a click from outside) implicitly activates it.
 * - When trapped: Tab/Shift+Tab cycles through strategy slots; Escape exits.
 * - When disabled (`config.enabled === false`): children are made non-tabbable
 *   and the trap stays dormant.
 */

import { useEffect, useRef, useState } from "react";
import { FocusTrapController } from "./focus-trap-controller";
import { useAccessibilityContext } from "./provider";
import type { FocusTrapConfig } from "./types";
import { useStableId } from "./use-stable-id";

export function useFocusTrap(
  config: FocusTrapConfig | undefined,
): FocusTrapController {
  const instanceId = useStableId();
  const debugCtx = useAccessibilityContext();
  const strategy = config?.strategy;
  const enabled = config?.enabled ?? true;

  const debugCtxRef = useRef(debugCtx);
  debugCtxRef.current = debugCtx;

  // Force a re-render when `trapped` flips so a render-time read of
  // controller.isTrapped is always current (the controller instance is stable,
  // so without this the value would go stale).
  const [, setTrappedTick] = useState(false);

  const [controller] = useState(() => {
    const c = new FocusTrapController(strategy ?? { getElements: () => ({}) }, {
      onTrappedChange: (t) => setTrappedTick(t),
      onEvent: (event) =>
        debugCtxRef.current?.reportFocusTrapEvent(instanceId, event),
      onContainerChange: (el) =>
        debugCtxRef.current?.registerInstance(instanceId, {
          hookType: "focusTrap",
          // Re-register overwrites by id → keeps the inspector live.
          containerElement: el,
        }),
    });
    // Seed `enabled` eagerly (pre-attach, a safe no-op on DOM) so a ref
    // callback that runs during the very first commit — before the
    // setEnabled effect below fires — sees the correct enabled state and an
    // enterTrap() in that callback engages. The effect keeps it in sync after.
    c.setEnabled(enabled);
    return c;
  });

  // Keep the controller's strategy in sync.
  useEffect(() => {
    if (strategy) controller.setStrategy(strategy);
  }, [strategy, controller]);

  // Keep the controller's enabled state in sync.
  useEffect(() => {
    controller.setEnabled(enabled);
  }, [enabled, controller]);

  // Initial debug registration (containerElement filled in by onContainerChange).
  useEffect(() => {
    if (!config || !debugCtx) return;
    debugCtx.registerInstance(instanceId, {
      hookType: "focusTrap",
      containerElement: null,
    });
    return () => debugCtx.unregisterInstance(instanceId);
  }, [config, debugCtx, instanceId]);

  // Tear the controller down on unmount. destroy() is idempotent, so a
  // StrictMode double-invoke is harmless; the discarded lazy-init controller
  // has no listeners (container-less) and is GC'd.
  useEffect(() => () => controller.destroy(), [controller]);

  return controller;
}
