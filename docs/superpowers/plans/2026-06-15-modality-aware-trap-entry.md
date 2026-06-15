# Modality-aware trap entry (suppressHint) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a host enter a focus trap without the visible iframe-slot hint on pointer-driven opens, via a new `enterTrap({ suppressHint })` option, and demonstrate the keyboard-vs-mouse difference with a dialog demo scenario.

**Architecture:** Split the overloaded "landing" vocabulary into "landing" (focus rests on a sentinel — visible or not) and "hint" (the visible affordance). Rename the DOM marker `data-landing` → `data-show-hint` and the method `clearLanding` → `clearHint`. Add an orthogonal `suppressHint` field to `FocusContentContext`, threaded `enterTrap → focusEntrySlot → focusSlot → focusContent`; in the non-cooperating programmatic branch of `IframeSlot.focusContent`, `suppressHint: true` focuses the sentinel quietly (no `data-show-hint`). The generic trap stays modality-agnostic; modality detection lives in a host/dialog layer (demonstrated by the new demo scenario).

**Tech Stack:** TypeScript, React 18, Vitest + @testing-library/react (jsdom), Biome, Vite demo.

**Spec:** [`docs/superpowers/specs/2026-06-15-modality-aware-trap-entry-design.md`](../specs/2026-06-15-modality-aware-trap-entry-design.md)

---

## File Structure

- `src/hooks/iframe-slot.ts` — rename `clearLanding`→`clearHint`, `data-landing`→`data-show-hint`; honor `ctx.suppressHint` in `focusContent`. (MODIFY)
- `src/hooks/iframe-slot.test.ts` — migrate `data-landing` assertions to `data-show-hint`; add `suppressHint` tests. (MODIFY)
- `src/hooks/types.ts` — add `suppressHint?: boolean` to `FocusContentContext`. (MODIFY)
- `src/hooks/focus-trap-controller.ts` — `enterTrap(options?)`; thread `suppressHint` through `focusEntrySlot`/`focusSlot`. (MODIFY)
- `src/hooks/focus-trap-controller.test.ts` — update existing `focusContent` context assertions to include `suppressHint: false`; add an `enterTrap({ suppressHint: true })` test. (MODIFY)
- `src/hooks/use-iframe-slot.ts` + `src/hooks/use-iframe-slot.test.ts` — rename `data-landing` reference. (MODIFY)
- `demo/demo.css` — rename the `[data-landing]` selector + comment. (MODIFY)
- `demo/sections/iframe-trap/sentinel-iframe.tsx` — rename `data-landing` comments. (MODIFY)
- `demo/sections/iframe-trap/dialog-open.tsx` — new dialog scenario. (CREATE)
- `demo/iframe-trap.tsx` — register the new scenario. (MODIFY)
- `docs/iframe-slot-design.md` — rename + document `suppressHint` and the landing/hint split. (MODIFY)

Historical planning docs under `docs/superpowers/plans/` and `docs/superpowers/specs/` that mention `data-landing` are point-in-time records and are **not** edited.

---

## Task 1: Rename landing → hint vocabulary (no behavior change)

Pure rename: the DOM marker `data-landing` becomes `data-show-hint`; the method `clearLanding` becomes `clearHint`. "Landing" stays in prose for the generic "focus rests on a sentinel" sense.

**Files:**
- Modify: `src/hooks/iframe-slot.ts`
- Modify: `src/hooks/iframe-slot.test.ts`
- Modify: `src/hooks/use-iframe-slot.ts`
- Modify: `src/hooks/use-iframe-slot.test.ts:61`
- Modify: `demo/demo.css:114-129`
- Modify: `demo/sections/iframe-trap/sentinel-iframe.tsx`

- [ ] **Step 1: Rename in `iframe-slot.ts` — the `clearHint` definition**

Replace the `clearLanding` method (currently `src/hooks/iframe-slot.ts:304-312`):

```ts
  private clearHint(): void {
    for (const el of [
      this.options.getBeforeSentinel(),
      this.options.getAfterSentinel(),
    ]) {
      el?.removeAttribute("data-show-hint");
      el?.removeAttribute("aria-label");
    }
  }
```

- [ ] **Step 2: Rename the `clearLanding` call sites + the attribute in `focusContent`**

In `handleIframeFocus` (currently `:185-189`):

```ts
  private handleIframeFocus(): void {
    this.inside = true;
    this.clearHint();
    this.applyTabindex();
  }
```

In `handleSentinelFocusOut` (currently `:238-244`):

```ts
  private handleSentinelFocusOut(): void {
    // Ignore the focusout caused by our own focus move between sentinels (we are
    // establishing a landing, not leaving it). A genuine leave (Escape/trap
    // exit, click away, descent) happens with movingFocus === false.
    if (this.movingFocus) return;
    this.clearHint();
  }
```

Replace `focusContent` (currently `:273-302`) — same logic, renamed only:

```ts
  focusContent(ctx: FocusContentContext): boolean {
    const before = this.options.getBeforeSentinel();
    const after = this.options.getAfterSentinel();
    const target = ctx.entryMode === "reverse" ? after : before;

    if (ctx.trigger === "sequentialNavigation") {
      // Positioner: silent invisible sentinel; the pending Tab default descends.
      this.clearHint();
      this.focusSentinel(target);
      return true;
    }

    // Programmatic (landing). Cooperating ⇒ precise placement via the protocol.
    if (this.cooperating && this.options.transport) {
      const mode = ctx.entryMode === "reverse" ? "reverse" : "forward";
      this.options.transport.send({ type: "focusEnter", mode });
      return true;
    }

    // Non-cooperating ⇒ focus the sentinel and reveal the visible hint; the
    // user's next Tab descends.
    this.clearHint();
    if (target) {
      target.setAttribute("data-show-hint", "");
      if (this.options.enterLabel) {
        target.setAttribute("aria-label", this.options.enterLabel);
      }
      this.focusSentinel(target);
    }
    return true;
  }
```

Also update the `enterLabel` doc comment (currently `:29-33`) so it reads "Visible-hint label written/announced when the hint is shown."

- [ ] **Step 3: Rename in `use-iframe-slot.ts` comment**

`src/hooks/use-iframe-slot.ts:10` — change `tabindex/data-landing/aria` to `tabindex/data-show-hint/aria`.

- [ ] **Step 4: Migrate test assertions**

In `src/hooks/iframe-slot.test.ts`, replace every occurrence of `data-landing` with `data-show-hint` (lines 119, 123, 225, 243, 253, 259, 263, 269, 271, 277, 279, 292, 427). The test-name strings that say "landing" may stay (they describe the generic rest). Example after edit (was `:238-244`):

```ts
  it("hint mode (non-cooperating) focuses sentinel + sets data-show-hint", () => {
    const { slot, before } = setup();
    vi.spyOn(before, "focus");
    slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
    expect(before.focus).toHaveBeenCalled();
    expect(before.getAttribute("data-show-hint")).toBe("");
  });
```

In `src/hooks/use-iframe-slot.test.ts:55,61`:

```ts
  it("sentinel props expose a ref + stable key, never tabIndex/data-show-hint", () => {
    const { result } = renderSlot();
    const props = result.current.beforeSentinelProps;
    expect(props).toHaveProperty("ref");
    expect(props).toHaveProperty("key");
    expect(props).not.toHaveProperty("tabIndex");
    expect(props).not.toHaveProperty("data-show-hint");
  });
```

- [ ] **Step 5: Rename in `demo/demo.css`**

Replace `demo/demo.css:114-129`:

```css
/* Iframe focus-trap test page: each sentinel carries its own "press Tab to
   enter" hint text. A sentinel collapses to zero height until the library marks
   it with data-show-hint (focus resting on it with the hint shown), when it
   expands in place to reveal the hint. */
.iframe-sentinel {
  display: block;
  height: 0;
  overflow: hidden;
  font: 12px system-ui;
  color: #b45309;
}
.iframe-sentinel[data-show-hint] {
  height: auto;
  overflow: visible;
  padding: 4px 0;
}
```

- [ ] **Step 6: Rename in `demo/sections/iframe-trap/sentinel-iframe.tsx`**

Line 15 comment: change `data-landing (see the .iframe-sentinel CSS)` to `data-show-hint (see the .iframe-sentinel CSS)`. Line 22 comment: change `tabindex/data-landing on the` to `tabindex/data-show-hint on the`.

- [ ] **Step 7: Run the affected unit tests**

Run: `npx vitest run iframe-slot use-iframe-slot`
Expected: PASS (all green; the rename is mechanical).

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/iframe-slot.ts src/hooks/iframe-slot.test.ts src/hooks/use-iframe-slot.ts src/hooks/use-iframe-slot.test.ts demo/demo.css demo/sections/iframe-trap/sentinel-iframe.tsx
git commit -m "$(cat <<'EOF'
LARA-215 refactor(iframe-slot): rename data-landing -> data-show-hint, clearLanding -> clearHint

Split the overloaded "landing" term: keep "landing" for the generic
"focus rests on a sentinel" sense; carve out "hint" for the visible
"Press Tab..." affordance. Pure rename, no behavior change.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `suppressHint` (types + controller + iframe-slot)

**Files:**
- Modify: `src/hooks/types.ts:35-52`
- Modify: `src/hooks/focus-trap-controller.ts` (`enterTrap` `:245-254`, `focusEntrySlot` `:522-538`, `focusSlot` `:540-575`)
- Modify: `src/hooks/iframe-slot.ts` (`focusContent`)
- Test: `src/hooks/iframe-slot.test.ts`, `src/hooks/focus-trap-controller.test.ts`

- [ ] **Step 1: Write the failing iframe-slot tests**

Add to the `describe("IframeSlot focusContent modes + getSentinels", …)` block in `src/hooks/iframe-slot.test.ts`:

```ts
  it("suppressHint focuses the sentinel WITHOUT setting data-show-hint", () => {
    const { slot, before } = setup();
    vi.spyOn(before, "focus");
    const handled = slot.focusContent({
      entryMode: "forward",
      trigger: "programmatic",
      suppressHint: true,
    });
    expect(handled).toBe(true);
    expect(before.focus).toHaveBeenCalled();
    expect(before.hasAttribute("data-show-hint")).toBe(false);
  });

  it("suppressHint is moot for a cooperating slot (still sends focusEnter)", () => {
    const send = vi.fn();
    const transport = { send, onMessage: () => () => {} };
    const { slot } = setup({ transport });
    slot.notifyCapability(true); // mark cooperating
    slot.focusContent({
      entryMode: "forward",
      trigger: "programmatic",
      suppressHint: true,
    });
    expect(send).toHaveBeenCalledWith({ type: "focusEnter", mode: "forward" });
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run iframe-slot -t "suppressHint"`
Expected: FAIL — the first test fails because the current code sets `data-show-hint` regardless of `suppressHint`; `suppressHint` is not yet a known field (the second may pass already, but the first must fail).

- [ ] **Step 3: Add `suppressHint` to `FocusContentContext`**

Replace `src/hooks/types.ts:35-52`:

```ts
export type FocusContentContext = {
  /**
   * Direction the trap is entering the content slot.
   * - "forward": cycling forward (Tab from previous slot, or initial entry).
   * - "reverse": cycling backward (Shift+Tab from next slot).
   */
  entryMode: "forward" | "reverse";

  /**
   * Whether this call rides the browser's pending native focus advance
   * ("sequentialNavigation" ⇒ positioner: focus the sentinel silently so the
   * pending Tab default descends) or is a programmatic entry with no such
   * advance ("programmatic" ⇒ place a visible, labeled "Press Tab to enter …"
   * hint (non-cooperating) or send focusEnter (cooperating)).
   */
  trigger: FocusContentTrigger;

  /**
   * Suppress the *visible* hint for this entry (default false). When true, a slot
   * that would otherwise show a hint (a non-cooperating iframe) focuses its
   * sentinel quietly: focus still rests there and a screen reader still reads the
   * sentinel text, but no visible "Press Tab …" affordance appears. Used by a host
   * for pointer-driven entries (e.g. a mouse-opened dialog). Cooperating slots and
   * normal focusable slots are unaffected.
   */
  suppressHint?: boolean;
};
```

- [ ] **Step 4: Honor `suppressHint` in `IframeSlot.focusContent`**

Replace `focusContent` in `src/hooks/iframe-slot.ts` (the version from Task 1):

```ts
  focusContent(ctx: FocusContentContext): boolean {
    const before = this.options.getBeforeSentinel();
    const after = this.options.getAfterSentinel();
    const target = ctx.entryMode === "reverse" ? after : before;

    if (ctx.trigger === "sequentialNavigation") {
      // Positioner: silent invisible sentinel; the pending Tab default descends.
      this.clearHint();
      this.focusSentinel(target);
      return true;
    }

    // Programmatic entry. Cooperating ⇒ precise placement via the protocol (no
    // visible hint either way, so suppressHint is moot here).
    if (this.cooperating && this.options.transport) {
      const mode = ctx.entryMode === "reverse" ? "reverse" : "forward";
      this.options.transport.send({ type: "focusEnter", mode });
      return true;
    }

    // Non-cooperating programmatic entry. Default: focus the sentinel and reveal
    // the visible hint; the user's next Tab descends. suppressHint: focus the
    // sentinel quietly (no visible hint) — focus still rests, the screen reader
    // still reads the sentinel text. Used for pointer-driven entries.
    this.clearHint();
    if (target) {
      if (!ctx.suppressHint) {
        target.setAttribute("data-show-hint", "");
        if (this.options.enterLabel) {
          target.setAttribute("aria-label", this.options.enterLabel);
        }
      }
      this.focusSentinel(target);
    }
    return true;
  }
```

- [ ] **Step 5: Run the iframe-slot tests to verify they pass**

Run: `npx vitest run iframe-slot`
Expected: PASS (the two new tests + all existing).

- [ ] **Step 6: Write the failing controller test**

In `src/hooks/focus-trap-controller.test.ts`, inside `describe("FocusTrapController nativeTabSlots / cycleToAdjacentSlot", …)`, add after the existing "enters a content slot in LANDING mode…" test (`:749-778`):

```ts
  it("enterTrap({ suppressHint: true }) threads suppressHint to focusContent", () => {
    const container = makeContainer();
    const wrap = document.createElement("div");
    const before = document.createElement("div");
    const after = document.createElement("div");
    wrap.append(before, after);
    container.append(wrap);

    const focusContent = vi.fn().mockReturnValue(true);
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content: wrap }),
      cycleOrder: ["content"],
      contentSlot: "content",
      nativeTabSlots: ["content"],
      focusContent,
      getNativeTabSlotSentinels: () => ({ before, after }),
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap({ suppressHint: true });

    expect(focusContent).toHaveBeenCalledWith({
      entryMode: "forward",
      trigger: "programmatic",
      suppressHint: true,
    });
  });
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run focus-trap-controller -t "threads suppressHint"`
Expected: FAIL — `enterTrap` does not yet accept options, and `focusContent` is called without `suppressHint`.

- [ ] **Step 8: Thread `suppressHint` through the controller**

Replace `enterTrap` (`src/hooks/focus-trap-controller.ts:245-254`):

```ts
  enterTrap(options?: { suppressHint?: boolean }): void {
    if (this.destroyed || !this.attached || !this.enabled) return;
    this.activateTrap({ announce: true });
    // enterTrap is a programmatic entry (no pending Tab default to descend with),
    // so a content slot enters with the visible hint by default ("programmatic"),
    // not the positioner. A host may pass { suppressHint: true } for a
    // pointer-driven entry: focus still rests on the sentinel, but no visible hint
    // is shown. See docs/iframe-slot-design.md.
    this.focusEntrySlot(false, "programmatic", options?.suppressHint ?? false);
  }
```

Replace `focusEntrySlot` (`:522-538`):

```ts
  private focusEntrySlot(
    reverse = false,
    trigger: FocusContentTrigger = "sequentialNavigation",
    suppressHint = false,
  ): void {
    const elements = this.strategy.getElements();
    const order = this.cycleOrder;
    const start = reverse ? order.length - 1 : 0;
    const end = reverse ? -1 : order.length;
    const step = reverse ? -1 : 1;
    for (let i = start; i !== end; i += step) {
      if (elements[order[i]]) {
        this.slotIndex = i;
        this.focusSlot(order[i], reverse, trigger, suppressHint);
        return;
      }
    }
  }
```

Replace the head of `focusSlot` (`:540-551`) — add the param and pass it into the context; the rest of the method is unchanged:

```ts
  private focusSlot(
    slotName: string,
    reverse = false,
    trigger: FocusContentTrigger = "sequentialNavigation",
    suppressHint = false,
  ): void {
    const contentSlot = this.strategy.contentSlot ?? "content";
    const entryMode = reverse ? "reverse" : "forward";
    if (
      slotName === contentSlot &&
      this.strategy.focusContent?.({ entryMode, trigger, suppressHint })
    )
      return;
```

(`cycleToAdjacentSlot` and the Tab handlers keep calling `focusSlot`/`focusEntrySlot` without the new arg, so `suppressHint` defaults to `false` there — the hint still shows for keyboard cycling, as intended.)

- [ ] **Step 9: Update the existing context-shape assertions**

The controller now always includes `suppressHint` in the `focusContent` context, so the exact-match assertions must include it. Update these four assertions:

`focus-trap-controller.test.ts:561-564`:

```ts
    expect(focusContent).toHaveBeenLastCalledWith({
      entryMode: "forward",
      trigger: "sequentialNavigation",
      suppressHint: false,
    });
```

`:569-572`:

```ts
    expect(focusContent).toHaveBeenLastCalledWith({
      entryMode: "reverse",
      trigger: "sequentialNavigation",
      suppressHint: false,
    });
```

`:742-745`:

```ts
    expect(focusContent).toHaveBeenCalledWith({
      entryMode: "forward",
      trigger: "sequentialNavigation",
      suppressHint: false,
    });
```

`:774-777`:

```ts
    expect(focusContent).toHaveBeenCalledWith({
      entryMode: "forward",
      trigger: "programmatic",
      suppressHint: false,
    });
```

- [ ] **Step 10: Run the controller tests**

Run: `npx vitest run focus-trap-controller`
Expected: PASS (new test + updated assertions + all existing).

- [ ] **Step 11: Full suite + type-check + lint**

Run: `npx vitest run && npx tsc --noEmit && npx biome check .`
Expected: all green.

- [ ] **Step 12: Commit**

```bash
git add src/hooks/types.ts src/hooks/iframe-slot.ts src/hooks/iframe-slot.test.ts src/hooks/focus-trap-controller.ts src/hooks/focus-trap-controller.test.ts
git commit -m "$(cat <<'EOF'
LARA-215 feat(focus-trap): enterTrap({ suppressHint }) for hint-less entry

Add an orthogonal suppressHint field to FocusContentContext, threaded
enterTrap -> focusEntrySlot -> focusSlot -> focusContent. For a
non-cooperating iframe slot, suppressHint:true focuses the sentinel
quietly (no data-show-hint) so a pointer-opened dialog moves focus in
without the keyboard hint. Default false keeps current behavior.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Dialog demo scenario (mouse vs keyboard)

**Files:**
- Create: `demo/sections/iframe-trap/dialog-open.tsx`
- Modify: `demo/iframe-trap.tsx`

- [ ] **Step 1: Create the scenario component**

Create `demo/sections/iframe-trap/dialog-open.tsx`:

```tsx
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
      announceEnter: "Entered dialog. Tab cycles the iframe and the close button.",
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
        Open the dialog <strong>with the mouse</strong>: it opens, the iframe slot
        is focused, but NO visible "Press Tab…" hint appears (the entry suppresses
        it). Open it <strong>from the keyboard</strong> (Tab to the button, press
        Enter/Space): the same iframe slot is focused WITH the visible hint. Both
        paths move focus into the dialog; only the visible hint differs. Escape or
        Close dismisses the dialog and returns focus to the trigger.
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
```

- [ ] **Step 2: Register the scenario in `demo/iframe-trap.tsx`**

Add the import alongside the others (after the `DeferredContainerScenario` import):

```tsx
import { DialogOpenScenario } from "./sections/iframe-trap/dialog-open";
```

Add the element after `<DeferredContainerScenario />` (currently `:25`):

```tsx
        <DeferredContainerScenario />
        <DialogOpenScenario />
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npx biome check .`
Expected: clean.

- [ ] **Step 4: Manual browser verification**

Run: `npm run demo` and open the iframe-trap page (the dev server prints the URL; the page is `/iframe-trap.html`). In scenario 7:

1. **Mouse open:** click "Open dialog". Expect: the dialog opens, NO visible "Press Tab…" text appears, the readout shows `trapped = true`, and focus is inside the dialog. Press Tab once → focus descends into the iframe (readout "descended into" = `content`).
2. **Keyboard open:** Close the dialog (Escape), then Tab to the "Open dialog" button and press Enter. Expect: the dialog opens WITH the visible "Press Tab to enter the inner page" hint shown and focused.
3. **Close paths:** Escape and the Close button both dismiss the dialog and return focus to the "Open dialog" trigger.

This covers spec verification caveat 1 (focus rests cleanly on the suppressed sentinel and the next Tab descends). Note caveat 2 (screen-reader announcement of the clipped sentinel text) requires a real screen reader and is out of scope for this manual pass — record it as a follow-up check.

- [ ] **Step 5: Commit**

```bash
git add demo/sections/iframe-trap/dialog-open.tsx demo/iframe-trap.tsx
git commit -m "$(cat <<'EOF'
LARA-215 test(demo): dialog open mouse-vs-keyboard scenario

Scenario 7: an external trigger opens a role=dialog containing an iframe
trap. Pointer opens (event.detail > 0) call enterTrap({ suppressHint:
true }); keyboard opens call enterTrap(). Demonstrates the canonical
host pattern: modality detection in the dialog layer, hint suppressed
for pointer entry.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Documentation

**Files:**
- Modify: `docs/iframe-slot-design.md`

- [ ] **Step 1: Rename the attribute throughout the design doc**

In `docs/iframe-slot-design.md`, replace every `data-landing` with `data-show-hint` (occurrences around lines 249, 263, 420, 440, 443, 458, 597, 599, 603, 605, 607, 609, 623). Where the prose says `clearLanding`, change it to `clearHint`.

- [ ] **Step 2: Add a "Landing vs. hint, and suppressing the hint" subsection**

Add this near the section that describes landing behavior (e.g. after the §6 entry-mode description; place it where the entry/landing mechanics are documented):

```markdown
### Landing vs. hint, and suppressing the hint

"Landing" means focus comes to **rest** on a sentinel (as opposed to the
transient positioner, where a pending Tab immediately descends). A landing may be
**visible** (the `data-show-hint` attribute reveals the "Press Tab…" text) or
**quiet** (no visible hint). The hint text always remains in the accessibility
tree — the sentinel is only *visually* clipped — so a screen reader reads it
either way; `data-show-hint` controls only the visual reveal.

The hint is **conditional**: it appears only for a slot that cannot be entered
programmatically — today, a non-cooperating iframe. A cooperating iframe places
focus via the transport protocol (no hint); a normal focusable slot shows no hint.

`enterTrap({ suppressHint: true })` requests a **quiet** landing: focus still
moves to the first actionable element (for an iframe slot, its sentinel), but the
visible hint is suppressed. This is intended for **pointer-driven** entries — e.g.
a dialog opened by mouse, where a sighted user should not be shown keyboard-only
jargon. The generic trap does not detect modality; the host (a dialog layer)
decides and passes `suppressHint`. See the demo's scenario 7
(`demo/sections/iframe-trap/dialog-open.tsx`) for the canonical pattern, and
`docs/superpowers/specs/2026-06-15-modality-aware-trap-entry-design.md` for the
rationale.
```

- [ ] **Step 3: Verify the doc has no stale `data-landing` / `clearLanding`**

Run: `grep -rn "data-landing\|clearLanding" docs/iframe-slot-design.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add docs/iframe-slot-design.md
git commit -m "$(cat <<'EOF'
LARA-215 docs(iframe-slot): landing/hint split + suppressHint

Rename data-landing -> data-show-hint, clearLanding -> clearHint, and
document the conditional hint, the visible-vs-quiet landing distinction,
and the enterTrap({ suppressHint }) pointer-entry pattern.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all green.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npx biome check .`
Expected: clean (no fixes needed).

- [ ] **Step 4: Confirm no stale names remain in shipped code/CSS**

Run: `grep -rn "data-landing\|clearLanding" src demo`
Expected: no output.

- [ ] **Step 5 (optional): Re-run the demo**

Run: `npm run demo` and re-confirm scenario 7 behaves per Task 3 Step 4.

---

## Follow-ups (out of scope)

- **activity-player migration:** detect modality at the dialog open site and call `trap.enterTrap({ suppressHint: true })` for pointer opens, mirroring scenario 7 ([`dialog-overlay.tsx:110-118`](../../../../activity-player/src/components/activity-page/managed-interactive/dialog-overlay.tsx#L110-L118)). The library change is non-breaking, so AP keeps working until then. May require `npx yalc publish && npx yalc push` to pick up the new option.
- **Screen-reader confirmation:** verify with a real screen reader that the clipped sentinel text is announced on a `suppressHint` entry (spec caveat 2).
