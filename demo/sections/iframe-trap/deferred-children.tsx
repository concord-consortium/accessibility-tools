import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { FocusTrapResult, FocusTrapStrategy } from "../../../src/hooks";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { trapContainerStyle } from "./container-style";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";
import { useEnterToTrap } from "./use-enter-to-trap";

// Same input → iframe → button shape as the canonical scenario, but the
// sentinels + iframe are mounted one render LATE while the input and button
// mount normally — so a working iframe slot would sit between two known-good
// slots, making the broken slot stand out.
const CYCLE_ORDER = ["input", "frame", "button"];
const ENTER_LABEL = "Press Tab to enter the inner page";

/**
 * Mounts its children only after the first effect runs (one render late),
 * mimicking a host that builds the iframe subtree behind a `mounted` gate or a
 * portal target that isn't ready on the first render. The sentinel refs the
 * slot depends on are therefore null when useIframeSlot's attach effect runs.
 */
function DeferredChildren({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : null;
}

export function DeferredChildrenScenario() {
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

  // Identical wiring to the canonical scenario — only the render timing of the
  // iframe subtree differs.
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

  const { trap, containerProps } = useEnterToTrap(containerRef, strategy);
  trapRef.current = trap;

  return (
    <section>
      <h2>2. Deferred sentinel/iframe mount</h2>
      <p style={{ fontSize: 13 }}>
        Same input → iframe → button shape as scenario 1, but the sentinels and
        iframe are wrapped in a component that renders <code>null</code> on its
        first pass and mounts the subtree one render later (an effect-gated
        mount, like a portal whose host isn't ready yet). When{" "}
        <code>useIframeSlot</code>'s attach effect runs, the iframe/sentinel
        refs are still <code>null</code>, so the slot binds only the listeners
        that don't need them (the window-level focus tracking) and never
        re-attaches the iframe/sentinel listeners.
      </p>
      <p style={{ fontSize: 13 }}>
        The result is a <em>partial</em> break that's easy to miss. Going in
        looks fine: Tab from the input still descends into the iframe (native
        Tab finds the now-tabbable frame), and the window tracking still makes
        the sentinels tabbable while you're inside. The failure shows on the way
        out — tabbing out of the iframe lands on a sentinel but does{" "}
        <strong>not</strong> cycle to the next slot or show the landing hint
        (the sentinel's focusin/focusout handlers never bound), so focus rests
        on the invisible sentinel instead of wrapping. Compare against scenario
        1.
      </p>
      <FocusReadout
        label="deferred"
        isTrapped={trap?.isTrapped ?? false}
        iframes={iframesMap}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        {...containerProps}
        role="group"
        aria-label="Deferred-children iframe trap"
        data-testid="deferred-container"
        style={trapContainerStyle(trap?.isTrapped ?? false)}
      >
        <input ref={inputRef} type="text" placeholder="Before iframe" />
        <DeferredChildren>
          <SentinelIframe
            wrapperRef={wrapperRef}
            iframeRef={iframeRef}
            beforeSentinelProps={slot.beforeSentinelProps}
            afterSentinelProps={slot.afterSentinelProps}
            src={src}
            title="deferred"
            hint={ENTER_LABEL}
            // Host requirement: a managed slot must leave the tab order while its
            // trap is dormant, else Shift+Tab from outside falls into the iframe.
            // See docs/trap-composition.md → "Managed slots must be de-tabbed…".
            iframeTabIndex={trap?.isTrapped ? 0 : -1}
          />
        </DeferredChildren>
        <button ref={buttonRef} type="button">
          After iframe
        </button>
      </div>
    </section>
  );
}
