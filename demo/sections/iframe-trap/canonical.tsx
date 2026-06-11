import { useMemo, useRef } from "react";
import type { FocusTrapResult, FocusTrapStrategy } from "../../../src/hooks";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { trapContainerStyle } from "./container-style";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

const CYCLE_ORDER = ["input", "frame", "button"];
const ENTER_LABEL = "Press Tab to enter the inner page";

export function CanonicalScenario() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const beforeRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  // Trap is created after the slot; read it through a ref to break the cycle.
  const trapRef = useRef<FocusTrapResult | null>(null);

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
    enterLabel: ENTER_LABEL,
  });

  const strategy = useMemo<FocusTrapStrategy>(
    () => ({
      getElements,
      cycleOrder: CYCLE_ORDER,
      announceEnter: "Entered iframe trap. Tab cycles input, iframe, button.",
      announceExit: "Exited iframe trap",
      ...slot.strategyFragment,
    }),
    [getElements, slot.strategyFragment],
  );

  const trap = useFocusTrap({ containerRef, strategy });
  trapRef.current = trap;

  return (
    <section>
      <h2>1. Canonical: input → iframe → button</h2>
      <p style={{ fontSize: 13 }}>
        Focus the container and press Enter, or click a control. Tab forward:
        input → (descend into iframe) → button → input. Shift+Tab reverses.
        Escape exits.
      </p>
      <FocusReadout
        label="canonical"
        isTrapped={trap?.isTrapped ?? false}
        iframes={iframesMap}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label="Canonical iframe trap"
        data-testid="canonical-container"
        style={trapContainerStyle(trap?.isTrapped ?? false)}
      >
        <input ref={inputRef} type="text" placeholder="Before iframe" />
        <SentinelIframe
          wrapperRef={wrapperRef}
          iframeRef={iframeRef}
          beforeSentinelProps={slot.beforeSentinelProps}
          afterSentinelProps={slot.afterSentinelProps}
          src={src}
          title="canonical"
          hint={ENTER_LABEL}
        />
        <button ref={buttonRef} type="button">
          After iframe
        </button>
      </div>
    </section>
  );
}
