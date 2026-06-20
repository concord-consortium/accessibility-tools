import { type RefObject, useEffect, useMemo, useRef } from "react";
import type {
  FocusTrapController,
  FocusTrapStrategy,
  UseIframeSlotResult,
} from "../../../src/hooks";
import { createIframeSlotRegistry } from "../../../src/hooks/iframe-slot-registry";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { trapContainerStyle } from "./container-style";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

const CYCLE_ORDER = ["frameA", "frameB"];

export function MultiIframeScenario() {
  const trapRef = useRef<FocusTrapController | null>(null);
  const registry = useMemo(() => createIframeSlotRegistry(), []);

  const aWrap = useRef<HTMLDivElement>(null);
  const aFrame = useRef<HTMLIFrameElement>(null);
  const aBefore = useRef<HTMLElement>(null);
  const aAfter = useRef<HTMLElement>(null);

  const bWrap = useRef<HTMLDivElement>(null);
  const bFrame = useRef<HTMLIFrameElement>(null);
  const bBefore = useRef<HTMLElement>(null);
  const bAfter = useRef<HTMLElement>(null);

  const src = useMemo(
    () => crossOriginInnerSrc(window.location.href, "iframe-inner.html"),
    [],
  );

  const iframesMap = useMemo(() => ({ frameA: aFrame, frameB: bFrame }), []);

  const getElements = useMemo(
    () => () => ({
      frameA: aWrap.current ?? undefined,
      frameB: bWrap.current ?? undefined,
    }),
    [],
  );

  const slotA = useIframeSlot({
    slotName: "frameA",
    iframeRef: aFrame,
    beforeSentinelRef: aBefore,
    afterSentinelRef: aAfter,
    cycleOrder: CYCLE_ORDER,
    getElements,
    onExit: (d) => trapRef.current?.cycleToAdjacentSlot(d),
    onRequestExit: () => trapRef.current?.exitTrap(),
    registry,
    enterLabel: "Press Tab to enter iframe A",
  });

  const slotB = useIframeSlot({
    slotName: "frameB",
    iframeRef: bFrame,
    beforeSentinelRef: bBefore,
    afterSentinelRef: bAfter,
    cycleOrder: CYCLE_ORDER,
    getElements,
    onExit: (d) => trapRef.current?.cycleToAdjacentSlot(d),
    onRequestExit: () => trapRef.current?.exitTrap(),
    registry,
    enterLabel: "Press Tab to enter iframe B",
  });

  // Merge both fragments. nativeTabSlots / focusContent / sentinels must cover
  // both slots, so combine them explicitly rather than spreading one over the other.
  const strategy = useMemo<FocusTrapStrategy>(() => {
    const fragA = slotA.strategyFragment;
    const fragB = slotB.strategyFragment;
    return {
      getElements,
      cycleOrder: CYCLE_ORDER,
      // FocusTrapStrategy supports only ONE contentSlot, but this trap has two
      // iframe slots. We designate frameA as the content slot so programmatic
      // entry (enterTrap, and cycleToAdjacentSlot landing on frameA) dispatches
      // focusContent for it. frameB has no programmatic focusContent dispatch —
      // it is reachable via native Tab flow between the adjacent iframes, but
      // programmatic entry directly into frameB (e.g. reverse-wrap) will not run
      // its focusContent. This is a known single-contentSlot library limitation
      // that this scenario deliberately exercises.
      contentSlot: "frameA",
      announceEnter: "Entered multi-iframe trap. Tab cycles iframe A and B.",
      announceExit: "Exited multi-iframe trap",
      nativeTabSlots: [
        ...(fragA.nativeTabSlots ?? []),
        ...(fragB.nativeTabSlots ?? []),
      ],
      focusContent: (ctx) =>
        (fragA.focusContent?.(ctx) ?? false) ||
        (fragB.focusContent?.(ctx) ?? false),
      getNativeTabSlotSentinels: (name: string) => {
        const fromA = fragA.getNativeTabSlotSentinels?.(name);
        if (fromA && (fromA.before || fromA.after)) return fromA;
        return (
          fragB.getNativeTabSlotSentinels?.(name) ?? {
            before: null,
            after: null,
          }
        );
      },
    };
  }, [getElements, slotA.strategyFragment, slotB.strategyFragment]);

  // Always-enabled trap: the engine gives Enter-to-enter / Tab-skips-past for
  // free. (canonical.tsx keeps useEnterToTrap to model CLUE's dormant tile.)
  const trap = useFocusTrap({ strategy });
  trapRef.current = trap;
  const isTrapped = trap.isTrapped;

  // Re-derive intercepts AFTER React commits the new iframe tabindex (gated on
  // isTrapped below) to the DOM — the registry reads tabindex live, so a
  // synchronous notify would read the stale value.
  // biome-ignore lint/correctness/useExhaustiveDependencies: isTrapped triggers the post-commit notify
  useEffect(() => {
    registry.notifyChange();
  }, [isTrapped, registry]);

  const renderFrame = (
    name: string,
    wrapperRef: RefObject<HTMLDivElement | null>,
    iframeRef: RefObject<HTMLIFrameElement | null>,
    slot: UseIframeSlotResult,
    hint: string,
  ) => (
    <SentinelIframe
      wrapperRef={wrapperRef}
      iframeRef={iframeRef}
      beforeSentinelProps={slot.beforeSentinelProps}
      afterSentinelProps={slot.afterSentinelProps}
      src={src}
      title={name}
      hint={hint}
      // Host requirement: managed slots leave the tab order while the trap is
      // dormant, else Shift+Tab from outside falls into an iframe.
      // See docs/trap-composition.md → "Managed slots must be de-tabbed…".
      iframeTabIndex={isTrapped ? 0 : -1}
    />
  );

  return (
    <section>
      <h2>5. Two adjacent iframes (shared registry)</h2>
      <p style={{ fontSize: 13 }}>
        Two enterable iframes next to each other. Tabbing from A into B should
        flow natively (no sentinel interception between them); the sentinels at
        the outer edges still bound the trap.
      </p>
      <FocusReadout
        label="multi"
        isTrapped={trap.isTrapped}
        iframes={iframesMap}
      />
      <div
        tabIndex={0}
        ref={trap.containerRef}
        role="group"
        aria-label="Multi-iframe trap"
        data-testid="multi-container"
        style={trapContainerStyle(trap.isTrapped, {
          display: "grid",
          gap: 8,
        })}
      >
        {renderFrame(
          "frameA",
          aWrap,
          aFrame,
          slotA,
          "Press Tab to enter iframe A",
        )}
        {renderFrame(
          "frameB",
          bWrap,
          bFrame,
          slotB,
          "Press Tab to enter iframe B",
        )}
      </div>
    </section>
  );
}
