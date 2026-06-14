# Deferred / portal-mounted FocusTrapController — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `useFocusTrap` (and the `FocusTrapController` it wraps) engage correctly when the trap's container DOM element mounts *after* the hook's first commit — the case that occurs whenever the container lives inside a React portal whose host defers committing children (react-modal, react-aria-modal, custom portals, lazy/async children, Suspense).

**Architecture:** Give `FocusTrapController` a **two-phase lifecycle** mirroring the `IframeSlot` fix ([`2026-06-12-deferred-iframe-slot-fix.md`](2026-06-12-deferred-iframe-slot-fix.md)). The constructor takes only `(strategy, options)` — no container. The controller owns **one public container seam: a stable `containerRef` ref-callback** (`(el: HTMLElement | null) => void`). Non-null attaches (wires document listeners); null tears down **silently** (no `onExit`/announce). React (hook or class consumer) wires it via `ref={controller.containerRef}`; the callback fires precisely when the node attaches/detaches/remounts, regardless of portal hops. `useFocusTrap` constructs the controller eagerly and **returns the controller instance directly** (not wrapper functions), forcing a re-render on `trapped` change so `controller.isTrapped` stays reactive.

**Decisions locked in (this supersedes the original draft):**
- **No backward compatibility.** Library is pre-release; clients (CLUE, activity-player, demos) adjust. No constructor overload, no deprecated config paths.
- **Single container seam.** The controller exposes only `containerRef` (a bound ref-callback). `attachContainer`/`detachContainer` are **private internals** it drives — not public API. `containerRef(el)` doubles as the imperative seam if a non-React consumer ever needs it.
- **Hook returns the raw `FocusTrapController`.** No `FocusTrapResult` wrapper object; new controller methods are available to consumers with zero hook edits. Trade-off accepted: this also exposes the hook-managed `setEnabled`/`setStrategy`/`destroy` — documented as "do not call from the hook result; the hook owns them."
- **Silent teardown on unmount.** `containerRef(null)` removes listeners + restores tabindex and flips `trapped`→false (so `isTrapped` is accurate), but does **not** call `strategy.onExit` or announce. `onExit`/announce fire only on an explicit `exitTrap()`.

**Tech Stack:** TypeScript, React 18, Vitest + @testing-library/react (jsdom), Biome, Vite demo, chrome-devtools MCP for manual browser verification.

---

## Background — why the current code is broken in portals

`useFocusTrap` creates the controller in a mount `useEffect`:

```ts
// src/hooks/use-focus-trap.ts:44-60
useEffect(() => {
  const container = containerRef?.current;
  const initialStrategy = strategyRef.current;
  if (!container || !initialStrategy) return;        // ← bails when container is null
  const controller = new FocusTrapController(container, initialStrategy, {...});
  controllerRef.current = controller;
  return () => { controller.destroy(); controllerRef.current = null; };
}, [containerRef, instanceId]);                       // ← stable deps; runs ONCE on mount
```

The constructor requires a container and immediately wires document listeners. So the hook can't build the controller until `containerRef.current` is non-null. In a react-modal-style portal the container commits *after* this mount effect has already run and bailed; deps `[containerRef, instanceId]` are stable, so the effect never re-runs and the controller is never created. Tab walks out of the dialog. Empirically verified in activity-player (`controllerRef.current === null` for the dialog's lifetime).

This regressed at `c1c6d17` (controller unification): the pre-refactor hook had `strategy` in its effect deps, so it re-ran when the strategy identity changed (which happens once the portal commits and the parent re-renders) and the trap engaged eventually. The fix below makes engagement deterministic via a callback ref instead of relying on a strategy-identity change.

---

## Who consumes these APIs (verified)

- **CLUE** constructs the **class directly** in a class component: `new FocusTrapController(this.domElement, this.buildFocusTrapStrategy())` (`collaborative-learning/src/components/tiles/tile-component.tsx:254`), then `setEnabled`/`setStrategy`/`enterTrap`/`destroy`. Its root `<div>` already uses a ref callback (`ref={elt => this.domElement = elt}`, `:375`). It does **not** pass a `focusTrap` config to `useAccessibility` (`use-clue-accessibility.ts:177` passes only navigation/announcements/resize) and does **not** use `useFocusTrap`. → CLUE adapts by constructing container-less and composing `controller.containerRef` into its existing root-div ref (Task 6).
- **activity-player** uses `useFocusTrap({ containerRef, strategy })` and calls `trapRef.current?.enterTrap()` (`dialog-overlay.tsx:101,116`). → migrates to the returned controller's `containerRef` (separate AP session).
- **Demos** use `useFocusTrap` and read `trap?.isTrapped` in render + effect deps; call methods via `trap.x()` / `trapRef.current?.x()`. → migrated in Task 4.

---

## File Structure

- `src/hooks/focus-trap-controller.ts` — container-less constructor `(strategy, options)`; private `attach()`/`detach()`; public bound `containerRef` ref-callback; bind `enterTrap`/`exitTrap`/`cycleToAdjacentSlot`; guard container reads on `attached`; `options.onContainerChange`; idempotent `destroy()` that works pre-attach. (MODIFY)
- `src/hooks/focus-trap-controller.test.ts` — pre-attach safety; attach-after-construction; silent teardown on `containerRef(null)`; container swap; bound-method/destructure safety. (MODIFY)
- `src/hooks/types.ts` — remove `containerRef` from `FocusTrapConfig`; add `onContainerChange?` to `FocusTrapControllerOptions`; **remove `FocusTrapResult`** (hook returns `FocusTrapController`). (MODIFY)
- `src/hooks/use-focus-trap.ts` — eager `useState` controller; force-render on `trapped`; sync `enabled`/`strategy`; debug `containerElement` via `onContainerChange`; destroy on unmount; **return the controller**. (MODIFY)
- `src/hooks/use-focus-trap.test.ts` — migrate config-`containerRef` tests to the returned `containerRef`; add deferred-mount (`DeferredChildren`) and `createPortal` regression tests; assert `isTrapped` reactivity. (MODIFY)
- `src/hooks/use-accessibility.ts` + test — `focusTrap` config/result plumbing follows the new shapes. (MODIFY)
- `src/hooks/index.ts` — drop the `FocusTrapResult` export. (MODIFY)
- `demo/sections/**` — every `useFocusTrap` site flips to the returned `containerRef`; replace `FocusTrapResult` type refs with `FocusTrapController`. (MODIFY, multiple)
- `demo/sections/iframe-trap/*` + `docs/superpowers/specs/2026-06-11-iframe-slot-test-page-design.md` — add a deferred-trap-container regression scenario. (MODIFY)
- `docs/iframe-slot-design.md` — update §5/§6 if they reference the old `containerRef` config or nullable result. (MODIFY if needed)

**Follow-up noted, not in scope:** `use-keyboard-nav.ts` has the identical mount-effect + `containerRef.current` + debug-`containerElement` pattern (`:165-174`) and almost certainly has the same deferred-mount bug. Track as a separate ticket.

---

## Task 1 — `FocusTrapController`: container-less lifecycle + `containerRef` seam

**Files:** Modify `src/hooks/focus-trap-controller.ts`; Test `src/hooks/focus-trap-controller.test.ts`.

Engine state (strategy, slotIndex, trapped, savedTabIndices, options, bound handlers) is set up in the constructor. DOM-attached side effects (document listeners, container reads, focus moves, tabindex sweeps) only run while `attached`. `containerRef` is the seam that flips `attached`.

### Step 1.1 — Failing test: pre-attach methods are safe no-ops

```ts
describe("FocusTrapController pre-attach safety", () => {
  it("constructs without a container; all public methods are safe before attach", () => {
    const strategy: FocusTrapStrategy = { getElements: () => ({}), cycleOrder: ["content"] };
    const ctrl = new FocusTrapController(strategy);
    expect(ctrl.isTrapped).toBe(false);
    expect(() => ctrl.enterTrap()).not.toThrow();
    expect(ctrl.isTrapped).toBe(false);              // no-op, no state change
    expect(() => ctrl.exitTrap()).not.toThrow();
    expect(() => ctrl.cycleToAdjacentSlot(1)).not.toThrow();
    expect(() => ctrl.setEnabled(true)).not.toThrow();
    expect(() => ctrl.setStrategy(strategy)).not.toThrow();
    expect(() => ctrl.destroy()).not.toThrow();      // destroy works pre-attach
  });
});
```

Run `npx vitest run focus-trap-controller -t "pre-attach"` → FAILS (constructor currently requires a container).

### Step 1.2 — Constructor, attach/detach, containerRef

Read the current `focus-trap-controller.ts` first. Then:

```ts
export interface FocusTrapControllerOptions {
  onTrappedChange?: (trapped: boolean) => void;
  onEvent?: (event: FocusTrapEvent) => void;
  /** Called whenever the container attaches (el) or detaches (null), so a
   *  wrapper can mirror the element (e.g. into the debug inspector). */
  onContainerChange?: (el: HTMLElement | null) => void;
}

export class FocusTrapController {
  private container: HTMLElement | null = null;
  private attached = false;
  private destroyed = false;
  private strategy: FocusTrapStrategy;
  private options: FocusTrapControllerOptions;
  private enabled = false;
  private trapped = false;
  private slotIndex = 0;
  private savedTabIndices = new Map<HTMLElement, string | null>();
  private tabInProgress = false;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleTabDirection: (e: KeyboardEvent) => void;
  private boundHandleFocusIn: (e: FocusEvent) => void;

  constructor(strategy: FocusTrapStrategy, options: FocusTrapControllerOptions = {}) {
    this.strategy = strategy;
    this.options = options;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleTabDirection = this.handleTabDirection.bind(this);
    this.boundHandleFocusIn = this.handleFocusIn.bind(this);
    // Bind the consumer-facing methods so the hook can return the raw controller
    // and consumers can safely destructure them.
    this.enterTrap = this.enterTrap.bind(this);
    this.exitTrap = this.exitTrap.bind(this);
    this.cycleToAdjacentSlot = this.cycleToAdjacentSlot.bind(this);
    // NOTE: no document.addEventListener here — that moves to attach().
  }

  /**
   * The single container seam. Spread onto the container element
   * (`ref={controller.containerRef}`) from a hook or class component, or call
   * imperatively. Stable identity (bound arrow field), so React never
   * detaches/reattaches it across renders. Non-null attaches; null tears down
   * silently (see detach()).
   */
  containerRef = (el: HTMLElement | null): void => {
    if (this.destroyed) return;
    if (el === this.container) return;
    if (this.attached) this.detach();
    this.container = el;
    if (el) this.attach();
    this.options.onContainerChange?.(el);
  };

  private attach(): void {
    this.attached = true;
    document.addEventListener("keydown", this.boundHandleTabDirection, true);
    document.addEventListener("keydown", this.boundHandleKeyDown, true);
    document.addEventListener("focusin", this.boundHandleFocusIn, true);
    // Match constructor-era startup: if enabled-but-not-trapped, make children
    // non-tabbable now that we have a container.
    if (this.enabled && !this.trapped) this.setChildrenNonTabbable();
  }

  /** Silent teardown: no onExit / no announce (that's exitTrap's job). */
  private detach(): void {
    if (!this.attached) return;
    this.attached = false;
    document.removeEventListener("keydown", this.boundHandleTabDirection, true);
    document.removeEventListener("keydown", this.boundHandleKeyDown, true);
    document.removeEventListener("focusin", this.boundHandleFocusIn, true);
    this.restoreChildrenTabbable();
    if (this.trapped) this.setTrapped(false);   // fires onTrappedChange; NO onExit/announce
    this.container = null;
  }
```

Then guard the public methods:

```ts
enterTrap(): void {
  if (this.destroyed || !this.attached || !this.enabled) return;
  // ...unchanged
}
exitTrap(options?: { refocus?: boolean }): void {
  if (this.destroyed || !this.attached) return;
  // ...unchanged (still fires onExit/announce — this is the EXPLICIT exit)
}
cycleToAdjacentSlot(direction: 1 | -1): void {
  if (this.destroyed || !this.attached) return;
  // ...unchanged
}
setEnabled(enabled: boolean): void {
  if (this.destroyed) return;
  this.enabled = enabled;
  if (!this.attached) return;                 // record flag, defer DOM effects to attach()
  // ...existing body unchanged
}
// setStrategy() doesn't touch the container — leave as-is (works pre-attach).

destroy(): void {
  if (this.destroyed) return;
  this.destroyed = true;
  this.detach();                              // safe if !attached
}
```

### Step 1.3 — Guard private container reads

- `setChildrenNonTabbable()` — early-return if `!this.container`.
- `isInsideTrap(el)` — return false if `!this.container` before `this.container.contains(...)`.
- `restoreChildrenTabbable()` — iterates `savedTabIndices`; safe pre-attach. Leave.
- `handleKeyDown`/`handleTabDirection`/`handleFocusIn` — only fire via the document listeners installed by `attach()`, so `attached === true` whenever they run; for TS, use a non-null assertion or guard where they read `this.container`.

Run `npx tsc --noEmit`; resolve any `'this.container' is possibly 'null'` with a guard (call sites that may race) or a non-null assertion (call sites only reachable while attached).

### Step 1.4 — Run the pre-attach test → passes; existing controller tests still pass

Existing tests construct with `new FocusTrapController(container, strategy)` — they must migrate to `new FocusTrapController(strategy, options?)` + `ctrl.containerRef(container)`. Do this mechanically across the test file (it's the same two-line change per setup). Run `npx vitest run focus-trap-controller` → green.

### Step 1.5 — Failing test: attach-after-construction engages

```ts
describe("FocusTrapController containerRef lifecycle", () => {
  it("engages when the container arrives after construction", () => {
    const container = document.createElement("div"); container.tabIndex = -1;
    const slot = document.createElement("button"); container.appendChild(slot);
    const ctrl = new FocusTrapController({ getElements: () => ({ content: slot }), cycleOrder: ["content"] });
    ctrl.setEnabled(true);
    ctrl.enterTrap();                                   // pre-attach: no-op
    expect(ctrl.isTrapped).toBe(false);
    document.body.appendChild(container);
    ctrl.containerRef(container);                       // container mounts
    ctrl.enterTrap();
    expect(ctrl.isTrapped).toBe(true);
    expect(document.activeElement).toBe(slot);
  });

  it("containerRef(null) tears down silently — no onExit", () => {
    const container = document.createElement("div"); container.tabIndex = -1;
    const slot = document.createElement("button"); container.appendChild(slot);
    document.body.appendChild(container);
    const onExit = vi.fn();
    const ctrl = new FocusTrapController({ getElements: () => ({ content: slot }), cycleOrder: ["content"], onExit });
    ctrl.setEnabled(true);
    ctrl.containerRef(container);
    ctrl.enterTrap();
    expect(ctrl.isTrapped).toBe(true);
    ctrl.containerRef(null);                            // unmount
    expect(ctrl.isTrapped).toBe(false);                // state accurate
    expect(onExit).not.toHaveBeenCalled();             // but NO onExit on unmount
  });

  it("swaps cleanly from one container to another", () => {
    const a = document.createElement("div"); a.tabIndex = -1;
    const b = document.createElement("div"); b.tabIndex = -1;
    const slotA = document.createElement("button"); a.appendChild(slotA);
    const slotB = document.createElement("button"); b.appendChild(slotB);
    document.body.append(a, b);
    const ctrl = new FocusTrapController({ getElements: () => ({ content: slotA }), cycleOrder: ["content"] });
    ctrl.setEnabled(true);
    ctrl.containerRef(a); ctrl.enterTrap();
    expect(document.activeElement).toBe(slotA);
    ctrl.containerRef(b);                               // detach A, attach B
    ctrl.setStrategy({ getElements: () => ({ content: slotB }), cycleOrder: ["content"] });
    ctrl.enterTrap();
    expect(document.activeElement).toBe(slotB);
  });

  it("methods survive destructuring (bound)", () => {
    const container = document.createElement("div"); container.tabIndex = -1;
    const slot = document.createElement("button"); container.appendChild(slot);
    document.body.appendChild(container);
    const ctrl = new FocusTrapController({ getElements: () => ({ content: slot }), cycleOrder: ["content"] });
    ctrl.setEnabled(true);
    ctrl.containerRef(container);
    const { enterTrap } = ctrl;                         // destructured
    expect(() => enterTrap()).not.toThrow();
    expect(ctrl.isTrapped).toBe(true);
  });
});
```

Run → all pass.

### Step 1.6 — Update the class docblock

Rewrite the header doc (`focus-trap-controller.ts:1-22`) for the two-phase lifecycle: construct with `(strategy, options)`, attach via `containerRef`, `destroy()` on teardown. Add the **doc note**: when obtained from `useFocusTrap`, `setEnabled`/`setStrategy`/`destroy` are owned by the hook and must not be called by the consumer; the consumer-facing surface is `containerRef`, `isTrapped`, `enterTrap`, `exitTrap`, `cycleToAdjacentSlot`. Keep a class-component usage example (construct in constructor/field → wire `containerRef` on the root element → `destroy()` in `componentWillUnmount`).

---

## Task 2 — `useFocusTrap`: eager construction, return the controller

**Files:** Modify `src/hooks/use-focus-trap.ts`, `src/hooks/types.ts`, `src/hooks/index.ts`; Test `src/hooks/use-focus-trap.test.ts`.

### Step 2.1 — Types

```ts
// types.ts
export interface FocusTrapConfig {
  strategy: FocusTrapStrategy;   // containerRef REMOVED
  enabled?: boolean;
}
// FocusTrapResult: REMOVED — useFocusTrap returns FocusTrapController.
// Add onContainerChange to FocusTrapControllerOptions (defined in controller; if the
// options interface lives in types.ts, add it here).
```

Remove the `FocusTrapResult` export from `index.ts`. `FocusTrapController` is already exported.

### Step 2.2 — Rewrite the hook

```ts
export function useFocusTrap(config: FocusTrapConfig | undefined): FocusTrapController {
  const instanceId = useStableId();
  const debugCtx = useAccessibilityContext();
  const strategy = config?.strategy;
  const enabled = config?.enabled ?? true;

  const debugCtxRef = useRef(debugCtx);
  debugCtxRef.current = debugCtx;

  // Force a re-render when `trapped` flips so a render-time read of
  // controller.isTrapped is always current (the controller instance is stable,
  // so without this the value would go stale).
  const [, setTrappedTick] = useState(false);

  const [controller] = useState(
    () =>
      new FocusTrapController(strategy ?? { getElements: () => ({}) }, {
        onTrappedChange: (t) => setTrappedTick(t),
        onEvent: (event) => debugCtxRef.current?.reportFocusTrapEvent(instanceId, event),
        onContainerChange: (el) =>
          debugCtxRef.current?.registerInstance(instanceId, {
            hookType: "focusTrap",
            containerElement: el,            // re-register overwrites by id → keeps the inspector live
          }),
      }),
  );

  useEffect(() => { if (strategy) controller.setStrategy(strategy); }, [strategy, controller]);
  useEffect(() => { controller.setEnabled(enabled); }, [enabled, controller]);

  // Initial debug registration (containerElement filled in by onContainerChange).
  useEffect(() => {
    if (!config || !debugCtx) return;
    debugCtx.registerInstance(instanceId, { hookType: "focusTrap", containerElement: null });
    return () => debugCtx.unregisterInstance(instanceId);
  }, [config, debugCtx, instanceId]);

  useEffect(() => () => controller.destroy(), [controller]);

  return controller;
}
```

Notes:
- **StrictMode:** `useState` lazy-init may run twice; the discarded controller has **no** listeners (container-less), so it's harmless and GC'd. The kept controller is `destroy()`-ed on unmount. `destroy()` is idempotent.
- **Reactivity:** `setTrappedTick` exists only to re-render; consumers read `controller.isTrapped`. Confirmed sufficient for the demos' render reads and `use-enter-to-trap`'s `[isTrapped]` effect dep.
- **Non-null:** the hook always returns a controller. Consumers' `trap?.` becomes unnecessary (harmless to leave).

### Step 2.3 — Migrate existing hook tests

Replace `useFocusTrap({ containerRef: ref, strategy })` + `<div ref={ref}>` with `const trap = useFocusTrap({ strategy })` + `<div ref={trap.containerRef}>` and read `trap.isTrapped` / call `trap.enterTrap()`. Where a test needs its own ref too, compose: `const combined = (el) => { myRef.current = el; trap.containerRef(el); }`.

### Step 2.4 — Regression tests: deferred + portal mount + reactivity

```ts
import { createPortal } from "react-dom";

function DeferredChildren({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted ? <>{children}</> : null;
}

it("engages when the container mounts after the hook's first commit (deferred)", async () => {
  function Host() {
    const trap = useFocusTrap({ strategy: { getElements: () => ({ content: document.getElementById("slot") }), cycleOrder: ["content"] } });
    const onContainer = (el: HTMLDivElement | null) => { trap.containerRef(el); if (el) trap.enterTrap(); };
    return <DeferredChildren><div ref={onContainer} tabIndex={-1}><button id="slot">slot</button></div></DeferredChildren>;
  }
  render(<Host />);
  await Promise.resolve();
  expect(document.activeElement).toBe(document.getElementById("slot"));
});

it("engages through ReactDOM.createPortal", async () => {
  function PortalChildren({ children }: { children: React.ReactNode }) {
    const host = useMemo(() => document.createElement("div"), []);
    useEffect(() => { document.body.appendChild(host); return () => { document.body.removeChild(host); }; }, [host]);
    return createPortal(children, host);
  }
  function Host() {
    const trap = useFocusTrap({ strategy: { getElements: () => ({ content: document.getElementById("pslot") }), cycleOrder: ["content"] } });
    const onContainer = (el: HTMLDivElement | null) => { trap.containerRef(el); if (el) trap.enterTrap(); };
    return <PortalChildren><div ref={onContainer} tabIndex={-1}><button id="pslot">slot</button></div></PortalChildren>;
  }
  render(<Host />);
  await Promise.resolve();
  expect(document.activeElement).toBe(document.getElementById("pslot"));
});

it("re-renders the consumer when isTrapped changes", async () => {
  const seen: boolean[] = [];
  function Host() {
    const trap = useFocusTrap({ strategy: { getElements: () => ({ content: document.getElementById("rslot") }), cycleOrder: ["content"] } });
    seen.push(trap.isTrapped);
    return <div ref={(el) => { trap.containerRef(el); if (el) trap.enterTrap(); }} tabIndex={-1}><button id="rslot">slot</button></div>;
  }
  render(<Host />);
  await Promise.resolve();
  expect(seen).toContain(true);   // a render observed isTrapped === true
});
```

Run → all pass.

### Step 2.5 — Update hook JSDoc

Rewrite `use-focus-trap.ts:1-15`: returns the controller; wire `controller.containerRef` onto the container; portal-safe; the re-render-on-trapped mechanism; and the doc note that `setEnabled`/`setStrategy`/`destroy` are hook-owned.

---

## Task 3 — `useAccessibility` plumbing

**Files:** Modify `src/hooks/use-accessibility.ts` + its test.

`useAccessibility` calls `useFocusTrap(options.focusTrap)` and returns the result under a `focusTrap` key. Update its option/result types to the new shapes: `focusTrap` config no longer has `containerRef`; the returned `focusTrap` is a `FocusTrapController` (non-null when configured). Verify callers that pass `focusTrap` (none in CLUE; check demos) and that `useAccessibility`'s own tests still pass. Keep the change minimal — this is type plumbing, not behavior.

---

## Task 4 — Migrate demo `useFocusTrap` sites

**Files:** Modify each `demo/sections/**` file using `useFocusTrap` (enumerate with `grep -rn "useFocusTrap\|FocusTrapResult" demo/sections`).

Known sites: `demo/sections/focus-trap.tsx` (3 traps), `demo/sections/strategy-swap.tsx`, `demo/sections/iframe-trap/use-enter-to-trap.ts` (+ the iframe-trap scenarios that type a ref as `FocusTrapResult`). For each:
1. Drop the host `useRef` passed as `config.containerRef`.
2. `useFocusTrap({ strategy, ... })` → destructure/keep the returned controller; spread `ref={trap.containerRef}` on the container (compose if the host needs its own ref).
3. Replace `FocusTrapResult` type annotations (e.g. `trapRef: FocusTrapResult | null`) with `FocusTrapController`. Import it from the hooks entry.
4. `trap?.` may be simplified to `trap.` (optional). `use-enter-to-trap.ts` returns the controller; its `trapRef.current?.enterTrap()` etc. keep working.

Run `npm run demo` and click each section — same behavior as before.

---

## Task 5 — Deferred-trap-container demo scenario + findings doc

**Files:** Modify `demo/sections/iframe-trap/` (add a scenario or extend the deferred one) and `docs/superpowers/specs/2026-06-11-iframe-slot-test-page-design.md`.

Add a scenario that wraps the **whole trap container** in `DeferredChildren` (or a custom portal whose host defers children) and verifies the trap engages once the container commits — the trap-controller analogue of the existing deferred-iframe-slot guard. Record it in the findings doc so both deferred cases sit side-by-side.

---

## Task 6 — CLUE migration (separate branch; documented here)

**Out of scope for the library branch.** The CLUE session does:

- Construct container-less, in the constructor/field (not `componentDidMount`), so the controller exists when `render()` wires the ref:
  ```ts
  this.focusTrapController = this.props.readOnly
    ? null
    : new FocusTrapController(this.buildFocusTrapStrategy(), { /* onEvent, etc. */ });
  ```
  (`buildFocusTrapStrategy()` uses lazy element-getters — `tile-component.tsx:529` — so it's safe before `domElement` exists. If `getFocusTrapElements()` isn't ready at construction, build with what's available and rely on the existing `setStrategy`-on-select.)
- Compose the controller's `containerRef` into the existing root-div ref callback (`:375`):
  ```tsx
  ref={elt => { this.domElement = elt; this.focusTrapController?.containerRef(elt); }}
  ```
- Keep `setEnabled` (selection), `setStrategy` (re-select), `enterTrap` (Enter path), and `destroy()` in `componentWillUnmount` exactly as today. The ref fires during the mount commit (before `componentDidMount`), so the controller is attached before `setEnabled` runs.
- Read-only tiles: construct no controller and don't wire the ref (current `!readOnly` guard).

CLUE drops its `new FocusTrapController(this.domElement, …)` call and the `componentDidMount` container dependency. No back-compat shim is provided by the library.

---

## After implementation

1. `npx vitest run` — all green.
2. `npx tsc --noEmit` — clean.
3. `npm run demo` — every section works; the deferred-trap-container scenario engages.
4. Bump to the next pre-release (`0.2.0-pre.X`); release notes call out the breaking changes: `useFocusTrap` returns `FocusTrapController` (no `FocusTrapResult`), `FocusTrapConfig` drops `containerRef`, and `FocusTrapController(strategy, options)` is container-less with a `containerRef` seam.
5. `npx yalc publish && npx yalc push` so dependents (activity-player) pick it up; run AP's dialog-overlay verification and apply the AP migration.

---

## Resolved questions (was "open")

- **Keep `FocusTrapController` a public export?** Yes — CLUE constructs it directly. Constructor is now `(strategy, options)`; CLUE adapts (Task 6).
- **Does anyone rely on `useFocusTrap` returning null?** No — CLUE doesn't use the hook; demos are `?.`-safe and migrate. Non-null return is fine.
- **Separate deferred-trap demo scenario?** Yes — cheap regression guard distinct from the iframe-slot one (Task 5).
- **Back-compat / overload?** No — pre-release; clients adjust (decision locked above).
- **Exposing hook-managed methods via the raw controller?** Accepted; documented "do not call `setEnabled`/`setStrategy`/`destroy` from the hook result" (Task 1.6 / 2.5).
