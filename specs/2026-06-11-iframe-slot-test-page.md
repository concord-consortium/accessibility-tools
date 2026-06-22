# Non-cooperating iframe focus-trap test page — Design

**Status**: **Closed**
**Date**: 2026-06-11
**Design Doc**: [2026-06-09-iframe-slot-support.md](2026-06-09-iframe-slot-support.md)

## Problem

The iframe-slot support (`useIframeSlot`, `IframeSlot`, `iframe-slot-registry`)
is the hardest part of this library to test and fix. The existing demo
(`demo/`, served by `vite serve demo`) has a `FocusTrapSection` but all of its
traps use ordinary DOM elements as slots. There is no surface — manual or
automated — that exercises a focus trap containing a **non-cooperating** iframe:
one that does not run this library and exposes no `FocusTransport` channel, so
the parent cannot peek inside and must rely on sentinels plus native tab-flow
detection (window blur/focus, tabindex juggling).

## Goal

A dedicated, clean page in the existing Vite demo that puts a non-cooperating
iframe inside a real focus trap, so that:

- a human can manually Tab/Shift+Tab/Escape through it, and
- the Chrome DevTools MCP can drive it (key presses + assertions) without
  screenshots and without reading into the cross-origin frame.

## Key idea: enforced cross-origin without a second server

The inner ("third-party") page is loaded **cross-origin** so the browser
enforces the no-peeking constraint that the non-cooperating code path lives
under. We get a distinct origin from the *same* Vite dev server by swapping the
host: the parent page loads from `localhost:5173`, the iframe `src` points at
`127.0.0.1:5173`. These are different origins to the browser even though they
hit the same server. This mirrors the deployed reality, where the demo is
reachable at both `models-resources.concord.org/accessibility-tools/` and the
raw `models-resources.s3.amazonaws.com/accessibility-tools/` URL.

A helper derives the cross-origin URL by swapping `localhost`↔`127.0.0.1` in
dev, with a configured fallback pair for the deployed domains.

## Approach

Add a **dedicated standalone page** to the existing demo. No new dev server, no
new tooling. The inner page is a **dumb static HTML file** in `demo/public/`
(copied verbatim by Vite, never bundled). The parent page never reaches into the
iframe, so it observes only what the library itself can observe.

## Files

### `demo/public/iframe-inner.html` (non-cooperating inner page)
Plain HTML: a heading and ~3 focusable controls (input, button, link). No
React, no library, no `FocusTransport`, and **no script that communicates with
the parent** — keeping it dumb is what makes it non-cooperating. Served at
`/iframe-inner.html` in both dev and production builds.

### `demo/iframe-trap.html` + `demo/iframe-trap.tsx`
A new page entry that mirrors `index.html` → `main.tsx`. Wrapped in
`AccessibilityProvider`. Hosts the scenarios. Kept off the kitchen-sink page so
selectors stay clean and stable for automation.

### `demo/sections/iframe-trap/` — the four scenarios

1. **`canonical.tsx`** — slot (input) → non-cooperating iframe (content slot) →
   slot (button). The baseline: forward exit, reverse exit, descent into the
   iframe, ascent out of it, and Escape to exit. Uses `useFocusTrap` +
   `useIframeSlot` (single-iframe fallback, no registry).

2. **`lock-toggle.tsx`** — same trap plus a control that flips the iframe's
   `tabindex` between enterable and `-1` (locked) at runtime, calling
   `registry.notifyChange()` so intercept derivation re-runs. Exercises how
   sentinels/intercept react to a non-enterable iframe.

3. **`multi-iframe.tsx`** — two adjacent non-cooperating iframes sharing one
   `createIframeSlotRegistry()`, to exercise the multi-iframe intercept
   derivation where adjacent *enterable* iframes should flow natively rather
   than being intercepted.

4. **`focus-readout.tsx`** — a shared live panel subscribing to `document`
   focus events and the trap's `isTrapped`, displaying: trap entered/exited,
   current slot, whether `document.activeElement` is the iframe element
   (= focus descended into the frame), and landing-hint state. Exposes stable
   `data-testid` attributes so the MCP can assert without screenshots and
   without reading into the cross-origin frame.

Two deferred-mount regression scenarios were added later (see the findings
below): `deferred-children.tsx` defers the iframe SUBTREE (iframe-slot guard),
and `deferred-container.tsx` defers the WHOLE trap container so the controller's
`containerRef` attaches late (trap-controller guard).

### `demo/cross-origin.ts`
`crossOriginInnerSrc()` helper. In dev, swaps `localhost`↔`127.0.0.1` on
`window.location` while preserving protocol, port, and path. Falls back to a
configured production origin pair (concord.org ↔ S3). Each iframe `src` is
derived from this.

## Build / config changes

- `vite.config.ts`: add `build.rollupOptions.input` mapping both `index.html`
  and `iframe-trap.html` so `npm run demo:build` emits the new page. (Today only
  `index.html` is the implicit entry; `bookmarklet.html` is copied manually.
  `iframe-trap.html` must be a real Rollup entry because it loads a TSX module.)
- Verify the dev server answers on **both** `localhost` and `127.0.0.1` (set
  `server.host` if needed) so the cross-origin trick works locally.
- Add a link to `/iframe-trap.html` from the kitchen-sink `index.html` for
  discoverability.

## Testing model

- **Manual:** open `localhost:5173/iframe-trap.html`; Tab/Shift+Tab/Escape
  through each scenario.
- **Automated (DevTools MCP):** drive `press_key` (Tab/Shift+Tab/Escape), read
  the readout panel's `data-testid`s and `document.activeElement`, assert the
  trap behaves. No screenshots, no peeking into the cross-origin frame.

## Out of scope (YAGNI)

- Cooperating-path (transport / postMessage) scenarios. Adding any parent↔iframe
  communication would defeat the non-cooperating purpose; the inner page stays
  dumb.

## Manual verification findings (2026-06-11)

First DevTools-MCP-driven pass through the page (Chrome), using the `localhost`
parent / `127.0.0.1` cross-origin inner page. The cross-origin load and the
`data-testid` readout both worked.

### Scenario 1 — Canonical (input → iframe → button): WORKS
- Enter on the container activates the trap; focus lands on the input.
- Tab forward: input → descend into the cross-origin iframe → (native tab through
  the inner controls) → exit to the "After iframe" button → wrap to input.
- Shift+Tab reverse mirrors this correctly, including reverse descent and exit.
- Escape releases the trap and returns focus to the container.
- Observation: clicking *directly into* the cross-origin iframe does NOT activate
  the trap (`trapped` stays false). Expected — the parent cannot observe focus
  entering a cross-origin frame via a click. Enter-to-enter and clicking the
  native controls both activate it fine.

### Scenario 2 — Deferred sentinel/iframe mount: FIXED (regression guard)
Same `input → iframe → button` shape as Scenario 1, but the sentinels and iframe
are wrapped in a component that renders `null` on its first pass and mounts the
subtree one render later (effect-gated mount / not-yet-ready portal host). Added
after a client surfaced the case; placed right after Scenario 1 so the broken
iframe slot sits between two known-good slots.
- Mechanism (verified in Chrome): `useIframeSlot` calls `IframeSlot.attach()` in
  a mount-only effect that reads the iframe and sentinels eagerly. With the
  subtree deferred, those refs are `null` at attach time, so the *element*
  listeners (iframe `focus`/`blur`, sentinel `focusin`/`focusout`) never bind and
  there is no re-attach. But the **window-level inside-tracking listeners DO bind**
  — they don't reference the refs — and `applyTabindex`/`focusContent` read the
  refs live. So the slot is only *partially* inert, not dead.
- Observed behavior — the break is easy to miss because the entry path looks
  correct:
  - Forward Tab from the input **does descend** into the iframe: the iframe is
    `tabindex=0` while trapped (host fix), the positioner's attempt to focus the
    before-sentinel silently no-ops, and native Tab walks straight into the frame.
  - While focus is inside, the window-listener inside-tracking flips **both
    sentinels to `tabindex=0`** (confirmed mid-frame).
  - The failure surfaces on **exit**: tabbing out of the iframe lands on the
    after-sentinel (now a real tab stop) but does **not** redirect to the next
    slot and does **not** show the landing hint — the sentinel `focusin`/`focusout`
    handlers never bound. Focus rests on the invisible sentinel instead of
    cycling to the button / wrapping.
- Fix is the open follow-up: re-attach (or bind the element listeners) once the
  iframe/sentinel refs become non-null.
- **Resolved (2026-06-12):** `IframeSlot` now rebinds via `syncListeners()` and
  `useIframeSlot` exposes sentinel **callback refs**, so a deferred-mounted (or
  re-mounted) subtree wires up correctly. The exit redirect and landing hint now
  match scenario 1 (manually verified in Chrome: focus exits the iframe and
  cycles to the button instead of sticking on the sentinel). Covered by
  `iframe-slot.test.ts` (`syncListeners rebinding`) and `use-iframe-slot.test.ts`
  (deferred + re-mount).

### Scenario 6 — Deferred trap CONTAINER (controller attaches late): PENDING manual verification
The trap-**controller** analogue of Scenario 2. Scenario 2 is the iframe-**slot**
deferred case — it defers only the iframe subtree (sentinels + iframe) INSIDE an
immediately-mounted container. This scenario instead defers the **whole trap
container `<div>`** — the element that carries the controller's `containerRef`
ref-callback — by wrapping it in the same effect-gated `DeferredChildren` gate, so
the container (and everything in it) commits one render late. Appended to the page
as scenario 6 to avoid renumbering the existing scenarios; conceptually it sits
beside Scenario 2 (both deferred cases), hence its placement here in the doc.
- Mechanism it guards: with the pre-fix code the `FocusTrapController` was
  constructed *with* its container in a mount-only effect, so a container that
  committed after the hook's first render (React portals / effect-gated children /
  Suspense) meant the controller was never built and the trap never engaged. The
  container-less `FocusTrapController` + stable `containerRef` ref-callback
  fixes this: the controller is constructed eagerly and attaches whenever the
  container commits — even late — so Enter/Tab engage the trap exactly like the
  canonical scenario 1. Inside the deferred container the iframe subtree is NOT
  separately deferred (unlike scenario 2) — the whole thing mounts together, one
  render late.
- Expected behavior (mirror of scenario 1): once the deferred container commits,
  Enter activates the trap and lands on the input; Tab forward descends into the
  iframe and exits to the button / wraps; Shift+Tab reverses; Escape releases.
- Coverage: the unit-level regression for the deferred/portal-mounted controller
  already exists in `src/hooks/use-focus-trap.test.tsx` (deferred-mount +
  `createPortal` engagement, plus `isTrapped` reactivity). This demo scenario is
  the manual/DevTools-MCP regression guard.
- **Status: PENDING.** Manual browser / DevTools-MCP verification in Chrome has
  NOT yet been performed for this scenario (cross-origin browser driving is not
  available in the implementation session). To be confirmed against the live page
  the same way scenarios 1–2 were.

### Scenario 3 — Enterable / locked toggle: WORKS
- Enterable (tabindex 0): Tab from the input descends into the iframe.
- Locked (tabindex -1): Tab forward skips the iframe straight to the button, and
  Shift+Tab reverse skips it back to the input.
- Integration note surfaced: the host must call `registry.notifyChange()` AFTER
  React commits the new `tabindex` to the DOM (i.e. in a `useEffect` keyed on the
  lock state), NOT synchronously in the click handler — the registry reads
  `tabindex` live, so a synchronous call reads the stale value and the intercept
  ends up one toggle behind. The demo does it in an effect.

### Scenario 4 — Single iframe only (no other slots): WORKS
A trap whose only slot is the non-cooperating iframe (single-iframe fallback, no
registry). Added after the first pass.
- Enter on the container activates the trap and lands on the before-sentinel in
  landing mode (showing the hint); the next Tab descends into the iframe.
- Tab through the inner controls and past the edge wraps back to the
  before-sentinel (landing mode) rather than escaping; the next Tab re-descends.
  Focus stays contained — the well-behaved counterpart to the Scenario 5
  forward-exit escape below.
- Escape from a parent-side sentinel exits. (Escape from *inside* the
  cross-origin frame can't reach the parent — a known cross-origin constraint,
  not specific to this scenario.)

### Scenario 5 — Two adjacent iframes (shared registry): PARTIAL — bugs found
This scenario surfaced real library issues (the point of the page):
1. **`FocusTrapStrategy.contentSlot` is singular.** A trap with two iframe slots
   can designate only one of them as the content slot, so only that one gets a
   programmatic `focusContent` dispatch. With no `contentSlot` set at all,
   entering the trap leaves focus stuck on the container (the non-focusable
   wrapper `<div>` is focused and `focusContent` never runs). The demo works
   around this by setting `contentSlot: "frameA"`.
2. With `contentSlot: "frameA"`: programmatic entry works (lands on frameA's
   before-sentinel in landing mode, then descends), and **native Tab flow from
   frameA into frameB works** (`document.activeElement` reaches the frameB
   iframe).
3. **BUG: forward-exit from frameB (the last slot) does not wrap back to frameA.**
   Focus escapes the trap entirely and walks out into the rest of the page
   (observed landing on `body`, then the canonical scenario's iframe). Focus
   containment fails for the last iframe slot in the multi-iframe case.
4. **Readout observability limit (not a library bug):** moving directly between
   two cross-origin iframes fires no parent-observable focus event (window stays
   blurred, no parent `focusin`), so the readout's "descended into" label cannot
   track inter-iframe moves. `document.activeElement` is the ground truth and was
   used for those assertions.

Caveat: cross-origin iframe focus traversal driven by automated key events is
timing-sensitive; the Scenario 5 escape (finding 3) is worth a manual repro
before any library fix.

### Library bug found and fixed this session
Entering a trap via the **Enter key** activated the trap but focused the first
content slot with the default `sequentialNavigation` (silent positioner)
trigger, unlike the `enterTrap()` method which uses `programmatic` (landing)
mode. For a non-cooperating iframe content slot this meant **no `data-landing` /
landing hint on Enter entry** — focus parked silently on a zero-size sentinel.
Root cause: the Enter-key handler reimplemented trap entry inline and had drifted
from `enterTrap()`. Fixed by aligning the trigger (`fa8fbc3`) and then collapsing
both routes onto a single shared `enterTrap` path so they can't drift again
(`cf89bb9`). The two genuine **Scenario 5** issues above remain open.
