# Non-cooperating iframe focus-trap test page — Design

Date: 2026-06-11

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

### Scenario 2 — Enterable / locked toggle: WORKS
- Enterable (tabindex 0): Tab from the input descends into the iframe.
- Locked (tabindex -1): Tab forward skips the iframe straight to the button, and
  Shift+Tab reverse skips it back to the input.
- Integration note surfaced: the host must call `registry.notifyChange()` AFTER
  React commits the new `tabindex` to the DOM (i.e. in a `useEffect` keyed on the
  lock state), NOT synchronously in the click handler — the registry reads
  `tabindex` live, so a synchronous call reads the stale value and the intercept
  ends up one toggle behind. The demo does it in an effect.

### Scenario 3 — Two adjacent iframes (shared registry): PARTIAL — bugs found
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
timing-sensitive; the Scenario 3 escape (finding 3) is worth a manual repro
before any library fix.
