/**
 * useFocusTrap hook.
 *
 * A thin React wrapper over {@link FocusTrapController}. The controller is the
 * single focus-trap engine; this hook owns its lifecycle (create on mount,
 * destroy on unmount), mirrors `isTrapped` into React state, and forwards
 * trap events to the debug context.
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
import type { FocusTrapConfig, FocusTrapResult } from "./types";
import { useStableId } from "./use-stable-id";

export function useFocusTrap(
  config: FocusTrapConfig | undefined,
): FocusTrapResult | null {
  const [isTrapped, setIsTrapped] = useState(false);
  const instanceId = useStableId();
  const debugCtx = useAccessibilityContext();
  const containerRef = config?.containerRef;
  const strategy = config?.strategy;
  const enabled = config?.enabled ?? true;

  const controllerRef = useRef<FocusTrapController | null>(null);

  // Latest strategy/debug context, read by the create-once effect without
  // forcing it to re-run (and tear the controller down) on every change.
  const strategyRef = useRef(strategy);
  strategyRef.current = strategy;
  const debugCtxRef = useRef(debugCtx);
  debugCtxRef.current = debugCtx;

  // Create the controller once and tear it down on unmount. Idempotent across
  // StrictMode's double-mount (the controller guards its own `destroyed` flag).
  useEffect(() => {
    const container = containerRef?.current;
    const initialStrategy = strategyRef.current;
    if (!container || !initialStrategy) return;

    const controller = new FocusTrapController(container, initialStrategy, {
      onTrappedChange: setIsTrapped,
      onEvent: (event) =>
        debugCtxRef.current?.reportFocusTrapEvent(instanceId, event),
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [containerRef, instanceId]);

  // Keep the controller's strategy in sync.
  useEffect(() => {
    if (strategy) controllerRef.current?.setStrategy(strategy);
  }, [strategy]);

  // Keep the controller's enabled state in sync.
  useEffect(() => {
    controllerRef.current?.setEnabled(enabled);
  }, [enabled]);

  // Register with the debug context for the sidebar inspector.
  useEffect(() => {
    if (!config || !debugCtx) return;
    debugCtx.registerInstance(instanceId, {
      hookType: "focusTrap",
      containerElement: containerRef?.current,
    });
    return () => {
      debugCtx.unregisterInstance(instanceId);
    };
  }, [config, debugCtx, instanceId, containerRef]);

  if (!config) return null;

  return {
    isTrapped,
    enterTrap: () => controllerRef.current?.enterTrap(),
    exitTrap: () => controllerRef.current?.exitTrap(),
  };
}
