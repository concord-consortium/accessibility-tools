import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusTrapResult, FocusTrapStrategy } from "../../../src/hooks";
import { createIframeSlotRegistry } from "../../../src/hooks/iframe-slot-registry";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { trapContainerStyle } from "./container-style";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";
import { useEnterToTrap } from "./use-enter-to-trap";

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

  const { trap, containerProps } = useEnterToTrap(containerRef, strategy);
  trapRef.current = trap;
  const isTrapped = trap?.isTrapped ?? false;

  // Re-derive intercepts AFTER React commits the new iframe tabindex to the DOM
  // (the registry reads tabindex live, so notifying synchronously would read the
  // stale value). Both `locked` and `isTrapped` drive the iframe tabindex commit
  // we react to, even though neither is read inside the effect body.
  // biome-ignore lint/correctness/useExhaustiveDependencies: locked/isTrapped trigger the post-commit notify
  useEffect(() => {
    registry.notifyChange();
  }, [locked, isTrapped, registry]);

  const toggleLock = () => setLocked((v) => !v);

  return (
    <section>
      <h2>3. Enterable / locked toggle</h2>
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
        {...containerProps}
        role="group"
        aria-label="Lock-toggle iframe trap"
        data-testid="lock-container"
        style={trapContainerStyle(trap?.isTrapped ?? false)}
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
          // Enterable only while the trap is active AND not locked. The dormant
          // -1 satisfies the host requirement (no stray tab stop while the trap
          // is inactive); `locked` keeps it out even when active.
          // See docs/trap-composition.md → "Managed slots must be de-tabbed…".
          iframeTabIndex={!locked && isTrapped ? 0 : -1}
        />
        <button ref={buttonRef} type="button">
          After iframe
        </button>
      </div>
    </section>
  );
}
