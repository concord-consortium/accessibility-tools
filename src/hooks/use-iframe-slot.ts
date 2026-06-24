/**
 * useIframeSlot — thin React hook wiring the agnostic IframeSlot to a focus
 * trap (§5/§6 of specs/2026-06-09-iframe-slot-support.md).
 *
 * The host renders [before-sentinel][iframe][after-sentinel], spreads the
 * returned *-SentinelProps (ref + key ONLY), maps its content slot's element to
 * the iframe wrapper in getElements, and merges strategyFragment into the
 * FocusTrapStrategy passed to useFocusTrap. The host owns iframe tabIndex,
 * sentinel styling, and the static label text; the library is the single
 * imperative writer of tabindex/data-show-hint/aria on the sentinels.
 */

import {
  type MutableRefObject,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { deriveIntercept } from "./dom-utils";
import type { FocusTransport } from "./focus-messages";
import { IframeSlot } from "./iframe-slot";
import type { IframeSlotRegistry } from "./iframe-slot-registry";
import type { FocusContentContext, FocusTrapStrategy } from "./types";

export interface UseIframeSlotOptions {
  /** The slot's name in cycleOrder (also the trap's contentSlot). */
  slotName: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  beforeSentinelRef: MutableRefObject<HTMLElement | null>;
  afterSentinelRef: MutableRefObject<HTMLElement | null>;
  /** The trap's cycleOrder (for intercept derivation). */
  cycleOrder: string[];
  /** The trap's getElements (for intercept derivation / DOM order). */
  getElements: () => Record<string, HTMLElement | undefined>;
  /** Wired to the trap's cycleToAdjacentSlot. */
  onExit: (direction: 1 | -1) => void;
  /** Wired to the trap's exitTrap (inbound escape). */
  onRequestExit?: () => void;
  /** Optional cooperating-path channel. */
  transport?: FocusTransport;
  /**
   * Optional shared registry (createIframeSlotRegistry) so this slot sees its
   * sibling iframe-slots for intercept derivation (§4). Omit for the
   * single-iframe-content-slot case.
   */
  registry?: IframeSlotRegistry;
  /** Visible-hint label, e.g. "Press Tab to enter " + interactiveName. */
  enterLabel?: string;
}

export interface UseIframeSlotResult {
  beforeSentinelProps: { ref: (node: HTMLElement | null) => void; key: string };
  afterSentinelProps: { ref: (node: HTMLElement | null) => void; key: string };
  strategyFragment: Partial<FocusTrapStrategy>;
  requestRestore: () => void;
}

export function useIframeSlot(
  options: UseIframeSlotOptions,
): UseIframeSlotResult {
  const {
    slotName,
    iframeRef,
    beforeSentinelRef,
    afterSentinelRef,
    cycleOrder,
    getElements,
    onExit,
    onRequestExit,
    transport,
    registry,
    enterLabel,
  } = options;

  // Break the build-order cycle: onExit references the trap's
  // cycleToAdjacentSlot, which references this slot's focusContent. Read onExit
  // through a ref refreshed each render so the IframeSlot (built once) always
  // calls the latest closure.
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onRequestExitRef = useRef(onRequestExit);
  onRequestExitRef.current = onRequestExit;

  // Intercept derivation closes over first-render cycleOrder/getElements/registry.
  // These must be stable references across renders (registry is created once by
  // the host; cycleOrder/getElements are stable in correct usage). registry.getIframeSlots()
  // is read live each call so multi-iframe neighbors are always current.
  const getIntercept = () => {
    if (registry) {
      // Multi-iframe: derive from the full set of registered iframe-slots.
      return deriveIntercept({
        slotName,
        cycleOrder,
        getElements,
        iframeSlots: registry.getIframeSlots(),
      });
    }
    // Single-iframe fallback: report only self ⇒ neighbors look like normal
    // slots ⇒ intercept both directions.
    const iframe = iframeRef.current;
    const enterable = iframe ? iframe.getAttribute("tabindex") !== "-1" : true;
    return deriveIntercept({
      slotName,
      cycleOrder,
      getElements,
      iframeSlots: { [slotName]: { enterable } },
    });
  };

  // Construct the agnostic core once.
  const slotRef = useRef<IframeSlot | null>(null);
  if (slotRef.current === null) {
    slotRef.current = new IframeSlot({
      slotName,
      getIframe: () => iframeRef.current,
      getBeforeSentinel: () => beforeSentinelRef.current,
      getAfterSentinel: () => afterSentinelRef.current,
      onExit: (d) => onExitRef.current(d),
      onRequestExit: () => onRequestExitRef.current?.(),
      getIntercept,
      transport,
      enterLabel,
    });
  }

  // Attach on mount; detach on unmount. attach/detach are idempotent, so a
  // StrictMode mount/unmount/remount is safe.
  useEffect(() => {
    const slot = slotRef.current;
    slot?.attach();
    return () => slot?.detach();
  }, []);

  // The slot is constructed once, capturing whatever `transport` existed on the
  // first render — for the dialog that's `undefined`, because its FocusManager
  // transport is built in a later passive effect and surfaced on a subsequent
  // render. Forward the current transport so the slot subscribes to it when it
  // arrives (and re-subscribes if it changes). setTransport is idempotent for an
  // unchanged value, so the mount-time call with the initial transport is a
  // no-op.
  useEffect(() => {
    slotRef.current?.setTransport(transport);
  }, [transport]);

  // Register with the shared registry (if any) so siblings see this slot, and
  // refresh our own intercept whenever membership / enterable state changes.
  useEffect(() => {
    if (!registry) return;
    const unregister = registry.register(slotName, {
      isEnterable: () =>
        iframeRef.current
          ? iframeRef.current.getAttribute("tabindex") !== "-1"
          : true,
    });
    const unsubscribe = registry.onChange(() =>
      slotRef.current?.refreshIntercept(),
    );
    // Recompute now that membership may include neighbors that mounted first.
    slotRef.current?.refreshIntercept();
    return () => {
      unregister();
      unsubscribe();
    };
  }, [registry, slotName, iframeRef]);

  // Callback refs: write the host's RefObject (so its other reads still work)
  // and tell the slot to (re)bind. Fires on mount, unmount (node === null), and
  // re-mount (null then the new node) — so listeners follow deferred mounts and
  // node replacements. slotRef is set during render, so it is available here.
  const setBeforeSentinel = useCallback(
    (node: HTMLElement | null) => {
      beforeSentinelRef.current = node;
      slotRef.current?.syncListeners();
    },
    [beforeSentinelRef],
  );
  const setAfterSentinel = useCallback(
    (node: HTMLElement | null) => {
      afterSentinelRef.current = node;
      slotRef.current?.syncListeners();
    },
    [afterSentinelRef],
  );

  const strategyFragment = useMemo<Partial<FocusTrapStrategy>>(
    () => ({
      contentSlot: slotName,
      nativeTabSlots: [slotName],
      focusContent: (ctx: FocusContentContext) =>
        slotRef.current?.focusContent(ctx) ?? false,
      getNativeTabSlotSentinels: (name: string) =>
        name === slotName
          ? (slotRef.current?.getSentinels() ?? {
              before: null,
              after: null,
            })
          : { before: null, after: null },
    }),
    [slotName],
  );

  return {
    beforeSentinelProps: { ref: setBeforeSentinel, key: `${slotName}-before` },
    afterSentinelProps: { ref: setAfterSentinel, key: `${slotName}-after` },
    strategyFragment,
    requestRestore: () => slotRef.current?.requestRestore(),
  };
}
