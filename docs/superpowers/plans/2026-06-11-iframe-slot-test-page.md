# Non-cooperating iframe focus-trap test page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated standalone page to the existing Vite demo that exercises a focus trap containing a non-cooperating, cross-origin iframe, drivable both manually and by the Chrome DevTools MCP.

**Architecture:** A new Vite page entry (`demo/iframe-trap.html` → `demo/iframe-trap.tsx`) renders four scenarios that wire `useFocusTrap` + `useIframeSlot`. The iframe content is a dumb static HTML file in `demo/public/` loaded cross-origin via the `localhost`↔`127.0.0.1` host swap, so the browser enforces the no-peeking constraint of the non-cooperating code path. A shared live readout panel exposes `data-testid` hooks for automation.

**Tech Stack:** React 18, Vite 6, TypeScript, Vitest (for the one pure helper), Chrome DevTools MCP (for behavioral verification).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `demo/cross-origin.ts` | Pure helper: derive the sibling-origin URL for the inner page. |
| `demo/cross-origin.test.ts` | Vitest unit tests for the helper. |
| `demo/public/iframe-inner.html` | Dumb, non-cooperating inner page (plain HTML, no library). |
| `demo/iframe-trap.html` | New Vite page entry. |
| `demo/iframe-trap.tsx` | React bootstrap for the page; lays out the four scenarios. |
| `demo/sections/iframe-trap/sentinel-iframe.tsx` | Presentational `[before-sentinel][iframe][after-sentinel]` cluster + visible landing hint. |
| `demo/sections/iframe-trap/focus-readout.tsx` | Live focus/trap-state panel with `data-testid`s. |
| `demo/sections/iframe-trap/canonical.tsx` | Scenario 1: input → iframe → button. |
| `demo/sections/iframe-trap/lock-toggle.tsx` | Scenario 2: same trap + enterable/locked toggle. |
| `demo/sections/iframe-trap/multi-iframe.tsx` | Scenario 3: two adjacent iframes sharing a registry. |
| `vite.config.ts` | Add `build.rollupOptions.input` so the new page builds. |
| `demo/index.html` | Add a discoverability link to the new page. |

**Wiring recap (from `src/hooks/use-iframe-slot.test.ts`):** the host creates `containerRef`, `iframeRef`, `beforeSentinelRef`, `afterSentinelRef`; calls `useIframeSlot(...)`; merges the returned `strategyFragment` into a `FocusTrapStrategy` (`getElements` maps the content slot to the **wrapper** element that contains the sentinels + iframe); passes that strategy to `useFocusTrap`. The slot's `onExit` is wired to the trap's `cycleToAdjacentSlot` and `onRequestExit` to `exitTrap`. Because the trap result is created *after* the slot, read it through a ref.

---

## Task 1: Cross-origin URL helper (pure, TDD)

**Files:**
- Create: `demo/cross-origin.ts`
- Test: `demo/cross-origin.test.ts`

- [ ] **Step 1: Write the failing test**

Create `demo/cross-origin.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crossOriginInnerSrc, siblingOrigin } from "./cross-origin";

describe("siblingOrigin", () => {
  it("swaps localhost -> 127.0.0.1 keeping the port", () => {
    expect(siblingOrigin("localhost:5173")).toBe("127.0.0.1:5173");
  });
  it("swaps 127.0.0.1 -> localhost keeping the port", () => {
    expect(siblingOrigin("127.0.0.1:5173")).toBe("localhost:5173");
  });
  it("maps the concord.org host to the S3 host", () => {
    expect(siblingOrigin("models-resources.concord.org")).toBe(
      "models-resources.s3.amazonaws.com",
    );
  });
  it("maps the S3 host to the concord.org host", () => {
    expect(siblingOrigin("models-resources.s3.amazonaws.com")).toBe(
      "models-resources.concord.org",
    );
  });
  it("returns null for an unknown host", () => {
    expect(siblingOrigin("example.com")).toBeNull();
  });
});

describe("crossOriginInnerSrc", () => {
  it("builds the inner URL on the sibling origin, same directory (dev)", () => {
    expect(
      crossOriginInnerSrc(
        "http://localhost:5173/iframe-trap.html",
        "iframe-inner.html",
      ),
    ).toBe("http://127.0.0.1:5173/iframe-inner.html");
  });
  it("preserves a nested deploy directory (prod)", () => {
    expect(
      crossOriginInnerSrc(
        "https://models-resources.concord.org/accessibility-tools/iframe-trap.html",
        "iframe-inner.html",
      ),
    ).toBe(
      "https://models-resources.s3.amazonaws.com/accessibility-tools/iframe-inner.html",
    );
  });
  it("falls back to same origin for an unknown host", () => {
    expect(
      crossOriginInnerSrc(
        "http://example.com/demo/iframe-trap.html",
        "iframe-inner.html",
      ),
    ).toBe("http://example.com/demo/iframe-inner.html");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run demo/cross-origin.test.ts`
Expected: FAIL — cannot resolve `./cross-origin`.

- [ ] **Step 3: Write the implementation**

Create `demo/cross-origin.ts`:

```ts
/**
 * Derive a cross-origin URL for the non-cooperating inner page from the
 * current page's URL, without running a second dev server.
 *
 * Dev: localhost <-> 127.0.0.1 (same Vite server, distinct origins).
 * Prod: models-resources.concord.org <-> models-resources.s3.amazonaws.com
 * (the two URLs the deployed demo is reachable at).
 */

const HOST_PAIRS: Array<[string, string]> = [
  ["models-resources.concord.org", "models-resources.s3.amazonaws.com"],
];

/** Return the sibling host for `host` (may include a port), or null. */
export function siblingOrigin(host: string): string | null {
  if (host.startsWith("localhost"))
    return host.replace("localhost", "127.0.0.1");
  if (host.startsWith("127.0.0.1"))
    return host.replace("127.0.0.1", "localhost");
  for (const [a, b] of HOST_PAIRS) {
    if (host === a) return b;
    if (host === b) return a;
  }
  return null;
}

/**
 * Build a URL for `innerFile` (e.g. "iframe-inner.html") in the same directory
 * as the current page but on the sibling origin. Falls back to the same origin
 * when the host has no known sibling.
 */
export function crossOriginInnerSrc(
  currentHref: string,
  innerFile: string,
): string {
  const url = new URL(currentHref);
  const dir = url.pathname.replace(/[^/]*$/, "");
  const sibling = siblingOrigin(url.host);
  if (!sibling) return `${url.origin}${dir}${innerFile}`;
  return `${url.protocol}//${sibling}${dir}${innerFile}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run demo/cross-origin.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add demo/cross-origin.ts demo/cross-origin.test.ts
git commit -m "feat(demo): cross-origin URL helper for iframe test page"
```

---

## Task 2: Dumb non-cooperating inner page

**Files:**
- Create: `demo/public/iframe-inner.html`

This page must NOT import the library or talk to the parent — that is what makes it non-cooperating. Files in `demo/public/` are served verbatim at the site root in both dev and build.

- [ ] **Step 1: Create the inner page**

Create `demo/public/iframe-inner.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Non-cooperating iframe content</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 12px;
      background: #fffbeb;
      color: #1a1a1a;
    }
    h2 { font-size: 14px; margin: 0 0 8px; }
    p { font-size: 12px; margin: 0 0 8px; color: #555; }
    .controls > * { margin-right: 8px; }
    :focus-visible { outline: 3px solid #d97706; outline-offset: 2px; }
  </style>
</head>
<body>
  <h2>Inner page (non-cooperating)</h2>
  <p>Plain HTML, cross-origin, no library. The parent cannot read into this frame.</p>
  <div class="controls">
    <input type="text" aria-label="Inner text field" placeholder="Inner field" />
    <button type="button">Inner button</button>
    <a href="#inner">Inner link</a>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add demo/public/iframe-inner.html
git commit -m "feat(demo): dumb non-cooperating inner page for iframe trap"
```

---

## Task 3: Page entry, bootstrap, and build wiring

**Files:**
- Create: `demo/iframe-trap.html`
- Create: `demo/iframe-trap.tsx`
- Modify: `vite.config.ts`
- Modify: `demo/index.html`
- Modify: `package.json`

This task produces a navigable (if mostly empty) page and makes it a real build entry. Scenario components are added in later tasks.

> **Deviation discovered during execution:** `vite serve demo` / `vite build demo`
> set the Vite root to `demo/`, and Vite searches for its config file relative to
> the root. Since there is no `demo/vite.config.ts`, the repo-root `vite.config.ts`
> is **never loaded by the demo scripts** (it is only loaded by vitest, which runs
> from the repo root). The demo currently runs configless — esbuild transpiles the
> TSX, so it works without the React plugin. Therefore `server.host` and
> `build.rollupOptions.input` only take effect if the demo scripts are pointed at
> the config explicitly. Fix: add `--config vite.config.ts` to both the `demo` and
> `demo:build` scripts in `package.json`. Also add `server: { host: true }` to the
> config (the dev server otherwise binds to `localhost` only and the cross-origin
> `127.0.0.1` iframe load fails — confirmed during execution).

- [ ] **Step 1: Create the HTML entry**

Create `demo/iframe-trap.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Accessibility Tools - Iframe Focus Trap Test</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./iframe-trap.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create the React bootstrap (placeholder body for now)**

Create `demo/iframe-trap.tsx`:

```tsx
import { createRoot } from "react-dom/client";
import { AccessibilityProvider } from "../src/hooks";
import "./demo.css";

function App() {
  return (
    <AccessibilityProvider>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
        <h1>Iframe Focus Trap Test</h1>
        <p>
          Scenarios for a non-cooperating, cross-origin iframe inside a focus
          trap. Tab, Shift+Tab, and Escape to exercise each trap.
        </p>
      </main>
    </AccessibilityProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
```

- [ ] **Step 3: Make the new page a build entry**

Modify `vite.config.ts`. The current file has no `build` key; add one. Note: `root` is `demo/` (set by the `vite ... demo` CLI arg), so inputs are resolved relative to that root.

Replace the whole file with:

```ts
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "demo/index.html"),
        iframeTrap: resolve(__dirname, "demo/iframe-trap.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: [
      ...configDefaults.exclude,
      "tests/smoke.test.ts",
      "tests/cli.test.ts",
    ],
  },
});
```

- [ ] **Step 4: Add a discoverability link from the kitchen sink**

Modify `demo/index.html`. Replace the `<body>` contents so the link appears even before the React app mounts:

```html
<body>
  <p style="font: 13px system-ui; margin: 8px;">
    <a href="./iframe-trap.html">→ Iframe focus-trap test page</a>
  </p>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
```

- [ ] **Step 5: Start the dev server (background) and verify both origins serve**

Run (background): `npm run demo`
Then verify the cross-origin trick works on this machine:

Run: `curl -so /dev/null -w "%{http_code}\n" http://localhost:5173/iframe-trap.html && curl -so /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/iframe-inner.html`
Expected: `200` then `200`.

If the `127.0.0.1` request fails to connect, add `server: { host: true }` to `vite.config.ts` and retry. (On macOS `localhost` resolves to `127.0.0.1`, so this normally already works.)

- [ ] **Step 6: Verify the page renders via the DevTools MCP**

Using the Chrome DevTools MCP: `navigate_page` to `http://localhost:5173/iframe-trap.html`, then `take_snapshot`.
Expected: the `<h1>Iframe Focus Trap Test</h1>` heading is present.

- [ ] **Step 7: Verify the build includes the new page**

Run: `npm run demo:build`
Expected: build succeeds and `dist-s3/iframe-trap.html` and `dist-s3/iframe-inner.html` both exist.

Run: `ls dist-s3/iframe-trap.html dist-s3/iframe-inner.html`
Expected: both paths listed.

- [ ] **Step 8: Commit**

```bash
git add demo/iframe-trap.html demo/iframe-trap.tsx vite.config.ts demo/index.html
git commit -m "feat(demo): iframe focus-trap page entry and build wiring"
```

---

## Task 4: Live focus/trap-state readout

**Files:**
- Create: `demo/sections/iframe-trap/focus-readout.tsx`

A presentational panel that observes only what the library/parent can see (no peeking into the frame): the active element's tag, whether the active element IS a given iframe (focus descended), and trap state passed in by the parent. Exposes `data-testid`s for automation.

- [ ] **Step 1: Create the component**

Create `demo/sections/iframe-trap/focus-readout.tsx`:

```tsx
import { useEffect, useState } from "react";

export interface FocusReadoutProps {
  /** Human label for this scenario, shown in the panel heading. */
  label: string;
  /** Whether the parent's trap currently reports trapped. */
  isTrapped: boolean;
  /** The iframe elements this scenario owns, by name, for descent detection. */
  iframes: Record<string, HTMLIFrameElement | null>;
}

function describeActive(active: Element | null): string {
  if (!active || active === document.body) return "(none)";
  const tag = active.tagName.toLowerCase();
  const label =
    active.getAttribute("aria-label") ??
    active.getAttribute("placeholder") ??
    active.textContent?.trim().slice(0, 20) ??
    "";
  return label ? `${tag} "${label}"` : tag;
}

export function FocusReadout({ label, isTrapped, iframes }: FocusReadoutProps) {
  const [active, setActive] = useState<string>("(none)");
  const [descendedInto, setDescendedInto] = useState<string>("(none)");

  useEffect(() => {
    const update = () => {
      const el = document.activeElement;
      setActive(describeActive(el));
      const hit = Object.entries(iframes).find(([, f]) => f && f === el);
      setDescendedInto(hit ? hit[0] : "(none)");
    };
    update();
    // focusin bubbles; window focus/blur catches native iframe descent/ascent.
    document.addEventListener("focusin", update, true);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("focusin", update, true);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, [iframes]);

  return (
    <dl
      data-testid={`readout-${label}`}
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
        background: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: 4,
        padding: "8px 12px",
        margin: "8px 0",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "2px 12px",
      }}
    >
      <dt>trapped</dt>
      <dd data-testid="readout-trapped" style={{ margin: 0 }}>
        {String(isTrapped)}
      </dd>
      <dt>activeElement</dt>
      <dd data-testid="readout-active" style={{ margin: 0 }}>
        {active}
      </dd>
      <dt>descended into</dt>
      <dd data-testid="readout-descended" style={{ margin: 0 }}>
        {descendedInto}
      </dd>
    </dl>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add demo/sections/iframe-trap/focus-readout.tsx
git commit -m "feat(demo): live focus/trap-state readout panel"
```

---

## Task 5: Canonical scenario (input → iframe → button)

**Files:**
- Create: `demo/sections/iframe-trap/sentinel-iframe.tsx`
- Create: `demo/sections/iframe-trap/canonical.tsx`
- Modify: `demo/iframe-trap.tsx`

- [ ] **Step 1: Create the reusable sentinel+iframe cluster**

Create `demo/sections/iframe-trap/sentinel-iframe.tsx`:

```tsx
import type { RefObject } from "react";

export interface SentinelIframeProps {
  /** Wrapper element used as the slot element in getElements. */
  wrapperRef: RefObject<HTMLDivElement | null>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  beforeSentinelProps: { ref: RefObject<HTMLElement | null>; key: string };
  afterSentinelProps: { ref: RefObject<HTMLElement | null>; key: string };
  /** Cross-origin URL from crossOriginInnerSrc(). */
  src: string;
  title: string;
  /** Static landing-hint text; shown when the library sets data-landing. */
  hint: string;
  /** Host owns the iframe's tabindex (enterable when undefined). */
  iframeTabIndex?: number;
}

// The library is the sole imperative writer of tabindex/data-landing on the
// sentinels; we only provide the ref + key and style. The hint is revealed by
// the [data-landing] attribute the library sets, via the sibling-span CSS below.
const sentinelStyle = {
  display: "inline-block",
  minWidth: 4,
  minHeight: 16,
} as const;

export function SentinelIframe({
  wrapperRef,
  iframeRef,
  beforeSentinelProps,
  afterSentinelProps,
  src,
  title,
  hint,
  iframeTabIndex,
}: SentinelIframeProps) {
  return (
    <div
      ref={wrapperRef}
      style={{ border: "2px dashed #94a3b8", borderRadius: 4, padding: 8 }}
    >
      <span
        ref={beforeSentinelProps.ref as RefObject<HTMLSpanElement>}
        key={beforeSentinelProps.key}
        data-testid={`${title}-before-sentinel`}
        className="iframe-sentinel"
        style={sentinelStyle}
      />
      <span className="sentinel-hint">{hint}</span>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        tabIndex={iframeTabIndex}
        data-testid={`${title}-iframe`}
        style={{
          display: "block",
          width: "100%",
          height: 140,
          border: "1px solid #cbd5e1",
          margin: "4px 0",
        }}
      />
      <span
        ref={afterSentinelProps.ref as RefObject<HTMLSpanElement>}
        key={afterSentinelProps.key}
        data-testid={`${title}-after-sentinel`}
        className="iframe-sentinel"
        style={sentinelStyle}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add hint-reveal CSS**

Append to `demo/demo.css`:

```css
/* Iframe focus-trap test page: reveal the landing hint only while the
   library has marked a sentinel with data-landing. */
.sentinel-hint {
  display: none;
  font: 12px system-ui;
  color: #b45309;
  margin-left: 6px;
}
.iframe-sentinel[data-landing] ~ .sentinel-hint {
  display: inline;
}
```

- [ ] **Step 3: Create the canonical scenario**

Create `demo/sections/iframe-trap/canonical.tsx`:

```tsx
import { useMemo, useRef } from "react";
import type { FocusTrapResult, FocusTrapStrategy } from "../../../src/hooks";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

const CYCLE_ORDER = ["input", "frame", "button"];

export function CanonicalScenario() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const beforeRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  // Trap is created after the slot; read it through a ref to break the cycle.
  const trapRef = useRef<FocusTrapResult | null>(null);

  const src = useMemo(
    () => crossOriginInnerSrc(window.location.href, "iframe-inner.html"),
    [],
  );

  const getElements = useMemo(
    () => () => ({
      input: inputRef.current ?? undefined,
      frame: wrapperRef.current ?? undefined,
      button: buttonRef.current ?? undefined,
    }),
    [],
  );

  const slot = useIframeSlot({
    slotName: "frame",
    iframeRef,
    beforeSentinelRef: beforeRef,
    afterSentinelRef: afterRef,
    cycleOrder: CYCLE_ORDER,
    getElements,
    onExit: (d) => trapRef.current?.cycleToAdjacentSlot(d),
    onRequestExit: () => trapRef.current?.exitTrap(),
    enterLabel: "Press Tab to enter the inner page",
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

  const trap = useFocusTrap({ containerRef, strategy });
  trapRef.current = trap;

  return (
    <section>
      <h2>1. Canonical: input → iframe → button</h2>
      <p style={{ fontSize: 13 }}>
        Focus the container and press Enter, or click a control. Tab forward:
        input → (descend into iframe) → button → input. Shift+Tab reverses.
        Escape exits.
      </p>
      <FocusReadout
        label="canonical"
        isTrapped={trap?.isTrapped ?? false}
        iframes={{ frame: iframeRef.current }}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label="Canonical iframe trap"
        data-testid="canonical-container"
        style={{
          border: trap?.isTrapped ? "2px solid #2563eb" : "1px solid #ccc",
          borderRadius: 4,
          padding: 12,
          outline: "none",
        }}
      >
        <input ref={inputRef} type="text" placeholder="Before iframe" />
        <SentinelIframe
          wrapperRef={wrapperRef}
          iframeRef={iframeRef}
          beforeSentinelProps={slot.beforeSentinelProps}
          afterSentinelProps={slot.afterSentinelProps}
          src={src}
          title="canonical"
          hint="Press Tab to enter the inner page"
        />
        <button ref={buttonRef} type="button">
          After iframe
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Mount it on the page**

Modify `demo/iframe-trap.tsx`. Add the import after the existing imports:

```tsx
import { CanonicalScenario } from "./sections/iframe-trap/canonical";
```

Then replace the `<p>...Tab, Shift+Tab, and Escape...</p>` line's following content by inserting the scenario inside `<main>`, after the intro `<p>`:

```tsx
        <CanonicalScenario />
```

- [ ] **Step 5: Verify behavior via the DevTools MCP**

Ensure `npm run demo` is running. With the Chrome DevTools MCP:
1. `navigate_page` → `http://localhost:5173/iframe-trap.html`.
2. `click` the element with `data-testid="canonical-container"`, then `press_key` `Enter` to enter the trap.
3. Read `data-testid="readout-trapped"` → expect `true`.
4. `press_key` `Tab`. Read `readout-active` → expect the input ("Before iframe"); `Tab` again → `readout-descended` should become `frame` (activeElement is the iframe) or focus lands on the before-sentinel showing the hint.
5. `press_key` `Tab` to cross the frame → `readout-active` should reach `button "After iframe"`.
6. `press_key` `Escape` → `readout-trapped` → expect `false`.

Record the observed sequence. If focus does not cross the iframe as expected, that is a genuine library finding — capture it (this page exists to surface exactly these).

- [ ] **Step 6: Commit**

```bash
git add demo/sections/iframe-trap/sentinel-iframe.tsx demo/sections/iframe-trap/canonical.tsx demo/iframe-trap.tsx demo/demo.css
git commit -m "feat(demo): canonical non-cooperating iframe trap scenario"
```

---

## Task 6: Enterable/locked toggle scenario

**Files:**
- Create: `demo/sections/iframe-trap/lock-toggle.tsx`
- Modify: `demo/iframe-trap.tsx`

Same trap as canonical, but a button flips the iframe's `tabindex` between enterable (`0`) and locked (`-1`) and calls `registry.notifyChange()` so intercept derivation re-runs. A single-slot registry is used so the toggle can notify it.

- [ ] **Step 1: Create the scenario**

Create `demo/sections/iframe-trap/lock-toggle.tsx`:

```tsx
import { useMemo, useRef, useState } from "react";
import type { FocusTrapResult, FocusTrapStrategy } from "../../../src/hooks";
import { createIframeSlotRegistry } from "../../../src/hooks/iframe-slot-registry";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

const CYCLE_ORDER = ["input", "frame", "button"];

export function LockToggleScenario() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const beforeRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  const trapRef = useRef<FocusTrapResult | null>(null);
  const registry = useMemo(() => createIframeSlotRegistry(), []);
  const [locked, setLocked] = useState(false);

  const src = useMemo(
    () => crossOriginInnerSrc(window.location.href, "iframe-inner.html"),
    [],
  );

  const getElements = useMemo(
    () => () => ({
      input: inputRef.current ?? undefined,
      frame: wrapperRef.current ?? undefined,
      button: buttonRef.current ?? undefined,
    }),
    [],
  );

  const slot = useIframeSlot({
    slotName: "frame",
    iframeRef,
    beforeSentinelRef: beforeRef,
    afterSentinelRef: afterRef,
    cycleOrder: CYCLE_ORDER,
    getElements,
    onExit: (d) => trapRef.current?.cycleToAdjacentSlot(d),
    onRequestExit: () => trapRef.current?.exitTrap(),
    registry,
    enterLabel: "Press Tab to enter the inner page",
  });

  const strategy = useMemo<FocusTrapStrategy>(
    () => ({
      getElements,
      cycleOrder: CYCLE_ORDER,
      announceEnter: "Entered lock-toggle trap.",
      announceExit: "Exited lock-toggle trap",
      ...slot.strategyFragment,
    }),
    [getElements, slot.strategyFragment],
  );

  const trap = useFocusTrap({ containerRef, strategy });
  trapRef.current = trap;

  const toggleLock = () => {
    setLocked((v) => !v);
    // The library reads tabindex live; tell the registry membership-state changed
    // so each slot re-derives its intercept directions.
    registry.notifyChange();
  };

  return (
    <section>
      <h2>2. Enterable / locked toggle</h2>
      <p style={{ fontSize: 13 }}>
        Toggle the iframe between enterable (tabindex 0) and locked (tabindex
        -1). When locked, Tab should skip over the iframe via the sentinels
        rather than descending into it.
      </p>
      <button type="button" data-testid="lock-toggle" onClick={toggleLock}>
        {locked ? "Unlock iframe (make enterable)" : "Lock iframe (tabindex -1)"}
      </button>
      <FocusReadout
        label="lock-toggle"
        isTrapped={trap?.isTrapped ?? false}
        iframes={iframesMap}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label="Lock-toggle iframe trap"
        data-testid="lock-container"
        style={{
          border: trap?.isTrapped ? "2px solid #2563eb" : "1px solid #ccc",
          borderRadius: 4,
          padding: 12,
          outline: "none",
        }}
      >
        <input ref={inputRef} type="text" placeholder="Before iframe" />
        <SentinelIframe
          wrapperRef={wrapperRef}
          iframeRef={iframeRef}
          beforeSentinelProps={slot.beforeSentinelProps}
          afterSentinelProps={slot.afterSentinelProps}
          src={src}
          title="lock"
          hint="Press Tab to enter the inner page"
          iframeTabIndex={locked ? -1 : 0}
        />
        <button ref={buttonRef} type="button">
          After iframe
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount it on the page**

Modify `demo/iframe-trap.tsx`. Add the import:

```tsx
import { LockToggleScenario } from "./sections/iframe-trap/lock-toggle";
```

Add it inside `<main>` after `<CanonicalScenario />`:

```tsx
        <LockToggleScenario />
```

- [ ] **Step 3: Verify behavior via the DevTools MCP**

With `npm run demo` running and the page loaded:
1. Enter the `lock-container` trap (click container, `press_key` `Enter`).
2. With the iframe enterable, Tab from the input → `readout-descended` reaches `frame`.
3. `click` `data-testid="lock-toggle"` to lock; re-enter the trap and Tab from the input → focus should reach `button "After iframe"` WITHOUT `readout-descended` ever becoming `frame`.
Record the observed behavior for both states.

- [ ] **Step 4: Commit**

```bash
git add demo/sections/iframe-trap/lock-toggle.tsx demo/iframe-trap.tsx
git commit -m "feat(demo): enterable/locked iframe toggle scenario"
```

---

## Task 7: Multiple adjacent iframes (registry) scenario

**Files:**
- Create: `demo/sections/iframe-trap/multi-iframe.tsx`
- Modify: `demo/iframe-trap.tsx`

Two adjacent non-cooperating iframes share one registry so the intercept derivation can see both. cycleOrder is `["frameA", "frameB"]`; getElements maps each to its wrapper. Two `useIframeSlot` calls, same registry.

- [ ] **Step 1: Create the scenario**

Create `demo/sections/iframe-trap/multi-iframe.tsx`:

```tsx
import { type RefObject, useMemo, useRef } from "react";
import type {
  FocusTrapResult,
  FocusTrapStrategy,
  UseIframeSlotResult,
} from "../../../src/hooks";
import { createIframeSlotRegistry } from "../../../src/hooks/iframe-slot-registry";
import { useFocusTrap } from "../../../src/hooks/use-focus-trap";
import { useIframeSlot } from "../../../src/hooks/use-iframe-slot";
import { crossOriginInnerSrc } from "../../cross-origin";
import { FocusReadout } from "./focus-readout";
import { SentinelIframe } from "./sentinel-iframe";

const CYCLE_ORDER = ["frameA", "frameB"];

export function MultiIframeScenario() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trapRef = useRef<FocusTrapResult | null>(null);
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

  const trap = useFocusTrap({ containerRef, strategy });
  trapRef.current = trap;

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
    />
  );

  return (
    <section>
      <h2>3. Two adjacent iframes (shared registry)</h2>
      <p style={{ fontSize: 13 }}>
        Two enterable iframes next to each other. Tabbing from A into B should
        flow natively (no sentinel interception between them); the sentinels at
        the outer edges still bound the trap.
      </p>
      <FocusReadout
        label="multi"
        isTrapped={trap?.isTrapped ?? false}
        iframes={iframesMap}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label="Multi-iframe trap"
        data-testid="multi-container"
        style={{
          border: trap?.isTrapped ? "2px solid #2563eb" : "1px solid #ccc",
          borderRadius: 4,
          padding: 12,
          outline: "none",
          display: "grid",
          gap: 8,
        }}
      >
        {renderFrame("frameA", aWrap, aFrame, slotA, "Press Tab to enter iframe A")}
        {renderFrame("frameB", bWrap, bFrame, slotB, "Press Tab to enter iframe B")}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Confirm the exported types exist**

The scenario imports `UseIframeSlotResult` and `FocusTrapResult`/`FocusTrapStrategy` from `../../../src/hooks`.

Run: `grep -n "UseIframeSlotResult\|FocusTrapResult\|FocusTrapStrategy" src/hooks/index.ts`
Expected: each name appears in the barrel exports.

If `UseIframeSlotResult` is NOT exported from `src/hooks/index.ts`, add it. Open `src/hooks/index.ts` and add to the existing `use-iframe-slot` export line (or add one):

```ts
export type { UseIframeSlotOptions, UseIframeSlotResult } from "./use-iframe-slot";
```

- [ ] **Step 3: Mount it on the page**

Modify `demo/iframe-trap.tsx`. Add the import:

```tsx
import { MultiIframeScenario } from "./sections/iframe-trap/multi-iframe";
```

Add it inside `<main>` after `<LockToggleScenario />`:

```tsx
        <MultiIframeScenario />
```

- [ ] **Step 4: Verify behavior via the DevTools MCP**

With `npm run demo` running and the page loaded:
1. Enter the `multi-container` trap.
2. Tab to descend into iframe A (`readout-descended` → `frameA`).
3. Tab again — focus should move toward iframe B (`readout-descended` → `frameB`) flowing natively, not get parked on an interior sentinel.
4. Continue Tab — should wrap back to iframe A.
Record the observed transitions. Any failure to flow A→B natively is a real multi-iframe finding.

- [ ] **Step 5: Commit**

```bash
git add demo/sections/iframe-trap/multi-iframe.tsx demo/iframe-trap.tsx src/hooks/index.ts
git commit -m "feat(demo): multi-iframe shared-registry trap scenario"
```

---

## Task 8: Final integration verification

**Files:** none (verification only).

- [ ] **Step 1: Full type/lint check**

Run: `npm run check`
Expected: `biome check` passes and `tsc --noEmit` passes with no errors.

- [ ] **Step 2: Build the demo**

Run: `npm run demo:build`
Expected: success; `dist-s3/iframe-trap.html`, `dist-s3/iframe-inner.html`, and `dist-s3/index.html` all present.

- [ ] **Step 3: End-to-end manual/MCP pass**

With `npm run demo` running, load `http://localhost:5173/iframe-trap.html` in the DevTools MCP and run each scenario's verification from Tasks 5–7 once more in sequence. Confirm:
- the cross-origin iframe actually loads (network request to the `127.0.0.1` origin returns 200), and
- the readout panels update as focus moves.

Write a short summary of observed behavior per scenario (this is the deliverable that makes the library debuggable).

- [ ] **Step 4: Commit any docs/notes**

If you captured findings worth keeping, add them to the design doc or a NOTES section and commit:

```bash
git add -A
git commit -m "docs(demo): record observed iframe-trap behavior"
```

---

## Self-Review Notes

- **Spec coverage:** dedicated standalone page (Task 3) ✓; cross-origin via localhost↔127.0.0.1 (Task 1, used in Tasks 5–7) ✓; dumb static inner page in `public/` (Task 2) ✓; canonical trap (Task 5) ✓; enterable/locked toggle (Task 6) ✓; multiple iframes via registry (Task 7) ✓; live focus readout (Task 4) ✓; build wiring + discoverability link (Task 3) ✓.
- **Out of scope honored:** no transport/postMessage, inner page stays dumb.
- **Type consistency:** slot name `"frame"` and `cycleOrder` `["input","frame","button"]` match across Tasks 5–6; multi-iframe uses `["frameA","frameB"]` consistently. `getElements` always maps a content slot to its wrapper `div`, matching the `useIframeSlot` contract.
- **Testing posture:** only `crossOriginInnerSrc` is unit-tested (it is pure); the React/iframe behavior is verified by running the app under the DevTools MCP, because jsdom cannot reproduce real cross-origin iframe focus.
