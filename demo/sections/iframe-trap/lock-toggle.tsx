import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusTrapResult, FocusTrapStrategy } from "../../../src/hooks";
import { createIframeSlotRegistry } from "../../../src/hooks/iframe-slot-registry";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

const CYCLE_ORDER = ["input", "frame", "button"];
const ENTER_LABEL = "Press Tab to enter the inner page";

export function LockToggleScenario() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const beforeRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  const trapRef = useRef<FocusTrapResult | null>(null);
  const registry = useMemo(() => createIframeSlotRegistry(), []);
  const [locked, setLocked] = useState(false);

  const src = useMemo(
    () => crossOriginInnerSrc(window.location.href, "iframe-inner.html"),
    [],
  );

  const iframesMap = useMemo(() => ({ frame: iframeRef }), []);

  const getElements = useMemo(
    () => () => ({
      input: inputRef.current ?? undefined,
      frame: wrapperRef.current ?? undefined,
      button: buttonRef.current ?? undefined,
    }),
    [],
  );

  const slot = useIframeSlot({
    slotName: "frame",
    iframeRef,
    beforeSentinelRef: beforeRef,
    afterSentinelRef: afterRef,
    cycleOrder: CYCLE_ORDER,
    getElements,
    onExit: (d) => trapRef.current?.cycleToAdjacentSlot(d),
    onRequestExit: () => trapRef.current?.exitTrap(),
    registry,
    enterLabel: ENTER_LABEL,
  });

  const strategy = useMemo<FocusTrapStrategy>(
    () => ({
      getElements,
      cycleOrder: CYCLE_ORDER,
      announceEnter: "Entered lock-toggle trap.",
      announceExit: "Exited lock-toggle trap",
      ...slot.strategyFragment,
    }),
    [getElements, slot.strategyFragment],
  );

  const trap = useFocusTrap({ containerRef, strategy });
  trapRef.current = trap;

  // Re-derive intercepts AFTER React commits the new iframe tabindex to the DOM
  // (the registry reads tabindex live, so notifying synchronously in the click
  // handler would read the stale value). `locked` drives the commit we react to,
  // even though it isn't read inside the effect body.
  // biome-ignore lint/correctness/useExhaustiveDependencies: locked triggers the post-commit notify
  useEffect(() => {
    registry.notifyChange();
  }, [locked, registry]);

  const toggleLock = () => setLocked((v) => !v);

  return (
    <section>
      <h2>2. Enterable / locked toggle</h2>
      <p style={{ fontSize: 13 }}>
        Toggle the iframe between enterable (tabindex 0) and locked (tabindex
        -1). When locked, Tab should skip over the iframe via the sentinels
        rather than descending into it.
      </p>
      <button type="button" data-testid="lock-toggle" onClick={toggleLock}>
        {locked
          ? "Unlock iframe (make enterable)"
          : "Lock iframe (tabindex -1)"}
      </button>
      <FocusReadout
        label="lock-toggle"
        isTrapped={trap?.isTrapped ?? false}
        iframes={iframesMap}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label="Lock-toggle iframe trap"
        data-testid="lock-container"
        style={{
          border: trap?.isTrapped ? "2px solid #2563eb" : "1px solid #ccc",
          borderRadius: 4,
          padding: 12,
          outline: "none",
        }}
      >
        <input ref={inputRef} type="text" placeholder="Before iframe" />
        <SentinelIframe
          wrapperRef={wrapperRef}
          iframeRef={iframeRef}
          beforeSentinelProps={slot.beforeSentinelProps}
          afterSentinelProps={slot.afterSentinelProps}
          src={src}
          title="lock"
          hint={ENTER_LABEL}
          iframeTabIndex={locked ? -1 : 0}
        />
        <button ref={buttonRef} type="button">
          After iframe
        </button>
      </div>
    </section>
  );
}
