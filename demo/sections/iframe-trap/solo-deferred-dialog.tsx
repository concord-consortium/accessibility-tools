import {
  type MouseEvent,
  type ReactNode,
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
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { trapContainerStyle } from "./container-style";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

// Regression demo for the activity-player Safari tab-out hang. It stacks the
// three traits the AP dialog combines, none of which reproduces alone (cf.
// scenarios 4, 2/6, and 7):
//
//   1. SOLO iframe — the iframe is the trap's ONLY slot, so a forward tab-out
//      wraps back INTO the iframe. A dropped exit redirect strands focus on the
//      (now de-tabbed) sentinel instead of continuing to a real next slot.
//   2. DEFERRED trap container — the whole trap subtree (container + sentinels +
//      iframe) mounts one render LATE, after the dialog box itself.
//   3. DIALOG opened from a button — programmatic entry (enterTrap on the
//      container ref-callback), with suppressHint keyed off pointer-vs-keyboard.
//
// The underlying bug: tabbing out of a cross-origin (out-of-process) iframe in
// Safari delivers the top-window `focus` event while the iframe is STILL
// document.activeElement; the deferred sync then clears IframeSlot's `inside`
// before the sentinel focusin, dropping the exit redirect. The fix tracks that
// ascent (IframeSlot.leavingIframe). The race only manifests in Safari with a
// real out-of-process frame — a fast local iframe settles focus too quickly to
// reproduce it here — so the deterministic regression lives in the unit test
// (src/hooks/iframe-slot.test.ts, "Safari ordering"). This scenario documents
// the host shape and is a manual smoke check that the combination stays wired.
const CYCLE_ORDER = ["content"];
const ENTER_LABEL = "Press Tab to enter the inner page";

/**
 * Mounts its children one render late (after the first effect), like a portal
 * host or async content gate that isn't ready on the dialog's first commit.
 */
function DeferredChildren({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : null;
}

export function SoloDeferredDialogScenario() {
  const [open, setOpen] = useState(false);
  // Modality detection lives HERE, in the dialog layer — pointer opens suppress
  // the visible hint, keyboard opens show it (same as scenario 7).
  const openedViaPointerRef = useRef(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const beforeRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  const trapRef = useRef<FocusTrapController | null>(null);

  const src = useMemo(
    () => crossOriginInnerSrc(window.location.href, "iframe-inner.html"),
    [],
  );
  const iframesMap = useMemo(() => ({ content: iframeRef }), []);

  // The iframe wrapper is the trap's only slot — no input/button neighbors.
  const getElements = useMemo(
    () => () => ({
      content: wrapperRef.current ?? undefined,
    }),
    [],
  );

  const closeDialog = useCallback(() => setOpen(false), []);

  const slot = useIframeSlot({
    slotName: "content",
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
      announceEnter: "Entered dialog. The iframe is the only slot.",
      announceExit: "Closed dialog",
      // Escape / full trap exit closes the dialog.
      onExit: closeDialog,
      ...slot.strategyFragment,
    }),
    [getElements, slot.strategyFragment, closeDialog],
  );

  const trap = useFocusTrap({ strategy });
  trapRef.current = trap;

  // Enter the trap once when the DEFERRED container commits. Because the
  // container + its sentinels mount in the same (late) commit and React attaches
  // child refs before parent refs, the sentinels exist by the time this runs.
  const enteredRef = useRef(false);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    trapRef.current?.containerRef(el);
    if (el && !enteredRef.current) {
      enteredRef.current = true;
      trapRef.current?.enterTrap({ suppressHint: openedViaPointerRef.current });
    } else if (!el) {
      enteredRef.current = false;
    }
  }, []);

  // Return focus to the trigger when the dialog closes.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (prevOpenRef.current && !open) triggerRef.current?.focus();
    prevOpenRef.current = open;
  }, [open]);

  const onTriggerClick = (e: MouseEvent<HTMLButtonElement>) => {
    // detail === 0 ⇒ keyboard activation; detail > 0 ⇒ a real pointer click.
    openedViaPointerRef.current = e.detail > 0;
    setOpen(true);
  };

  return (
    <section>
      <h2>8. Solo iframe in a deferred dialog (AP Safari tab-out shape)</h2>
      <p style={{ fontSize: 13 }}>
        Combines the three activity-player traits: <strong>solo iframe</strong>{" "}
        (the iframe is the only slot, so a tab-out wraps back into it), a{" "}
        <strong>deferred</strong> trap container (mounts one render after the
        dialog box), and a <strong>dialog opened from a button</strong>. Open
        it, Tab to descend, Tab through the inner controls, then Tab again to
        walk out — focus wraps back into the iframe (landing hint shows). The
        Safari out-of-process tab-out race this shape hit is covered by a
        deterministic unit test; a fast local iframe won't reproduce the timing
        here. Escape closes the dialog.
      </p>
      <FocusReadout
        label="solo-dialog"
        isTrapped={trap.isTrapped}
        iframes={iframesMap}
      />
      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        data-testid="solo-dialog-trigger"
      >
        Open dialog
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Solo iframe dialog"
          data-testid="solo-dialog-chrome"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            border: "2px solid #7c3aed",
            borderRadius: 6,
            padding: 16,
            width: 420,
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            zIndex: 1000,
          }}
        >
          <DeferredChildren>
            <div
              ref={setContainerRef}
              role="group"
              aria-label="Solo iframe trap"
              data-testid="solo-dialog-container"
              tabIndex={-1}
              style={trapContainerStyle(trap.isTrapped)}
            >
              <SentinelIframe
                wrapperRef={wrapperRef}
                iframeRef={iframeRef}
                beforeSentinelProps={slot.beforeSentinelProps}
                afterSentinelProps={slot.afterSentinelProps}
                src={src}
                title="solo-dialog"
                hint={ENTER_LABEL}
                iframeTabIndex={trap.isTrapped ? 0 : -1}
              />
            </div>
          </DeferredChildren>
          {/* Close lives OUTSIDE the trap container so it stays a non-slot (the
              trap is genuinely solo); it's reachable by click / Shift+Tab. */}
          <button
            type="button"
            onClick={closeDialog}
            data-testid="solo-dialog-close"
          >
            Close
          </button>
        </div>
      )}
    </section>
  );
}
