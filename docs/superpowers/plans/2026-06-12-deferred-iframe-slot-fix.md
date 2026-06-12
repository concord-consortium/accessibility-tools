# Deferred / re-mounted iframe-slot listener binding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an iframe-slot's focus listeners bind correctly when its iframe/sentinel DOM nodes mount *after* the slot is created (deferred mount) or are *replaced* later (re-mount), instead of only at first attach.

**Architecture:** Keep the existing element-level listeners (they are scoped to the iframe/sentinels and never participate in the document-listener fan-out — see `demo/trap-benchmark.NOTES.md` on `tmp/trap-listener-scaling`). Replace `IframeSlot`'s one-shot `attach()` element binding with element-aware (re)binding via a new `syncListeners()` method that follows the live getters. Drive `syncListeners()` from React **callback refs** on the sentinels in `useIframeSlot`, so any mount/unmount/remount rebinds. Window blur/focus inside-tracking stays bound once (it reads `getIframe()` live, so it is already re-mount-safe). No changes to `FocusTrapController`, `FocusTrapStrategy`, or the host scenarios' wiring.

**Tech Stack:** TypeScript, React 18, Vitest + @testing-library/react (jsdom), Biome, Vite demo, chrome-devtools MCP for manual browser verification.

**Why Option A (vs routing through the controller's `focusin`):** Both avoid adding `document` listeners, so they are equivalent for the CLUE scaling concern. Option A is contained to the iframe-slot layer, leaves the shared controller and all existing tests untouched, and also fixes a latent `detach()` leak. The trade-off is that it keeps the element-listener pattern rather than unifying with the controller's delegation.

---

## File Structure

- `src/hooks/iframe-slot.ts` — replace one-shot element binding with `syncListeners()` + per-element bound tracking; `detach()` unbinds precisely. (MODIFY)
- `src/hooks/iframe-slot.test.ts` — add deferred-bind and re-mount/rebind tests. (MODIFY)
- `src/hooks/use-iframe-slot.ts` — return **callback refs** for the sentinels that set the passed RefObject and call `syncListeners()`; update `UseIframeSlotResult` ref type. (MODIFY)
- `src/hooks/use-iframe-slot.test.ts` — add a deferred-mount integration test that exercises the returned callback refs. (MODIFY)
- `demo/sections/iframe-trap/sentinel-iframe.tsx` — update the sentinel-props ref type from `RefObject` to a ref callback. (MODIFY)
- `demo/sections/iframe-trap/deferred-children.tsx` — flip scenario 2's description from "broken" to "now handled (regression guard)". (MODIFY)
- `docs/superpowers/specs/2026-06-11-iframe-slot-test-page-design.md` — update the scenario-2 findings entry to "fixed". (MODIFY)

---

## Task 1: `IframeSlot` element-aware (re)binding

**Files:**
- Modify: `src/hooks/iframe-slot.ts`
- Test: `src/hooks/iframe-slot.test.ts`

Current `attach()` reads the iframe/sentinels once and binds element listeners to whatever the getters return at that instant; `detach()` re-reads the getters to remove them (so a changed element leaks a listener). We replace this with `syncListeners()`, which tracks the element each listener is bound to and rebinds only what changed.

- [ ] **Step 1: Write the failing test — rebind follows a swapped sentinel**

Add to `src/hooks/iframe-slot.test.ts`, after the `describe("IframeSlot sentinel focusin exit", …)` block:

```ts
describe("IframeSlot syncListeners rebinding (deferred / re-mount)", () => {
  it("binds nothing when the elements are absent at attach, then binds on sync", () => {
    let iframe: HTMLIFrameElement | null = null;
    let before: HTMLElement | null = null;
    let after: HTMLElement | null = null;
    const onExit = vi.fn();
    const slot = new IframeSlot({
      slotName: "content",
      getIframe: () => iframe,
      getBeforeSentinel: () => before,
      getAfterSentinel: () => after,
      onExit,
      getIntercept: () => ({ forward: true, reverse: true }),
    });
    slot.attach(); // elements not present yet → nothing element-bound

    // The deferred nodes mount now.
    iframe = document.createElement("iframe");
    before = document.createElement("div");
    after = document.createElement("div");
    document.body.append(before, iframe, after);
    slot.syncListeners();

    iframe.dispatchEvent(new FocusEvent("focus")); // inside = true
    after.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(onExit).toHaveBeenCalledWith(1);
  });

  it("moves listeners to a replacement element and drops the old one (re-mount)", () => {
    const iframe = document.createElement("iframe");
    let before = document.createElement("div");
    const after = document.createElement("div");
    document.body.append(before, iframe, after);
    const onExit = vi.fn();
    const slot = new IframeSlot({
      slotName: "content",
      getIframe: () => iframe,
      getBeforeSentinel: () => before,
      getAfterSentinel: () => after,
      onExit,
      getIntercept: () => ({ forward: true, reverse: true }),
    });
    slot.attach();
    iframe.dispatchEvent(new FocusEvent("focus")); // inside = true

    const oldBefore = before;
    before = document.createElement("div"); // node replaced (re-mount)
    document.body.append(before);
    slot.syncListeners();

    before.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(onExit).toHaveBeenCalledWith(-1); // listener followed to the new node

    onExit.mockClear();
    oldBefore.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(onExit).not.toHaveBeenCalled(); // old node no longer wired
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/iframe-slot.test.ts -t "syncListeners"`
Expected: FAIL — `slot.syncListeners is not a function`.

- [ ] **Step 3: Implement `syncListeners()` + bound tracking**

In `src/hooks/iframe-slot.ts`, add three bound-element fields next to the other private state (near `private movingFocus = false;`):

```ts
  // Elements each set of listeners is currently bound to. syncListeners() rebinds
  // only when these differ from the live getters, so deferred mounts and
  // re-mounts move the listeners precisely and detach() removes the right ones.
  private boundIframe: HTMLIFrameElement | null = null;
  private boundBefore: HTMLElement | null = null;
  private boundAfter: HTMLElement | null = null;
```

Replace the whole `attach()` method with:

```ts
  attach(): void {
    if (this.attached) return;
    this.attached = true;
    if (typeof window !== "undefined") {
      window.addEventListener("blur", this.boundWindowFocusChange);
      window.addEventListener("focus", this.boundWindowFocusChange);
    }
    const transport = this.options.transport;
    if (transport && !this.unsubscribeTransport) {
      this.unsubscribeTransport = transport.onMessage((msg) =>
        this.handleMessage(msg),
      );
    }
    // Bind to whatever iframe/sentinels exist now; the host calls syncListeners()
    // again as nodes mount/remount.
    this.syncListeners();
  }

  /**
   * Bind the iframe/sentinel focus listeners to the elements the getters
   * currently return, rebinding only what changed. Idempotent. The host calls
   * this whenever a managed node mounts, unmounts, or is replaced (via the
   * sentinel callback refs in useIframeSlot) so the listeners follow deferred
   * mounts and re-mounts. No-op until attach() has run.
   */
  syncListeners(): void {
    if (!this.attached) return;
    const iframe = this.options.getIframe();
    if (iframe !== this.boundIframe) {
      this.boundIframe?.removeEventListener("focus", this.boundIframeFocus);
      this.boundIframe?.removeEventListener("blur", this.boundIframeBlur);
      iframe?.addEventListener("focus", this.boundIframeFocus);
      iframe?.addEventListener("blur", this.boundIframeBlur);
      this.boundIframe = iframe;
    }
    const before = this.options.getBeforeSentinel();
    if (before !== this.boundBefore) {
      this.boundBefore?.removeEventListener("focusin", this.boundBeforeFocusIn);
      this.boundBefore?.removeEventListener(
        "focusout",
        this.boundSentinelFocusOut,
      );
      before?.addEventListener("focusin", this.boundBeforeFocusIn);
      before?.addEventListener("focusout", this.boundSentinelFocusOut);
      this.boundBefore = before;
    }
    const after = this.options.getAfterSentinel();
    if (after !== this.boundAfter) {
      this.boundAfter?.removeEventListener("focusin", this.boundAfterFocusIn);
      this.boundAfter?.removeEventListener(
        "focusout",
        this.boundSentinelFocusOut,
      );
      after?.addEventListener("focusin", this.boundAfterFocusIn);
      after?.addEventListener("focusout", this.boundSentinelFocusOut);
      this.boundAfter = after;
    }
    this.applyTabindex();
  }
```

Replace the element-listener removals in `detach()` (the `iframe?.removeEventListener(...)` / `beforeSentinel?.…` / `afterSentinel?.…` block) with bound-element removals:

```ts
  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.boundIframe?.removeEventListener("focus", this.boundIframeFocus);
    this.boundIframe?.removeEventListener("blur", this.boundIframeBlur);
    this.boundIframe = null;
    this.boundBefore?.removeEventListener("focusin", this.boundBeforeFocusIn);
    this.boundBefore?.removeEventListener("focusout", this.boundSentinelFocusOut);
    this.boundBefore = null;
    this.boundAfter?.removeEventListener("focusin", this.boundAfterFocusIn);
    this.boundAfter?.removeEventListener("focusout", this.boundSentinelFocusOut);
    this.boundAfter = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("blur", this.boundWindowFocusChange);
      window.removeEventListener("focus", this.boundWindowFocusChange);
    }
    if (this.insideSyncTimer !== null) {
      clearTimeout(this.insideSyncTimer);
      this.insideSyncTimer = null;
    }
    this.unsubscribeTransport?.();
    this.unsubscribeTransport = null;
  }
```

- [ ] **Step 4: Run the new test + the whole IframeSlot suite to verify pass + no regressions**

Run: `npx vitest run src/hooks/iframe-slot.test.ts`
Expected: PASS (all blocks, including the pre-existing `focusInsideIframe tracking`, `sentinel focusin exit`, `focusContent modes`, and `window blur/focus` describes — `attach()` still binds to elements present at attach time, so those are unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/iframe-slot.ts src/hooks/iframe-slot.test.ts
git commit -m "LARA-215 fix(iframe-slot): rebind listeners on deferred mount / re-mount

Replace IframeSlot's one-shot attach() element binding with syncListeners(),
which tracks the element each listener is bound to and rebinds only what
changed. Fixes the case where the iframe/sentinels mount after the slot, and a
latent detach() leak where a swapped element kept its listener.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `useIframeSlot` callback refs that drive `syncListeners()`

**Files:**
- Modify: `src/hooks/use-iframe-slot.ts`
- Test: `src/hooks/use-iframe-slot.test.ts`

The hook currently returns the passed-in `RefObject` as `beforeSentinelProps.ref`, so a deferred node's mount never notifies the slot. Return a **stable callback ref** that writes the RefObject (so the host's other reads still work) and calls `syncListeners()`.

- [ ] **Step 1: Write the failing test — deferred sentinel mount wires the exit**

Add to `src/hooks/use-iframe-slot.test.ts`, inside `describe("useIframeSlot", …)`:

```ts
  it("binds the sentinel exit when the sentinels mount after the slot (deferred)", () => {
    const iframe = document.createElement("iframe");
    const before = document.createElement("div");
    const after = document.createElement("div");
    document.body.append(before, iframe, after);
    const onExit = vi.fn();

    const { result } = renderHook(() => {
      const iframeRef = useRef<HTMLIFrameElement | null>(iframe);
      const beforeRef = useRef<HTMLElement | null>(null); // deferred
      const afterRef = useRef<HTMLElement | null>(null); // deferred
      return useIframeSlot({
        slotName: "content",
        iframeRef,
        beforeSentinelRef: beforeRef,
        afterSentinelRef: afterRef,
        cycleOrder: ["content"],
        getElements: () => ({ content: iframe }),
        onExit,
      });
    });

    // React attaches the deferred sentinel nodes — drive the returned callback refs.
    act(() => {
      (result.current.beforeSentinelProps.ref as (n: HTMLElement | null) => void)(
        before,
      );
      (result.current.afterSentinelProps.ref as (n: HTMLElement | null) => void)(
        after,
      );
    });

    act(() => iframe.dispatchEvent(new FocusEvent("focus"))); // inside = true
    act(() => after.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
    expect(onExit).toHaveBeenCalledWith(1);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/use-iframe-slot.test.ts -t "deferred"`
Expected: FAIL — `beforeSentinelProps.ref` is a `RefObject`, so calling it throws `TypeError: ref is not a function` (and `onExit` is never called).

- [ ] **Step 3: Return callback refs from the hook**

In `src/hooks/use-iframe-slot.ts`:

First, widen the result type. Change the `UseIframeSlotResult` sentinel-props ref type:

```ts
export interface UseIframeSlotResult {
  beforeSentinelProps: { ref: (node: HTMLElement | null) => void; key: string };
  afterSentinelProps: { ref: (node: HTMLElement | null) => void; key: string };
  strategyFragment: Partial<FocusTrapStrategy>;
  requestRestore: () => void;
}
```

Add `useCallback` to the React import:

```ts
import { type RefObject, useCallback, useEffect, useMemo, useRef } from "react";
```

Add stable callback refs just above the `strategyFragment` `useMemo` (after the registry effect). `beforeSentinelRef`/`afterSentinelRef` are the stable RefObjects the host passed in:

```ts
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
```

Change the returned sentinel props to use these callbacks:

```ts
  return {
    beforeSentinelProps: { ref: setBeforeSentinel, key: `${slotName}-before` },
    afterSentinelProps: { ref: setAfterSentinel, key: `${slotName}-after` },
    strategyFragment,
    requestRestore: () => slotRef.current?.requestRestore(),
  };
```

> Note: the iframe element listeners still bind through `syncListeners()` reading `getIframe()` — in the demo the iframe and sentinels mount in the same commit (siblings in `SentinelIframe`), so a sentinel callback firing also rebinds the iframe. The window-based inside-tracking reads `getIframe()` live and is independently re-mount-safe.

- [ ] **Step 4: Run the test to verify it passes + the whole hook suite**

Run: `npx vitest run src/hooks/use-iframe-slot.test.ts`
Expected: PASS (the new deferred test and all existing ones — the existing tests pass real elements, so `syncListeners()` binds them at attach).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-iframe-slot.ts src/hooks/use-iframe-slot.test.ts
git commit -m "LARA-215 fix(iframe-slot): drive listener (re)bind from sentinel callback refs

useIframeSlot now returns callback refs for the sentinels that write the host
RefObject and call IframeSlot.syncListeners(), so deferred mounts and re-mounts
rebind the focus listeners.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Update `SentinelIframe` prop types for the callback ref

**Files:**
- Modify: `demo/sections/iframe-trap/sentinel-iframe.tsx`

The result-type change in Task 2 makes `beforeSentinelProps.ref` a callback; `SentinelIframe`'s prop interface and the casts in its JSX must match, or `tsc` fails.

- [ ] **Step 1: Update the prop interface**

In `demo/sections/iframe-trap/sentinel-iframe.tsx`, change the sentinel-props types in `SentinelIframeProps`:

```ts
  beforeSentinelProps: { ref: (node: HTMLElement | null) => void; key: string };
  afterSentinelProps: { ref: (node: HTMLElement | null) => void; key: string };
```

- [ ] **Step 2: Update the JSX ref casts**

Replace the two sentinel `ref={... as RefObject<HTMLSpanElement>}` casts with the callback (no cast needed — a `(node) => void` is a valid React ref):

```tsx
      <span
        ref={beforeSentinelProps.ref}
        key={beforeSentinelProps.key}
        data-testid={`${title}-before-sentinel`}
        className="iframe-sentinel"
      >
        {hint}
      </span>
```

and likewise for the after-sentinel:

```tsx
      <span
        ref={afterSentinelProps.ref}
        key={afterSentinelProps.key}
        data-testid={`${title}-after-sentinel`}
        className="iframe-sentinel"
      >
        {hint}
      </span>
```

If `RefObject` is now unused in the file's imports, remove it from the `import type { RefObject } from "react";` line (keep the import only if `wrapperRef`/`iframeRef` casts still use it — they do, so leave `RefObject` imported).

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx biome check demo/sections/iframe-trap/sentinel-iframe.tsx`
Expected: no errors (all five scenarios consume `SentinelIframe` and pass `slot.beforeSentinelProps`, whose type now matches).

- [ ] **Step 4: Commit**

```bash
git add demo/sections/iframe-trap/sentinel-iframe.tsx
git commit -m "LARA-215 fix(demo): SentinelIframe accepts sentinel ref callbacks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Re-mount integration test (the case the user flagged)

**Files:**
- Test: `src/hooks/use-iframe-slot.test.ts`

Task 1 covers re-mount at the class level; this asserts it end-to-end through the hook's callback refs (null then a new node), which is the path a virtualized/collapsed tile actually exercises.

- [ ] **Step 1: Write the test**

Add to `src/hooks/use-iframe-slot.test.ts`, inside `describe("useIframeSlot", …)`:

```ts
  it("re-binds when a sentinel node is replaced (unmount → remount)", () => {
    const iframe = document.createElement("iframe");
    const before1 = document.createElement("div");
    const after = document.createElement("div");
    document.body.append(before1, iframe, after);
    const onExit = vi.fn();

    const { result } = renderHook(() => {
      const iframeRef = useRef<HTMLIFrameElement | null>(iframe);
      const beforeRef = useRef<HTMLElement | null>(before1);
      const afterRef = useRef<HTMLElement | null>(after);
      return useIframeSlot({
        slotName: "content",
        iframeRef,
        beforeSentinelRef: beforeRef,
        afterSentinelRef: afterRef,
        cycleOrder: ["content"],
        getElements: () => ({ content: iframe }),
        onExit,
      });
    });
    const setBefore = result.current.beforeSentinelProps.ref as (
      n: HTMLElement | null,
    ) => void;

    act(() => iframe.dispatchEvent(new FocusEvent("focus"))); // inside = true

    // The sentinel unmounts and a fresh node mounts in its place.
    const before2 = document.createElement("div");
    document.body.append(before2);
    act(() => {
      setBefore(null);
      setBefore(before2);
    });

    act(() => before2.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
    expect(onExit).toHaveBeenCalledWith(-1); // listener followed to the new node

    onExit.mockClear();
    act(() => before1.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
    expect(onExit).not.toHaveBeenCalled(); // old node is unwired
  });
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/hooks/use-iframe-slot.test.ts -t "re-binds when a sentinel node is replaced"`
Expected: PASS (Task 1 + Task 2 already implement the behavior; this is the end-to-end guard).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-iframe-slot.test.ts
git commit -m "LARA-215 test(iframe-slot): cover sentinel node replacement (re-mount)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Flip the demo scenario-2 narrative + manual verification

**Files:**
- Modify: `demo/sections/iframe-trap/deferred-children.tsx`
- Modify: `docs/superpowers/specs/2026-06-11-iframe-slot-test-page-design.md`

Scenario 2 was authored as a *repro of the bug*. With the fix it now works; its description must say so (and it now serves as a live regression guard).

- [ ] **Step 1: Rewrite the scenario-2 paragraphs**

In `demo/sections/iframe-trap/deferred-children.tsx`, replace the two `<p>` blocks (the "binds only the listeners that don't need them…" paragraph and the "partial break…" paragraph) with:

```tsx
      <p style={{ fontSize: 13 }}>
        Same input → iframe → button shape as scenario 1, but the sentinels and
        iframe are wrapped in a component that renders <code>null</code> on its
        first pass and mounts the subtree one render later (an effect-gated
        mount, like a portal whose host isn't ready yet). This used to leave the
        slot half-wired — the exit redirect never bound — because{" "}
        <code>useIframeSlot</code> bound its listeners once, when the refs were
        still <code>null</code>.
      </p>
      <p style={{ fontSize: 13 }}>
        It now behaves like scenario 1: the sentinel refs are callback refs, so
        when the deferred subtree mounts the slot re-binds its listeners. Enter,
        Tab through the iframe, and Tab/Shift+Tab out — focus cycles to the
        button / wraps and the landing hint shows, instead of getting stuck on an
        invisible sentinel. This scenario is now a regression guard for deferred
        and re-mounted slots.
      </p>
```

- [ ] **Step 2: Update the findings doc entry**

In `docs/superpowers/specs/2026-06-11-iframe-slot-test-page-design.md`, change the Scenario 2 heading and body to reflect the fix. Replace the heading line:

```markdown
### Scenario 2 — Deferred sentinel/iframe mount: FIXED (regression guard)
```

and append to that entry (after the existing "Observed behavior" bullets, leaving the historical record but marking it resolved):

```markdown
- **Resolved (2026-06-12):** `IframeSlot` now rebinds via `syncListeners()` and
  `useIframeSlot` exposes sentinel **callback refs**, so a deferred-mounted (or
  re-mounted) subtree wires up correctly. The exit redirect and landing hint now
  match scenario 1. Covered by `iframe-slot.test.ts` (`syncListeners rebinding`)
  and `use-iframe-slot.test.ts` (deferred + re-mount). See
  `docs/superpowers/plans/2026-06-12-deferred-iframe-slot-fix.md`.
```

- [ ] **Step 3: Full check + test suite**

Run: `npx biome check . && npx tsc --noEmit && npx vitest run`
Expected: clean; **688 + new tests pass** (no existing test changed).

- [ ] **Step 4: Manual browser verification**

Run: `npm run demo` (if not already serving). In Chrome open `/iframe-trap.html`, scenario 2:
1. Focus the container, press Enter, Tab → focus descends into the iframe.
2. Tab through the inner controls and out → focus lands on the **button** (cycles), not stuck on the after-sentinel.
3. Shift+Tab back in and out → reverse cycles correctly; the landing hint is visible when focus rests on a sentinel in landing mode.

Expected: scenario 2 behaves like scenario 1. (Optionally re-run the backward-walk check from the earlier session to confirm no regression to the dormant tab order.)

- [ ] **Step 5: Commit**

```bash
git add demo/sections/iframe-trap/deferred-children.tsx docs/superpowers/specs/2026-06-11-iframe-slot-test-page-design.md
git commit -m "LARA-215 docs(demo): scenario 2 now passes — deferred/re-mount handled

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Deferred mount → Task 1 (`syncListeners`) + Task 2 (callback refs) + Task 2 test.
- Re-mount (user's flagged case) → Task 1 class-level test + Task 4 hook-level test; mechanism is the same callback-ref/`syncListeners` path.
- `detach()` leak → fixed by bound-element removal in Task 1.
- No new `document` listeners / no controller changes → confirmed: only `iframe-slot.ts`, `use-iframe-slot.ts`, and demo files change.
- Existing behavior preserved → Tasks 1/2 keep all existing tests; Step-4 runs of each suite verify.
- Scaling concern → unchanged (element listeners do not fan out); recorded in `demo/trap-benchmark.NOTES.md` on `tmp/trap-listener-scaling`; controller container-scoping remains a separate follow-up.

**Type consistency:** `syncListeners()` is defined in Task 1 and called in Tasks 1/2 tests and `use-iframe-slot.ts`. `UseIframeSlotResult` sentinel ref type (`(node: HTMLElement | null) => void`) defined in Task 2 matches `SentinelIframeProps` in Task 3. `boundIframe/boundBefore/boundAfter` introduced and used only within `iframe-slot.ts`.

**Placeholder scan:** none — every step has concrete code and exact run commands.

**Out of scope (recorded, not done here):** routing slot focus through the controller's `focusin` (Option 1); container-scoping the controller's own document listeners (the `tmp/trap-listener-scaling` follow-up); a callback ref for the iframe element itself (relying on co-mount + live window tracking instead).
