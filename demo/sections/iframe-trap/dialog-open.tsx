import {
  type MouseEvent,
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
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

// The iframe slot is intentionally FIRST in the cycle so the entry lands on it —
// that's where the keyboard-vs-mouse hint difference is visible. Close is second.
const CYCLE_ORDER = ["content", "close"];
const ENTER_LABEL = "Press Tab to enter the inner page";

export function DialogOpenScenario() {
  const [open, setOpen] = useState(false);
  // Remember how the dialog was opened so the container-attach callback can pick
  // the entry style. Modality detection lives HERE, in the dialog layer — not in
  // the generic trap.
  const openedViaPointerRef = useRef(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const iframeWrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const beforeRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  const trapRef = useRef<FocusTrapController | null>(null);

  const src = useMemo(
    () => crossOriginInnerSrc(window.location.href, "iframe-inner.html"),
    [],
  );
  const iframesMap = useMemo(() => ({ content: iframeRef }), []);

  const getElements = useMemo(
    () => () => ({
      content: iframeWrapperRef.current ?? undefined,
      close: closeButtonRef.current ?? undefined,
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
      announceEnter:
        "Entered dialog. Tab cycles the iframe and the close button.",
      announceExit: "Closed dialog",
      // Escape exits the trap, which closes the dialog.
      onExit: closeDialog,
      ...slot.strategyFragment,
    }),
    [getElements, slot.strategyFragment, closeDialog],
  );

  const trap = useFocusTrap({ strategy });
  trapRef.current = trap;

  // Wire the trap's container seam + enter once when the dialog mounts. The
  // controller's containerRef is defer-safe. The entry style depends on how the
  // dialog was opened (modality): pointer opens suppress the visible hint.
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
    // detail === 0 ⇒ keyboard activation (Enter/Space synthesize a click with
    // detail 0); detail > 0 ⇒ a real pointer click.
    openedViaPointerRef.current = e.detail > 0;
    setOpen(true);
  };

  return (
    <section>
      <h2>7. Dialog open: mouse vs keyboard</h2>
      <p style={{ fontSize: 13 }}>
        Open the dialog <strong>with the mouse</strong>: it opens, the iframe
        slot is focused, but NO visible "Press Tab…" hint appears (the entry
        suppresses it). Open it <strong>from the keyboard</strong> (Tab to the
        button, press Enter/Space): the same iframe slot is focused WITH the
        visible hint. Both paths move focus into the dialog; only the visible
        hint differs. Escape or Close dismisses the dialog and returns focus to
        the trigger.
      </p>
      <FocusReadout
        label="dialog-open"
        isTrapped={trap.isTrapped}
        iframes={iframesMap}
      />
      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        data-testid="dialog-open-trigger"
      >
        Open dialog
      </button>
      {open && (
        <div
          ref={setContainerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Iframe dialog"
          data-testid="dialog-open-container"
          tabIndex={-1}
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
          <SentinelIframe
            wrapperRef={iframeWrapperRef}
            iframeRef={iframeRef}
            beforeSentinelProps={slot.beforeSentinelProps}
            afterSentinelProps={slot.afterSentinelProps}
            src={src}
            title="dialog-open"
            hint={ENTER_LABEL}
            iframeTabIndex={trap.isTrapped ? 0 : -1}
          />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => trapRef.current?.exitTrap()}
            data-testid="dialog-open-close"
          >
            Close
          </button>
        </div>
      )}
    </section>
  );
}
