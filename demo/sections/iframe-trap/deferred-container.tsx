import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type {
  FocusTrapController,
  FocusTrapStrategy,
} from "../../../src/hooks";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { trapContainerStyle } from "./container-style";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";
import { useEnterToTrap } from "./use-enter-to-trap";

// Same input → iframe → button shape as the canonical scenario, but the WHOLE
// trap container <div> (the element carrying the controller's containerRef) is
// mounted one render LATE. This is the trap-CONTROLLER analogue of scenario 2:
//
// - Scenario 2 ("Deferred sentinel/iframe mount") defers only the iframe SUBTREE
//   inside an immediately-mounted container — it's the iframe-SLOT deferred guard.
// - This scenario defers the container itself, so the FocusTrapController's
//   containerRef ref-callback fires LATE — it's the trap-CONTROLLER deferred guard.
//
// With the pre-fix code the controller was constructed with its container in a
// mount-only effect, so a container that committed after the hook's first render
// (React portals / effect-gated / deferred children) meant the controller was
// never built and the trap never engaged. The container-less FocusTrapController
// + stable containerRef ref-callback (see
// docs/superpowers/plans/2026-06-13-deferred-focus-trap-controller.md, Tasks 1/2)
// fixes this: the controller attaches whenever the container commits, even late,
// so Enter/Tab engage the trap exactly like the canonical scenario. The unit-level
// regression lives in src/hooks/use-focus-trap.test.tsx (deferred mount + portal).
const CYCLE_ORDER = ["input", "frame", "button"];
const ENTER_LABEL = "Press Tab to enter the inner page";

/**
 * Mounts its children only after the first effect runs (one render late),
 * mimicking a host that builds the trap container behind a `mounted` gate or a
 * portal target that isn't ready on the first render. The container element the
 * controller's containerRef is wired to is therefore absent when the hook first
 * commits — the controller attaches only once the deferred subtree mounts.
 */
function DeferredChildren({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : null;
}

export function DeferredContainerScenario() {
  const containerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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
      input: inputRef.current ?? undefined,
      frame: wrapperRef.current ?? undefined,
      button: buttonRef.current ?? undefined,
    }),
    [],
  );

  // Identical wiring to the canonical scenario. All hooks are called
  // unconditionally (Rules of Hooks); only the RENDERED container subtree is
  // deferred, so the composed container ref fires late and the controller
  // attaches when the deferred <div> commits.
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
      <h2>6. Deferred trap container (controller attaches late)</h2>
      <p style={{ fontSize: 13 }}>
        Same input → iframe → button shape as scenario 1, but the WHOLE trap
        container is wrapped in a component that renders <code>null</code> on
        its first pass and mounts the container one render later (an
        effect-gated mount, like a portal whose host isn't ready yet). The
        controller's <code>containerRef</code> therefore fires late.
      </p>
      <p style={{ fontSize: 13 }}>
        This is the trap-<strong>controller</strong> analogue of scenario 2
        (which defers the iframe subtree INSIDE an immediately-mounted
        container). With the pre-fix code the controller was built in a
        mount-only effect, so a late container meant the trap never engaged. The
        container-less <code>FocusTrapController</code> + stable{" "}
        <code>containerRef</code> ref-callback now attaches whenever the
        container commits, even late — so Enter, Tab through the iframe, and
        Tab/Shift+Tab out behave exactly like scenario 1.
      </p>
      <FocusReadout
        label="deferred-container"
        isTrapped={trap.isTrapped}
        iframes={iframesMap}
      />
      <DeferredChildren>
        <div
          tabIndex={0}
          {...containerProps}
          role="group"
          aria-label="Deferred-container iframe trap"
          data-testid="deferred-container-container"
          style={trapContainerStyle(trap.isTrapped)}
        >
          <input ref={inputRef} type="text" placeholder="Before iframe" />
          <SentinelIframe
            wrapperRef={wrapperRef}
            iframeRef={iframeRef}
            beforeSentinelProps={slot.beforeSentinelProps}
            afterSentinelProps={slot.afterSentinelProps}
            src={src}
            title="deferred-container"
            hint={ENTER_LABEL}
            // Host requirement: a managed slot must leave the tab order while its
            // trap is dormant, else Shift+Tab from outside falls into the iframe.
            // See docs/trap-composition.md → "Managed slots must be de-tabbed…".
            iframeTabIndex={trap.isTrapped ? 0 : -1}
          />
          <button ref={buttonRef} type="button">
            After iframe
          </button>
        </div>
      </DeferredChildren>
    </section>
  );
}
