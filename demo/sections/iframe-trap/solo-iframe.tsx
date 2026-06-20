import { useMemo, useRef } from "react";
import type {
  FocusTrapController,
  FocusTrapStrategy,
} from "../../../src/hooks";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { trapContainerStyle } from "./container-style";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

// The trap's only slot is the iframe — no other focusable slots.
const CYCLE_ORDER = ["frame"];
const ENTER_LABEL = "Press Tab to enter the inner page";

export function SoloIframeScenario() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const beforeRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  // Trap is created after the slot; read it through a ref to break the cycle.
  const trapRef = useRef<FocusTrapController | null>(null);

  const src = useMemo(
    () => crossOriginInnerSrc(window.location.href, "iframe-inner.html"),
    [],
  );

  const iframesMap = useMemo(() => ({ frame: iframeRef }), []);

  const getElements = useMemo(
    () => () => ({
      frame: wrapperRef.current ?? undefined,
    }),
    [],
  );

  // Single iframe content slot: no registry (single-iframe fallback).
  const slot = useIframeSlot({
    slotName: "frame",
    iframeRef,
    beforeSentinelRef: beforeRef,
    afterSentinelRef: afterRef,
    cycleOrder: CYCLE_ORDER,
    getElements,
    onExit: (d) => trapRef.current?.cycleToAdjacentSlot(d),
    onRequestExit: () => trapRef.current?.exitTrap(),
    enterLabel: ENTER_LABEL,
  });

  const strategy = useMemo<FocusTrapStrategy>(
    () => ({
      getElements,
      cycleOrder: CYCLE_ORDER,
      announceEnter: "Entered iframe trap. The iframe is the only slot.",
      announceExit: "Exited iframe trap",
      ...slot.strategyFragment,
    }),
    [getElements, slot.strategyFragment],
  );

  // Always-enabled trap: the engine gives Enter-to-enter / Tab-skips-past for
  // free. (canonical.tsx keeps useEnterToTrap to model CLUE's dormant tile.)
  const trap = useFocusTrap({ strategy });
  trapRef.current = trap;

  return (
    <section>
      <h2>4. Single iframe only (no other slots)</h2>
      <p style={{ fontSize: 13 }}>
        The trap's only slot is the non-cooperating iframe. Focus the container
        and press Enter to descend into it. Tab/Shift+Tab cycle within the inner
        controls and should stay inside the iframe (wrapping back into it at the
        edges). Escape exits.
      </p>
      <FocusReadout
        label="solo"
        isTrapped={trap.isTrapped}
        iframes={iframesMap}
      />
      <div
        tabIndex={0}
        ref={trap.containerRef}
        role="group"
        aria-label="Single iframe trap"
        data-testid="solo-container"
        style={trapContainerStyle(trap.isTrapped)}
      >
        <SentinelIframe
          wrapperRef={wrapperRef}
          iframeRef={iframeRef}
          beforeSentinelProps={slot.beforeSentinelProps}
          afterSentinelProps={slot.afterSentinelProps}
          src={src}
          title="solo"
          hint={ENTER_LABEL}
          // Host requirement: a managed slot must leave the tab order while its
          // trap is dormant, else Shift+Tab from outside falls into the iframe.
          // See docs/trap-composition.md → "Managed slots must be de-tabbed…".
          iframeTabIndex={trap.isTrapped ? 0 : -1}
        />
      </div>
    </section>
  );
}
