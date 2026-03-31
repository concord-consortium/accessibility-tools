# `@concord-consortium/accessibility-tools`

## Competitive Landscape

There are many accessibility testing tools available, but none combine live runtime debugging, static auditing, React-aware component resolution, composable hooks, and CI integration in a single package.

**Existing tools and their limitations:**

| Tool | What it does | What it doesn't do |
|---|---|---|
| [axe-core / axe DevTools](https://www.deque.com/axe/) | WCAG rule-based auditing (browser extension, CLI, jest-axe) | No live focus tracking, no keyboard event log, no focus trap detection, no React component name resolution |
| [Lighthouse](https://developer.chrome.com/docs/lighthouse) | Accessibility score + audit in Chrome DevTools / CI | Point-in-time snapshot only, no live debugging, no overlays |
| [WAVE](https://wave.webaim.org/) | Browser extension with inline error indicators | No React awareness, no keyboard event logging, no focus trap detection |
| Chrome DevTools Accessibility tab | Accessibility tree, computed properties for one element | No live focus log, no announcements log, no keyboard event log, no overlays |
| Firefox Accessibility Inspector | Accessibility tree, tab order overlay, contrast checker | No React awareness, no audit report generation, no CI integration |
| [jest-axe](https://github.com/nickcolley/jest-axe) | axe-core assertions in unit tests | No live debugging, no visual overlays |
| [@storybook/addon-a11y](https://storybook.js.org/addons/@storybook/addon-a11y) | axe-core panel per Storybook story | Only works in Storybook |
| [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | Static lint rules for JSX | No runtime behavior, can't catch dynamic issues |

**What `@concord-consortium/accessibility-tools` provides that no single existing tool does:**

Live runtime debugging:
- Live Focus Tracker + Focus History Log + Focus Loss Detector (3 focus tools working together)
- Keyboard Event Log with `preventDefault`/`stopPropagation` detection
- Announcements Log via MutationObserver (see what screen readers hear without a screen reader)
- Live Region Inventory + Overlay (see where `aria-live` regions are and watch them fire)
- Focus Trap Detector (heuristic detection of focus cycling)
- Screen Reader Text Preview (computed accessible name + role + state)
- Focus Order Recorder with diff/compare for QA regression testing

React-aware development:
- React component name resolution on every panel (via fiber traversal)
- Composable hooks (`useAccessibility`) with strategy-based focus traps
- App-specific wrappers (`useClueAccessibility`, `useCodapAccessibility`) that translate app concepts to generic accessibility patterns
- `AccessibilityProvider` context for hook-to-sidebar communication

Visual overlays (7 toggles):
- Tab Order, Contrast Ratios, Touch Targets, Live Regions
- Text Spacing Override, Reflow Test, Forced Colors Mode

Auditing:
- Scoped per-component WCAG audit with actionable fix instructions (not just "add aria-label" but the specific code change needed)
- Markdown report generation with copy-to-clipboard
- Audits the sidebar itself via dedicated "Audit Sidebar" button

Multi-distribution:
- React component (integrated into app layout)
- Standalone bookmarklet/script injection (any page, no build step)
- CLI (`cc-a11y-tools audit` / `cc-a11y-tools report`) for CI/CD
- Playwright matchers (`toPassA11yAudit` + `generateA11yReport`)
- Cypress commands (`passA11yAudit` + `generateA11yReport`)

The closest individual tools are Firefox's Accessibility Inspector (tab order overlay + contrast checker) and axe DevTools (WCAG auditing + CI). But no existing tool combines live runtime debugging with static auditing with React component resolution with composable hooks for building the accessibility features - and certainly not one that also works as a standalone bookmarklet on any page.

## Package Architecture

Several patterns repeat across the upcoming stories. Extracting these into shared hooks and utilities before implementing individual tiles would reduce duplication and ensure consistency.

The accessibility infrastructure is split into two layers: a generic reusable package and an app-specific wrapper.

**`@concord-consortium/accessibility-tools`** (generic npm package)

Contains the core hooks with zero app-specific knowledge:
- `useAccessibility` - uber-hook that composes all sub-hooks
- `useFocusTrap` - Tab cycling, Enter/Escape, capture-phase listeners, portal support
- `useKeyboardNav` - arrow/Home/End/Enter navigation with optional focus ring
- `useSelectionAnnouncer` - aria-live announcements for selection changes
- `useKeyboardResize` - WAI-ARIA separator pattern for keyboard resizing
- SCSS mixin for focus rings

The focus trap is customized via a **`FocusTrapStrategy`** interface. The generic package handles all keyboard mechanics (which key does what); the strategy handles all lifecycle (what happens when you enter/exit, where elements come from, what to announce):

```typescript
interface FocusTrapStrategy {
  // Which elements are in the trap, keyed by slot name
  getElements: () => Record<string, HTMLElement | undefined>;

  // Custom focus method for complex editors (Slate, CodeMirror, etc.)
  focusContent?: () => boolean;

  // Lifecycle: called when entering/exiting the trap
  onEnter?: () => void;
  onExit?: () => void;

  // What order to cycle through slots on Tab
  // Default: ["title", "toolbar", "content"]
  cycleOrder?: string[];

  // Screen reader announcements
  announceEnter?: string;
  announceExit?: string;

  // Elements in the trap that live outside the container DOM
  // (e.g., toolbar in a FloatingPortal)
  getExternalElements?: () => HTMLElement[];
}
```

Any React app can use the generic package directly by providing a strategy:

```typescript
// Direct usage in any app - no wrapper needed for simple cases
const a11y = useAccessibility({
  focusTrap: {
    containerRef,
    strategy: {
      getElements: () => ({ content: editorRef.current }),
      onEnter: () => setEditing(true),
      onExit: () => setEditing(false),
      cycleOrder: ["content"],
      announceEnter: "Editing. Press Escape to exit.",
    },
  },
});
```

**`useClueAccessibility`** (CLUE app wrapper)

Lives in the [CLUE](https://github.com/concord-consortium/collaborative-learning) repo. Translates CLUE-specific concepts into the generic strategy:

```typescript
function useClueAccessibility(options: ClueAccessibilityOptions) {
  const strategy = options.type === "tile"
    ? createClueTileStrategy(options.focusTrap)
    : undefined;

  return useAccessibility({
    focusTrap: strategy ? {
      containerRef: options.focusTrap.containerRef,
      strategy,
    } : undefined,
    navigation: options.navigation,       // passed through as-is
    announcements: options.announcements,  // passed through as-is
    resize: options.resize,               // passed through as-is
  });
}

// CLUE strategy factory - maps tile concepts to generic strategy
function createClueTileStrategy(opts: ClueFocusTrapConfig): FocusTrapStrategy {
  return {
    getElements: () => ({
      content: opts.contentRef?.current ?? undefined,
      title: opts.titleRef?.current ?? undefined,
      // toolbar registered via RegisterToolbarContext, not a ref
    }),
    focusContent: opts.focusContent,
    onEnter: () => {
      // CLUE-specific: register with tile API, select tile
      opts.onRegisterTileApi({
        getFocusableElements: () => ({ /* ... */ }),
        ...opts.additionalApi,
      });
    },
    onExit: () => opts.onUnregisterTileApi(),
    cycleOrder: ["title", "toolbar", "content"],
    announceEnter: ariaLabels.announce.editingTile(opts.tileType),
    announceExit: ariaLabels.announce.exitedTile(opts.tileType),
    getExternalElements: () => {
      // CLUE-specific: toolbar is in a FloatingPortal
      const toolbar = opts.toolbarRef?.current;
      return toolbar ? [toolbar] : [];
    },
  };
}
```

**How another app (e.g., [CODAP](https://github.com/concord-consortium/codap)) would use it:**

```typescript
// CODAP's wrapper - different lifecycle, different cycle order
function useCodapAccessibility(options: CodapOptions) {
  const strategy = options.componentId
    ? createCodapComponentStrategy(options)
    : undefined;

  return useAccessibility({
    focusTrap: strategy ? {
      containerRef: options.containerRef,
      strategy,
    } : undefined,
    navigation: options.navigation,
  });
}

function createCodapComponentStrategy(opts): FocusTrapStrategy {
  return {
    getElements: () => ({
      content: opts.contentRef.current,
      inspector: opts.inspectorRef.current,
    }),
    onEnter: () => codapStore.setFocusedComponent(opts.componentId),
    onExit: () => codapStore.setFocusedComponent(null),
    cycleOrder: ["inspector", "content"],  // CODAP's order differs from CLUE
    announceEnter: `Editing ${opts.componentType}. Press Escape to exit.`,
    announceExit: `Exited ${opts.componentType}.`,
  };
}
```

**What lives where:**

| Layer | Handles | Location |
|---|---|---|
| Generic package | All keyboard mechanics: Tab cycling, Enter/Escape, arrow nav, announcements, resize, focus rings, capture-phase listeners for portaled elements | `@concord-consortium/accessibility-tools` |
| FocusTrapStrategy | Element discovery, cycle order, enter/exit lifecycle, announcement text, external element registration | Provided by each app |
| App wrapper | Translates app concepts (tiles, components, stores) into strategy objects; provides app-specific defaults and types | `useClueAccessibility` in [CLUE](https://github.com/concord-consortium/collaborative-learning), `useCodapAccessibility` in [CODAP](https://github.com/concord-consortium/codap) |

## Debug Sidebar

The `@concord-consortium/accessibility-tools` package includes an optional debug sidebar component. It communicates with the `useAccessibility` hook via a React context.

**Integration:**

```typescript
// In any CC app's root component:
import { AccessibilityProvider } from "@concord-consortium/accessibility-tools/hooks";
import { AccessibilityDebugSidebar } from "@concord-consortium/accessibility-tools/debug";

function App() {
  const debugA11y = new URLSearchParams(location.search).has("debugA11y");
  return (
    <AccessibilityProvider debug={debugA11y}>
      <div className="app-layout">
        <AppContent />
        {/* Sidebar reads from context; renders nothing when debug is false */}
        <AccessibilityDebugSidebar />
      </div>
    </AccessibilityProvider>
  );
}
```

The provider and sidebar are separate components so apps control where the sidebar appears in their layout (e.g., alongside other debug UI components the app may render). The provider takes a single `debug` boolean. When `false`, the context is a no-op - zero overhead (no event listeners, no state tracking) and the sidebar renders nothing. When `true`, the provider attaches DOM observers and every `useAccessibility` instance reports its state to the context. The app controls how `debug` is determined (query param, localStorage, dev mode flag, etc.) and handles any layout adjustments needed to accommodate the sidebar.

**Standalone injection mode:**

The sidebar can also run as a standalone script injected into any page - no React provider, no build step, no source code access needed. This is useful for QA auditing third-party sites, reviewing deployed apps without rebuilding, or quick checks on any web page.

```html
<!-- Bookmarklet or script injection: -->
<script src="https://unpkg.com/@concord-consortium/accessibility-tools/standalone.js"></script>
```

Or as a bookmarklet:
```javascript
javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://unpkg.com/@concord-consortium/accessibility-tools/standalone.js'})))
```

When injected, the script:
- Creates its own React root in a new `<div>` appended to `document.body`
- Renders the sidebar as a fixed-position panel on the right edge (`position: fixed; right: 0; top: 0; width: 350px; height: 100vh; z-index: 2147483647`)
- Injects its own scoped styles (no CSS conflicts with the host page)
- All 24 DOM-based panels work immediately (they observe the host page's DOM)
- Hook-enhanced panels (Focus Trap State, Navigation State, Custom App Log) show "Standalone mode - hook reporting unavailable" since there's no `AccessibilityProvider` context
- A collapse/expand toggle on the left edge of the sidebar minimizes it to a small tab
- A close button removes the sidebar and cleans up all observers/listeners

**Three distribution modes:**

| Mode | How | DOM panels | Hook panels | Overlay toggles | WCAG Audit |
|---|---|---|---|---|---|
| **Integrated** (React provider) | `<AccessibilityProvider>` + `<AccessibilityDebugSidebar>` | yes | yes | yes | yes |
| **Standalone** (script injection) | `<script src="standalone.js">` or bookmarklet | yes | no (no context) | yes | yes |
| **Browser extension** (future) | Chrome/Firefox extension | yes | no (no context) | yes | yes |

The standalone bundle is built as a separate entry point (`standalone.js`) that includes React and the sidebar in a single self-contained file (~150-200KB gzipped). It uses Shadow DOM for style isolation so the sidebar's CSS doesn't leak into the host page and vice versa.

**Local Headless Audit:**

The audit engine (panel 24) is also available as a CLI tool that runs against a URL using Playwright, outputs the markdown report, and exits with a non-zero code if failures exceed a threshold:

```bash
# Audit and fail if any violations (CI gate)
npx cc-a11y-tools audit http://localhost:8080 --level AA --max-failures 0

# Audit a specific component via selector
npx cc-a11y-tools audit http://localhost:8080 --level AA --scope "[data-testid='bar-graph']"

# Report only - always exits 0, just outputs the markdown (non-blocking CI)
npx cc-a11y-tools report http://localhost:8080 --level AA --output report.md
```

Two CLI commands:
- **`audit`** - exits with code 1 if failures exceed `--max-failures`. Use as a CI gate.
- **`report`** - always exits 0 regardless of failures. Outputs the markdown report to stdout or `--output` file. Use for progress tracking, PR comments, or non-blocking CI jobs.

In CI, the pipeline starts the dev server (or serves a production build) before running the command - same pattern as Cypress E2E tests:

```yaml
# GitHub Actions example
- run: npm run build && npx serve -s build -l 8080 &
- run: npx @concord-consortium/accessibility-tools audit http://localhost:8080 --level AA --max-failures 0
```

**Playwright/Cypress Test Plugin:**

Exposes accessibility assertions for E2E tests using the same audit engine:

```typescript
// Playwright
import { a11yMatchers } from "@concord-consortium/accessibility-tools/playwright";
expect.extend(a11yMatchers);

// Assertion - fails the test if audit has failures
await expect(page).toPassA11yAudit({ level: "AA" });
await expect(page.locator("[data-testid='bar-graph']")).toPassA11yAudit({ level: "AA" });

// Report only - logs the markdown report but never fails the test
const report = await page.generateA11yReport({ level: "AA" });
// report.markdown - full markdown string
// report.failures - number of failures
// report.warnings - number of warnings

// Write report as a test artifact
const report = await page.generateA11yReport({
  level: "AA",
  outputPath: "test-results/a11y/bar-graph.md",  // writes markdown file
});

// Cypress
import "@concord-consortium/accessibility-tools/cypress";

// Assertion - fails the test if audit has failures
cy.get("[data-testid='bar-graph']").should("passA11yAudit", { level: "AA" });

// Report only - logs the markdown report but never fails the test
cy.generateA11yReport({
  level: "AA",
  outputPath: "cypress/reports/a11y/bar-graph.md",
}).then(report => {
  cy.log(`${report.failures} failures, ${report.warnings} warnings`);
});
```

Two operations per framework:
- **`toPassA11yAudit` / `passA11yAudit`** - assertion. Fails the test on violations. Prints the full markdown report as the error message so the developer sees exactly what failed and how to fix it.
- **`generateA11yReport`** - report only. Returns the audit results without failing. Useful for logging, tracking progress over time, or generating reports in a CI job that shouldn't gate merges yet.

**Package entry points:**

| Entry point | Purpose | Includes React | Use case |
|---|---|---|---|
| `@concord-consortium/accessibility-tools/hooks` | `useAccessibility` + `AccessibilityProvider` | peer dep | React app integration |
| `@concord-consortium/accessibility-tools/debug` | `AccessibilityDebugSidebar` component | peer dep | React app debug sidebar |
| `@concord-consortium/accessibility-tools/standalone.js` | Self-contained injectable | bundled | Bookmarklet, script tag, any page |
| `@concord-consortium/accessibility-tools/audit` | Headless audit engine | no | CI/CD, Node.js scripts |
| `@concord-consortium/accessibility-tools/playwright` | Playwright matchers | no | Playwright E2E tests |
| `@concord-consortium/accessibility-tools/cypress` | Cypress commands | no | Cypress E2E tests |

**Entry point dependency graph:**

```
                    ┌───────────┐
                    │   /audit  │  ← core audit engine (pure JS, no React)
                    │           │     DOM traversal, WCAG checks, report generation
                    └─────┬─────┘
                          │ used by
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌────▼────┐   ┌──────▼──────┐
    │  /hooks   │   │  /debug │   │/standalone.js│
    │           │   │         │   │              │
    │useAccess- │   │Sidebar  │   │Self-contained│
    │ibility,  │   │component│   │injectable    │
    │Provider,  │◄──┤reads    │   │bundles /audit│
    │useFocus-  │   │from     │   │+ /debug +    │
    │Trap, etc  │   │Provider │   │React         │
    └─────┬─────┘   │context  │   └──────────────┘
          │         └─────────┘
          │ used by
    ┌─────▼──────────────────┐
    │ App wrappers           │
    │ (useClueAccessibility, │
    │  useCodapAccessibility) │
    │ in each app's repo     │
    └────────────────────────┘

    ┌─────────────┐   ┌──────────────┐
    │ /playwright │   │  /cypress    │
    │             │   │              │
    │ imports     │   │ imports      │
    │ /audit      │   │ /audit       │
    └─────────────┘   └──────────────┘
```

| Entry point | Depends on | Depended on by |
|---|---|---|
| `/audit` | nothing (leaf) | `/hooks`, `/debug`, `/standalone.js`, `/playwright`, `/cypress` |
| `/hooks` | `/audit` (for `useAccessibility` to report to debug context) | `/debug`, app wrappers (`useClueAccessibility`, etc.) |
| `/debug` | `/hooks` (reads from `AccessibilityProvider` context), `/audit` (runs audits from sidebar) | `/standalone.js` |
| `/standalone.js` | `/debug`, `/audit`, React (all bundled) | nothing (self-contained) |
| `/playwright` | `/audit` | nothing (consumer-facing) |
| `/cypress` | `/audit` | nothing (consumer-facing) |

Key implications:
- `/audit` is the foundation - it has zero React dependency and can run in Node.js. All other entry points depend on it.
- `/hooks` depends on `/audit` only for wiring audit results into the debug context. If debug is off, the `/audit` code is never executed at runtime (tree-shakeable).
- `/standalone.js` bundles everything (including React) into a single file. It's the only entry point with no peer dependencies.
- `/playwright` and `/cypress` are thin wrappers around `/audit` - they add test framework integration but no new audit logic.
- App wrappers (`useClueAccessibility`) live in each app's repo, not in the package. They import from `/hooks`.

**Sidebar layout:**

The sidebar uses a two-level navigation: horizontal category tabs across the top, and a narrow vertical icon strip on the left within each category to select the panel. This avoids tabs-within-tabs and keeps the content area wide (~270px in a 300px sidebar).

```
┌─────────────────────────────────────┐
│ cc-a11y-tools                v0.0.1 │  ← header
├─────────────────────────────────────┤
│  Checks  │  Tools  │  Hooks        │  ← horizontal category tabs (3 tabs)
├──┬──────────────────────────────────┤
│📊│                                  │
│📋│  Panel content fills this area   │  ← vertical icons (scrollable for
│🏷│  (~270px wide)                   │     10+ panels in Checks tab)
│🎨│                                  │
│📷│                                  │
│🔗│  Overview panel (landing) shows  │
│🛡│  0-100 score + check cards       │
│🗺│                                  │
│📄│                                  │
│👆│                                  │
│⏸│                                  │
├──┴──────────────────────────────────┤
│  🔢  🎨  🎯  📡  ≡  📱  💧  ?  ✕  │  ← overlay toggles + help + clear
└─────────────────────────────────────┘
```

The layout has two zones:
- **Top:** category tabs + icon strip + panel content (the main workspace)
- **Overlay strip:** toggle buttons for page overlays, info help (?), and clear highlight (X)

The Checks tab has 11 panels (Overview + 10 checks) so the icon strip scrolls with `overflow-y: auto`. The Tools tab has 13 panels. The Hooks tab has 3. Icons use [Heroicons](https://heroicons.com/) (outline style) with hover tooltips for labels.

The "Audit Page" and "Audit Sidebar" buttons live in the Overview panel (not in a footer). The footer has been removed.

**Category → panel → icon mapping:**

| Category | Panel | Heroicon |
|---|---|---|
| **Checks** | Overview (landing - score dashboard) | `chart-bar` |
| | Heading Hierarchy | `bars-arrow-down` |
| | Form Label Checker | `tag` |
| | Color Contrast Checker | `swatch` |
| | Image Audit | `photo` |
| | Link & Button Audit | `link` |
| | ARIA Validation | `shield-check` |
| | Landmark Summary | `map` |
| | Duplicate ID Detector | `document-duplicate` |
| | Touch Target Size | `cursor-arrow-rays` |
| | Reduced Motion | `play-pause` |
| **Tools** | Element Inspector | `magnifying-glass` |
| | Live Focus Tracker | `eye` |
| | Keyboard Event Log | `command-line` |
| | Screen Reader Text Preview | `chat-bubble-left` |
| | ARIA Tree View | `bars-3` |
| | Tab Order Overlay | `hashtag` |
| | Announcements Log | `megaphone` |
| | Live Region Inventory | `signal` |
| | Focus History Log | `clock` |
| | Focus Loss Detector | `exclamation-triangle` |
| | Focus Trap Detector | `lock-closed` |
| | Focus Order Recorder | `list-bullet` |
| | WCAG Audit Report | `clipboard-document-check` |
| **Hooks** | Focus Trap State | `arrows-right-left` |
| | Navigation State | `arrows-up-down` |
| | Custom App Log | `code-bracket` |

| **Overlay Toggles** (outline = off, filled = active) | | |
|---|---|---|
| | Tab Order | `hashtag` |
| | Contrast Ratios | `paint-brush` |
| | Touch Targets | `cursor-arrow-rays` |
| | Live Regions | `signal` |
| | Text Spacing | `bars-3` (horizontal) |
| | Reflow Test (disabled - standalone only) | `device-phone-mobile` |
| | Forced Colors | `eye-dropper` |

| **Overlay Strip Utility Buttons** | | |
|---|---|---|
| | Help (?) - toggles overlay descriptions | text "?" |
| | Clear highlight (X) | `x-mark` |

The Hooks tab is grayed out until hooks are adopted (Phase 3). It shows "No hooks registered" when selected, and its icon strip panels activate automatically as hooks report state.

**Overview panel (Checks tab landing page):**

The Overview panel is the default view when the sidebar opens. It displays:
- A large 0-100 accessibility score (colored green/yellow/red)
- Rescan, Explain, and Export buttons
- A list of check cards, one per check module, each showing its own score, error/warning counts
- Clicking a check card navigates to that check's panel
- "Audit Page" and "Audit Sidebar" buttons at the bottom
- The Explain button toggles a breakdown of how each score was calculated

The scoring system weights issues by severity (errors=10, warnings=3) and WCAG level (A=3x, AA=2x, AAA=1x), normalized by item count. The overall score is the average of all check scores. The scoring logic lives in `src/debug/checks/scoring.ts` for reuse by the CLI audit command.

The "Export" button copies a markdown audit report to the clipboard with per-check tables showing issues, severity, WCAG criteria, and fix instructions.

**Sidebar accessibility (the sidebar itself must be fully WCAG compliant):**

- Category tabs use `role="tablist"` / `role="tab"` with Arrow Left/Right navigation
- Icon strip uses `role="tablist"` / `role="tab"` with `aria-orientation="vertical"` and Arrow Up/Down navigation
- Every icon has `aria-label` (e.g., "Focus Tracker", "ARIA Validation") - not just hover tooltips
- Panel content areas are `role="tabpanel"` with `aria-labelledby` pointing to the active icon
- Log panels (Keyboard Event Log, Announcements Log, Focus History) are `role="log"` with `aria-live="polite"` so screen readers announce new entries
- Audit footer button is a native `<button>` with `aria-label="Run WCAG audit on entire page"`
- All interactive elements (buttons, toggles, links) are keyboard-operable
- Color contrast in the sidebar meets WCAG AA (4.5:1) in both light and dark themes
- Focus indicators visible on all sidebar controls
- The sidebar excludes itself from all panel observations by default (e.g., the Tab Order Overlay doesn't number sidebar elements, the Focus Tracker ignores focus within the sidebar, the ARIA Validation doesn't flag sidebar internals, the Keyboard Event Log filters out key events targeting sidebar elements). This is implemented by checking if the target element is inside the sidebar's root container before reporting. This avoids noise and infinite recursion.
- A persistent "Audit Sidebar" button in the footer (next to "Audit Page") temporarily removes the self-exclusion filter and runs the WCAG Audit Report against the sidebar's own DOM subtree. The report is copied to clipboard like any other audit. After the audit completes, the self-exclusion filter is restored. This is how we verify the sidebar itself is WCAG compliant without the sidebar's internals polluting normal app debugging.

**Sidebar panels:**

The panels are split into two tiers. **DOM-based panels** (Phase 0a) work on any app immediately using browser APIs and DOM observation - no hook adoption required. **Hook-enhanced panels** (Phase 0b+) light up progressively as `useAccessibility` hooks are adopted in later phases.

**React component name resolution:** In development builds, React attaches fiber nodes to DOM elements via `__reactFiber$<randomKey>` properties. The sidebar walks up the fiber tree to find the nearest function/class component and reads `type.displayName || type.name`. This means every panel that shows an element can also show its React component name (e.g., "ToolbarButton" instead of just `<button class="tool-button">`). In production builds, component names are minified and will show as the minified name or "Unknown" - this is a development-only tool so that's acceptable. This technique is the same one React DevTools uses internally.

### DOM-Based Panels (Phase 0a - works on any app immediately)

### 1. Live Focus Tracker
Listens to `document.addEventListener("focusin")` to track the currently focused element:
- React component name + tag name, id, class, `role`, `aria-label`, `tabIndex`
- Breadcrumb path from document root to focused element (component names shown where available)
- Highlights the focused element in the page with an overlay outline
- Updates on every `focusin` event
- **Hook-enhanced (Phase 1+):** also shows which focus trap owns the element and which slot it maps to (e.g., "toolbar" in title→toolbar→content)

### 2. Keyboard Event Log
Global `document.addEventListener("keydown", ..., true)` in capture phase. Last 50 events with:
- Key name (e.g., `Tab`, `Escape`, `ArrowDown`)
- Modifier keys (Shift, Ctrl/Cmd, Alt)
- Target element (React component name, tag, id, role)
- Whether `preventDefault()` was called (detected by monkey-patching `Event.prototype.preventDefault`)
- Whether `stopPropagation()` was called (same technique)
- Color-coded: red = prevented/stopped, yellow = propagated normally
- **Hook-enhanced (Phase 1+):** also shows which accessibility hook consumed the event (green = handled by hook, yellow = app code, red = blocked)

Critical for debugging the conflicts identified in each tile (RDG Tab hijacking, Chakra Escape, dnd-kit arrow interception, etc.).

### 3. Announcements Log (passive)
Uses a `MutationObserver` on all `[aria-live]` elements to detect text content changes:
- Timestamp
- Announcement text
- Politeness level (`polite` or `assertive`)
- Which `aria-live` element changed (React component name, tag, id)
- Duration before text was cleared

Works with any announcement mechanism - React state, direct DOM manipulation, third-party libraries. Catches existing CLUE announcements (tile-component's `srAnnounce`, voice typing overlays, toolbar button announcements) without any code changes. The log persists even after announcements are cleared from the DOM.

This is the most valuable panel for sighted developers - screen reader output is invisible without it.

- **Hook-enhanced (Phase 1+):** also shows the source hook/component name when announcements come from `useSelectionAnnouncer` or `debug.reportAnnouncement()`

### 4. Tab Order Overlay
Toggle that queries all tabbable elements (`[tabindex], a, button, input, select, textarea`), filters to visible/enabled, sorts by browser tab order rules, and renders numbered badges:
- Shows the actual sequential tab order as the browser sees it
- Numbers update in real-time as elements mount/unmount
- Elements with `tabIndex="-1"` (programmatically focusable only) shown with dashed borders
- Highlights tab order violations (e.g., positive tabIndex values, skipped elements)
- **Hook-enhanced (Phase 1+):** focus trap boundaries shown with colored borders

### 5. Element Inspector
Click any element in the Focus Tracker to inspect:
- Full ARIA attribute dump: `role`, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-pressed`, `aria-disabled`, `aria-live`, `aria-selected`, `aria-checked`, `aria-haspopup`, `aria-controls`, `aria-owns`
- `tabIndex` value and whether element is in the natural tab order
- Computed accessible name (via `computedRole` and `computedLabel` if available)
- Missing attributes highlighted in red (e.g., interactive element with no `aria-label`)
- React component name and fiber path (e.g., `App > Workspace > TileComponent > ToolbarButton`)

### 6. ARIA Tree View
Walks the DOM from a configurable root and builds a collapsible tree of all elements with ARIA roles, labels, and states. Like a stripped-down accessibility tree inspector:
- Shows the semantic structure screen readers see
- Elements without roles shown in gray, role-bearing elements highlighted
- Expandable nodes show aria attributes inline
- Filters: show all elements, or only role-bearing elements

### 7. Focus Trap Detector (heuristic)
Observes focus movement patterns via the `focusin` event stream:
- If focus repeatedly cycles between N elements without leaving, flags it as a likely focus trap
- Shows the detected cycle (element list) and cycle count
- Useful for verifying existing traps work correctly before hook migration
- **Hook-enhanced (Phase 1+):** replaced by the richer Focus Trap State panel with strategy details

### 8. Color Contrast Checker
Uses `getComputedStyle()` to read foreground and background colors on text elements and calculates WCAG contrast ratios:
- Scans visible text elements on the page (runs on load + MutationObserver for dynamic content)
- Flags failures against WCAG AA (4.5:1 normal text, 3:1 large text) and AAA (7:1 / 4.5:1)
- Shows each failure: element, React component name, computed colors, actual ratio, required ratio
- Color swatches for visual reference
- Click to highlight the failing element in the page

### 9. Heading Hierarchy Validator
Queries all `h1`-`h6` elements and validates the document outline:
- Shows the heading tree as an indented outline
- Flags skipped levels (e.g., `h1` → `h3` with no `h2`)
- Flags multiple `h1` elements (should be exactly one per page)
- Flags missing headings (sections with no heading)
- Each heading shows its text, level, and React component name

### 10. ARIA Validation
Flags common ARIA misuse that browsers silently ignore but screen readers struggle with:
- `aria-label` on a non-interactive element without a `role`
- Invalid `role` values (not in the WAI-ARIA spec)
- `aria-required`, `aria-checked`, `aria-selected` on elements where they don't apply
- `aria-labelledby` or `aria-describedby` pointing to a non-existent id
- `aria-expanded` without keyboard support on the controlling element
- `aria-hidden="true"` on a focusable element (creates an invisible trap)
- Nested interactive elements (e.g., `<button>` inside `<a>`)
- Shows severity (error vs warning) and links to the relevant WAI-ARIA rule

### 11. Touch Target Size Checker
Measures the bounding box of interactive elements and flags undersized targets:
- Checks against WCAG 2.5.8 thresholds: Level AA (24x24px), Level AAA (44x44px)
- Overlays colored borders on flagged elements (red = below AA, yellow = below AAA)
- Shows element, computed size, and the gap to minimum
- Relevant for touch/mobile accessibility and WCAG 2.5.8 compliance

### 12. Form Label Checker
Detects form controls without accessible labels:
- `<input>`, `<select>`, `<textarea>` without an associated `<label>` (via `for`/`id` or wrapping)
- Form controls missing `aria-label` or `aria-labelledby` as fallback
- Flags placeholder-only labels (placeholder is not a substitute for a label)
- Shows the element, its type, and what labeling is missing

### 13. Focus Order Recorder
Interactive tool for QA regression testing:
- "Record" button starts capturing the sequence of elements that receive focus as the tester tabs through
- Produces a numbered list with component name, tag, role, and aria-label for each stop
- "Stop" saves the recording with a timestamp
- "Compare" diffs two recordings to show what changed (added stops, removed stops, reordered)
- Recordings can be exported as JSON for inclusion in test documentation
- Useful for verifying a PR didn't unintentionally change tab order

### 14. Screen Reader Text Preview
Shows what a screen reader would announce for the currently focused element:
- Computes the accessible name following the WAI-ARIA accessible name computation spec
- Shows: `"{accessible name}", {role}, {states}` (e.g., `"Submit", button, disabled`)
- Updates live as focus moves
- Helps developers verify screen reader behavior without launching an actual screen reader
- Flags when the computed name is empty (screen reader would announce nothing or just the role)

### 15. Focus Loss Detector
Monitors for focus silently falling to `document.body` - one of the most common a11y bugs:
- Watches for `focusin` on `document.body` when the previous `activeElement` was a specific element
- Shows a warning with: the element that *was* focused (React component name, tag, id), the likely cause (element removed from DOM, `display:none` applied, `disabled` set), and a timestamp
- Common triggers: modal closes without returning focus, list item deleted while focused, component unmounts during keyboard nav, `disabled` set on the active element
- Warnings persist in a log so transient focus losses aren't missed
- Each warning is clickable - if the previously-focused element's parent still exists, highlights it

### 16. Duplicate ID Detector
Scans the DOM for duplicate `id` attributes that silently break ARIA associations:
- `aria-labelledby`, `aria-describedby`, `aria-controls`, and `<label for="...">` all resolve to the first matching ID - duplicates are silently ignored
- Shows each duplicate: the ID value, all elements sharing it (React component name, tag), and which ARIA references are affected
- Very common in apps that render lists of components where IDs aren't scoped (e.g., `id="title"` in every tile)
- MutationObserver keeps the check live as components mount/unmount

### 17. Reduced Motion Indicator
Shows whether `prefers-reduced-motion: reduce` is active and audits animation compliance:
- Indicator in sidebar header showing current motion preference
- Scans stylesheets for CSS animations and transitions
- Flags any that don't have a `@media (prefers-reduced-motion: reduce)` override
- Helps verify the app respects user motion preferences per WCAG 2.3.3

### 18. Focus History Log
Passive reverse-chronological log of all focus movement (layout matches other log panels):
- Each row: colored dot (by React component), component name, tag, relative timestamp, and duration the element held focus before the next event
- Color coding makes patterns visible: rapid alternation between two colors = focus bouncing, gray rows = focus on `document.body` (focus loss)
- Duration bars on the right side of each row - wide = held focus for seconds, sliver = millisecond bounce. Reads left-to-right: identity (dot + name) → metric (duration)
- Complements panel 1 (Live Focus Tracker shows *current* focus) and panel 13 (Focus Order Recorder captures *intentional* Tab-throughs) - this captures *all* focus movement passively
- Click any row to inspect that element in the Element Inspector (panel 5)

### 19. Contrast Overlay Mode
Toggle that overlays the computed contrast ratio directly on every text element in the app:
- Small badge on each text element showing the ratio (e.g., `4.5:1`)
- Color-coded: green = passes AA+AAA, yellow = passes AA only, red = fails AA
- Faster than the Contrast Checker panel for a full-page visual scan - just look at the page
- Badges reposition on scroll/resize
- Click a badge to inspect that element in the Element Inspector (panel 5)

### 20. Landmark Summary
Focused quick-pass view of the page's landmark structure:
- Lists all landmark elements: `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<section>`, `<form>` (with accessible names)
- Flags: missing `<main>` (required), multiple `<main>` elements, landmarks without accessible labels, `<section>` without a heading
- Shows a simple outline of the landmark nesting - faster than the full ARIA Tree View for a landmark check
- WCAG experts check landmarks first before diving deeper

### 21. Live Region Inventory + Overlay
Lists all `aria-live` regions currently in the DOM and provides a visual overlay mode:
- **Inventory panel:** all `aria-live` elements with: politeness level (`polite`/`assertive`/`off`), current text content, React component name, whether the region is empty or populated
- Flags: competing regions (multiple `assertive` regions that could interrupt each other), `aria-live` on elements with large subtrees (performance risk), `aria-live="off"` that may be suppressing intended announcements
- **Overlay toggle:** highlights all live regions on the page with colored borders (blue = polite, orange = assertive, gray = off) and a label badge showing the politeness level
- When a live region's content changes, the overlay border flashes/pulses so you can visually see announcements firing in context - matches the text change to its physical location on the page
- Complements the Announcements Log (panel 3) which shows a chronological text log - this overlay shows *where* the regions are spatially

### 22. Image Audit
Lists all images and image-like elements on the page:
- Covers `<img>`, `<svg>` (with `role="img"`), `<canvas>`, `<picture>`, elements with CSS `background-image`
- Categorizes each as: has alt text (green), decorative with `aria-hidden` or `alt=""` (gray), or missing accessibility (red)
- Shows thumbnails alongside the audit results for quick visual identification
- Flags: generic alt text ("image", "photo", "icon"), alt text longer than 125 characters (should use `aria-describedby` instead), `<svg>` without `role="img"` and `aria-label`

### 23. Link & Button Text Audit
Lists all links and buttons with their computed accessible name:
- Flags: empty accessible name, generic text ("click here", "read more", "link", "button", "submit"), duplicate link text pointing to different `href` destinations
- Flags icon-only buttons/links without `aria-label`
- Groups by accessible name to show duplicates at a glance
- WCAG 2.4.4 (Link Purpose in Context) and 2.4.9 (Link Purpose Link Only) in one scan

### Overlay Toggles (in the overlay strip, not panels)

These are toggles in the overlay strip above the footer. They inject/remove CSS overrides on the app content and are independent of the active panel.

**Tab Order Overlay:** Numbered badges on every tabbable element showing sequential tab order. Described in panel 4.

**Contrast Overlay:** Ratio badges on every text element. Described in panel 19.

**Touch Target Overlay:** Colored borders on undersized interactive elements. Described in panel 11 (Touch Target Size Checker - the panel shows the list, the overlay shows them in-page).

**Live Region Overlay:** Colored borders on `aria-live` elements with flash on content change. Described in panel 21.

**Text Spacing Override:** Injects WCAG 1.4.12 text spacing overrides to test for clipping/overflow:
- Line height: 1.5x the font size
- Paragraph spacing: 2x the font size
- Letter spacing: 0.12em
- Word spacing: 0.16em
- Visually scan the app for text that clips, overlaps, or disappears - these are 1.4.12 failures
- Very commonly failed criterion, tedious to test manually without this toggle

**Reflow Test:** Constrains the app content area to a narrow width to test WCAG 1.4.10 reflow (no horizontal scrolling at 400% zoom):
- Presets: 320px (WCAG reference: 1280px @ 400% zoom), 256px (1024px @ 400%), or custom width
- Clicking the toggle cycles through presets; long-press or right-click opens custom width input
- Scan for horizontal scrollbars, content overflow, or elements that don't reflow into a single column

**Forced Colors Mode:** Simulates Windows High Contrast Mode by applying `forced-colors: active` CSS override:
- Strips custom background colors, text colors, and border colors
- Applies system high-contrast palette (typically white on black or black on white)
- Reveals UI elements that disappear when custom colors are removed: icon-only buttons without borders, states conveyed only by color (selected tabs, active tools), focus indicators using only background color
- Tests WCAG 1.4.11 Non-text Contrast in forced-colors context

### 24. WCAG Audit Report Generator
Generates a scoped WCAG compliance report for any component in the React tree:
- In the ARIA Tree View (panel 6), each component node has an "Audit" button
- Clicking it runs all automated checks (panels 8-14) against that component's DOM subtree
- Produces a markdown document organized by WCAG success criterion:

```markdown
## WCAG Audit: TileComponent (bar-graph)
Generated: 2026-04-02 14:30

### Passing (8 criteria)
- 1.3.1 Info and Relationships (Level A)
- 1.3.2 Meaningful Sequence (Level A)
- 2.4.1 Bypass Blocks (Level A)
- 2.4.2 Page Titled (Level A)
- 2.4.6 Headings and Labels (Level AA)
- 2.4.7 Focus Visible (Level AA)
- 3.3.2 Labels or Instructions (Level A)
- 4.1.2 Name, Role, Value (Level A)

### 1.1.1 Non-text Content (Level A) - 2 failures
| Element | Issue | Fix |
|---|---|---|
| `<rect>` in ChartArea | SVG bar has no accessible name | Add `role="img"` and `aria-label` describing the bar value |
| `<svg>` in ChartArea | SVG container has no description | Add `role="img"` and `aria-label` describing the chart |

### 1.4.3 Contrast Minimum (Level AA) - 1 failure
| Element | Issue | Fix |
|---|---|---|
| `.axis-label` in EditableAxisLabel | Contrast ratio 3.2:1 (requires 4.5:1) | Change text color from #999 to #767676 or darker |

### 2.1.1 Keyboard (Level A) - 3 failures
| Element | Issue | Fix |
|---|---|---|
| `<rect>` in ChartArea | onClick with no onKeyDown | Add onKeyDown handler for Enter/Space |
| `<rect>` in EditableAxisLabel | onClick with no keyboard activation | Add role="button", tabIndex={0}, onKeyDown |
| `<a>` in LegendArea | Non-semantic interactive element | Convert to `<button>` element |

### 2.5.8 Target Size (Level AAA) - 1 warning
| Element | Issue | Fix |
|---|---|---|
| `.color-menu-button` in LegendColorRow | 20x20px (minimum 24x24px for AA) | Increase button size or add padding |

### Summary: 8 passing, 6 failures, 1 warning across 12 criteria
```

- **Scope levels:** audit a single component, a tile, a panel, or the entire app
- **WCAG criteria covered** (automatable subset):
  - 1.1.1 Non-text Content (images/SVG without alt/aria-label)
  - 1.3.1 Info and Relationships (heading hierarchy, form labels, ARIA roles)
  - 1.3.2 Meaningful Sequence (DOM order vs visual order)
  - 1.4.3 Contrast Minimum (color contrast ratios)
  - 1.4.11 Non-text Contrast (UI component contrast)
  - 2.1.1 Keyboard (interactive elements without keyboard handlers)
  - 2.4.1 Bypass Blocks (skip links presence)
  - 2.4.2 Page Titled (document title)
  - 2.4.6 Headings and Labels (descriptive headings)
  - 2.4.7 Focus Visible (focus indicator presence)
  - 2.5.8 Target Size (touch target dimensions)
  - 3.3.2 Labels or Instructions (form field labels)
  - 4.1.2 Name, Role, Value (ARIA attributes, semantic HTML)
- **Fix instructions** are specific and actionable - not just "add aria-label" but "add `aria-label` describing the bar value, e.g., `aria-label={`${category}: ${value}`}`"
- **Export:** copies markdown to clipboard automatically when invoked, with a toast confirmation. Also available as download `.md` file.
- **Audit button placement** - the audit icon appears in multiple places, each scoping to a different subtree:
  - **Sidebar header:** "Audit Page" button - runs against the entire document root
  - **ARIA Tree View (panel 6):** next to each component node - audit that subtree
  - **Live Focus Tracker (panel 1):** next to the focused element's component - audit from that component down
  - **Element Inspector (panel 5):** at the top of the inspector view - audit the inspected component's subtree
  All four use the same audit engine, just with different root elements.
- **CI integration potential:** the audit engine can be exposed as a function for headless testing:
  ```typescript
  import { runWcagAudit } from "@concord-consortium/accessibility-tools/audit";
  const report = runWcagAudit(containerElement, { level: "AA" });
  expect(report.failures).toHaveLength(0);
  ```

Note: automated tools can only catch ~30-40% of WCAG issues. The report includes a disclaimer listing criteria that require manual testing (e.g., 1.3.3 Sensory Characteristics, 2.4.3 Focus Order correctness, 3.1.1 Language of Page).

### Hook-Enhanced Panels (Phase 0b+ - activate as hooks are adopted)

These panels appear in the sidebar but show "No hooks registered" until components adopt `useAccessibility`. They light up automatically as hooks report state via the debug context.

### 8. Focus Trap State
For each active focus trap instance (reported by `useFocusTrap`):
- Strategy name / component name
- Current state: idle, entered, or exited
- Cycle order (e.g., `["title", "toolbar", "content"]`) with the current slot highlighted
- Elements in each slot (tag, id, aria-label) - grayed out if element is null/unmounted
- External elements (portaled toolbar, etc.)
- Enter/exit event log with timestamps

### 9. Navigation State
For each active `navigation` config (reported by `useKeyboardNav`):
- Item selector and orientation
- Active index / total items
- Item labels (from `getItemProps` aria-label)
- Focus ring enabled/disabled
- Visual minimap of navigable items with the active one highlighted

### 10. Custom App Log
Entries from `a11y.debug?.log()` calls in app code:
- Timestamped messages with optional structured data
- Useful for correlating app events (e.g., "RDG entered edit mode") with focus/keyboard events in other panels

**How hooks report to the sidebar:**

Each hook reads the debug context internally and reports state changes when enabled:

```typescript
// Inside useKeyboardNav (generic package):
export function useKeyboardNav(options?: NavigationConfig) {
  const debug = useAccessibilityContext(); // null if no provider or debug=false
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!options) return;
    // ... normal navigation logic ...
    setActiveIndex(newIndex);

    // Report to sidebar (no-op when debug is null)
    debug?.reportNavState(instanceId, {
      activeIndex: newIndex, totalItems, orientation: options.orientation
    });
  }, [options, debug]);

  // Register/unregister with debug context on mount
  useEffect(() => {
    if (!options || !debug) return;
    debug.registerNav(instanceId, {
      itemSelector: options.itemSelector,
      orientation: options.orientation,
    });
    return () => debug.unregisterNav(instanceId);
  }, [debug, options]);

  if (!options) return null;
  return { activeIndex, handleKeyDown, getItemProps };
}
```

The `useAccessibilityContext()` hook returns `null` when:
- No `AccessibilityProvider` wraps the app
- Provider exists but `debug={false}`

This means every reporting call is just a `?.` null check - zero overhead in production.

**Context interface:**

```typescript
// Internal: hooks use this to report state
interface AccessibilityContext {
  // Instance lifecycle
  registerInstance: (id: string, state: AccessibilityInstanceState) => void;
  unregisterInstance: (id: string) => void;

  // Focus trap events
  reportFocusTrapEvent: (id: string, event: FocusTrapEvent) => void;

  // Navigation state
  registerNav: (id: string, config: { itemSelector: string; orientation: string }) => void;
  unregisterNav: (id: string) => void;
  reportNavState: (id: string, state: { activeIndex: number; totalItems: number }) => void;

  // Announcements
  reportAnnouncement: (text: string, level: "polite" | "assertive", source: string) => void;

  // Keyboard events (captured by a global listener in the provider)
  reportKeyEvent: (event: KeyboardEventReport) => void;

  // App-level custom logging
  log: (message: string, data?: Record<string, unknown>) => void;
}
```

**Exposed in the hook return value:**

The debug object is also exposed in the return value of `useAccessibility` (and `useClueAccessibility`) so app code can report events that the hooks don't know about:

```typescript
interface AccessibilityResult {
  navigation: { ... } | null;
  resize: { ... } | null;
  debug: AccessibilityDebugHandle | null;  // null when debug is off
}

// AccessibilityDebugHandle: the subset of debug context safe for app use
interface AccessibilityDebugHandle {
  // Custom log entry (appears in a "Custom" section of the sidebar)
  log: (message: string, data?: Record<string, unknown>) => void;

  // Report a keyboard event handled outside the accessibility hooks
  reportKeyEvent: (event: KeyboardEventReport) => void;

  // Report a custom announcement made outside useSelectionAnnouncer
  reportAnnouncement: (text: string, level: "polite" | "assertive") => void;
}
```

This lets tiles report events the hooks can't see:

```typescript
const a11y = useClueAccessibility({ type: "tile", focusTrap: { ... } });

// In a custom keyboard handler (e.g., drawing tile's HotKeys dispatch):
function handleCopy() {
  copySelectedObjects();
  a11y.debug?.log("Copied objects via Cmd+C", { count: selectedObjects.length });
}

// In a component with its own aria-live (e.g., voice typing):
function handleTranscript(text: string) {
  setInterimText(text);
  a11y.debug?.reportAnnouncement(text, "polite");
}

// When RDG handles a key internally:
function onSelectedCellChange(cell: CellPosition) {
  a11y.debug?.reportKeyEvent({ key: "Arrow", target: "rdg-cell", handled: "react-data-grid" });
}
```

When `debug` is `null` (no sidebar), all `?.` calls are no-ops.

**Location:** `@concord-consortium/accessibility-tools/debug` (separate entry point to allow tree-shaking when not used)

## Composing with `useClueAccessibility`

Within [CLUE](https://github.com/concord-consortium/collaborative-learning), developers use `useClueAccessibility` (which internally calls the generic `useAccessibility`). The config uses CLUE-specific types - `type: "tile"` requires `focusTrap` with tile API registration; `type: "region"` skips it. Each sub-hook is always invoked (satisfying React's Rules of Hooks) but no-ops when its config key is omitted (`undefined`). Omitted keys are disabled by default, so adding new sub-hooks in the future never requires updating existing consumers.

**CLUE API:**
```typescript
// In a tile component (type: "tile"):
const a11y = useClueAccessibility({
  type: "tile",

  // Required for tiles: translates to a FocusTrapStrategy internally
  focusTrap: {
    onRegisterTileApi,
    onUnregisterTileApi,
    contentRef,
    focusContent,           // optional custom focus fn (Slate, RDG, etc.)
    titleRef,               // optional
    toolbarRef,             // optional - for FloatingPortal toolbars
    tileType,               // for announcement text
    additionalApi,          // other ITileApi methods (export, bounding box, etc.)
  },

  // Optional sub-hooks - omit to disable
  navigation: {
    containerRef,
    itemSelector: "rect.bar",
    orientation: "horizontal",
    onSelect: handleBarClick,
    onFocusChange: (el, i) => { /* announce */ },
    focusRing: true,        // add focus indicators to navigation items
  },
  announcements: {
    selectedItems: selectedBarIds,
    getLabel: (id) => `Bar: ${categories[id]}`,
  },
});

// In a non-tile component (type: "region"):
const a11y = useClueAccessibility({
  type: "region",

  // No focusTrap - this isn't a tile, no tile API to register with
  navigation: {
    containerRef: headerRef,
    itemSelector: ".header-control",
    orientation: "horizontal",
  },
  announcements: {
    selectedItems: expandedMenus,
    getLabel: (id) => `${id} menu expanded`,
  },
});
```

**CLUE type system:**

```typescript
// CLUE wrapper types - enforces tile vs region shape
interface ClueTileOptions {
  type: "tile";
  focusTrap: ClueFocusTrapConfig;       // CLUE-specific: tile API, tileType, toolbarRef
  navigation?: NavigationConfig;         // from generic package
  announcements?: AnnouncementsConfig;   // from generic package
  resize?: ResizableConfig;              // from generic package
}

interface ClueRegionOptions {
  type: "region";
  navigation?: NavigationConfig;
  announcements?: AnnouncementsConfig;
  resize?: ResizableConfig;
}

type ClueAccessibilityOptions = ClueTileOptions | ClueRegionOptions;
```

This means:
- `type: "tile"` requires `focusTrap` - TypeScript errors if you omit it
- `type: "region"` doesn't accept `focusTrap` - TypeScript errors if you include it
- All other keys are optional on both types - omit to disable

**Generic package types** (no app-specific concepts):

```typescript
// @concord-consortium/accessibility-tools
interface AccessibilityOptions {
  focusTrap?: {                          // optional - omit for non-trapped components
    containerRef: RefObject<HTMLElement>;
    strategy: FocusTrapStrategy;          // app provides this
  };
  navigation?: NavigationConfig;
  announcements?: AnnouncementsConfig;
  resize?: ResizableConfig;
}
```

Note: the generic hook has no `type` discriminant - it simply checks whether `focusTrap` is provided. The `type: "tile" | "region"` is a CLUE concept that maps to "focusTrap present" vs "focusTrap absent."

**Return value:**
```typescript
interface AccessibilityResult {
  // From navigation (if enabled)
  navigation: {
    activeIndex: number;
    handleKeyDown: (e: KeyboardEvent) => void;
    getItemProps: (index: number) => AriaProps;  // includes focus ring attrs when focusRing: true
  } | null;

  // From resizable (if enabled)
  resizable: {
    resizeHandleProps: ResizeHandleAriaProps;
  } | null;
}
```

**How the CLUE wrapper delegates to the generic hook:**

```typescript
// CLUE wrapper (src/hooks/use-clue-accessibility.ts)
export function useClueAccessibility(options: ClueAccessibilityOptions) {
  const strategy = options.type === "tile"
    ? createClueTileStrategy(options.focusTrap)
    : undefined;

  return useAccessibility({
    focusTrap: strategy ? {
      containerRef: options.focusTrap.containerRef,
      strategy,
    } : undefined,
    navigation: options.navigation,
    announcements: options.announcements,
    resize: options.resize,
  });
}
```

**Generic hook internals** (`@concord-consortium/accessibility-tools`):

```typescript
export function useAccessibility(options: AccessibilityOptions) {
  // All hooks called unconditionally (Rules of Hooks satisfied).
  // Each receives undefined when omitted and no-ops internally.

  useFocusTrap(options.focusTrap);

  const navigation = useKeyboardNav(options.navigation);

  const announcements = useSelectionAnnouncer(options.announcements);

  const resize = useKeyboardResize(options.resize);

  return { navigation, resize };
}
```

Each individual hook follows this internal pattern:
```typescript
export function useKeyboardNav(
  options?: NavigationConfig    // undefined = disabled
) {
  // State is always allocated (Rules of Hooks)
  const [activeIndex, setActiveIndex] = useState(-1);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!options) return;            // no-op when undefined
    // ... actual arrow/Home/End/Enter logic
  }, [options]);

  // Focus ring props included when options.focusRing is true
  const getItemProps = useCallback((index: number) => {
    if (!options?.focusRing) return {};
    return { tabIndex: index === activeIndex ? 0 : -1, /* aria attrs */ };
  }, [options, activeIndex]);

  if (!options) return null;
  return { activeIndex, handleKeyDown, getItemProps };
}
```

**What this means in practice:**

A [CLUE](https://github.com/concord-consortium/collaborative-learning) tile like bar graph goes from needing multiple hook calls to one:

```typescript
// Before: separate hooks with manual wiring
useFocusTrap({ onRegisterTileApi, contentRef, ... });
const { activeIndex, handleKeyDown } = useKeyboardNav({ containerRef, ... });
useSelectionAnnouncer({ selectedItems, ... });

// After: one call - CLUE wrapper handles strategy creation internally
const a11y = useClueAccessibility({
  type: "tile",
  focusTrap: { onRegisterTileApi, contentRef, tileType },
  navigation: { containerRef, itemSelector: "rect.bar", orientation: "horizontal", focusRing: true },
  announcements: { selectedItems, getLabel: getBarLabel },
});
```

A non-tile [CLUE](https://github.com/concord-consortium/collaborative-learning) component like the header:

```typescript
const a11y = useClueAccessibility({
  type: "region",
  navigation: {
    containerRef: headerRef,
    itemSelector: ".header-control",
    orientation: "horizontal",
  },
});
```

The uber-hook internally wires sub-hooks together (e.g., passing `navigation.activeIndex` to `announcements` automatically) which eliminates even more boilerplate.

**Locations:**
- Generic package: `@concord-consortium/accessibility-tools` (separate repo/npm package)
- CLUE wrapper: `src/hooks/use-clue-accessibility.ts`
- CLUE strategy factory: `src/hooks/create-clue-tile-strategy.ts`

**Components that would use this (with their enabled features):**

| Component | type | focusTrap | navigation | announcements | resizable |
|---|---|---|---|---|---|
| Text tile | tile | yes | - | - | - |
| Table tile | tile | yes | - | yes | - |
| Bar Graph tile | tile | yes | horizontal + focusRing | yes | - |
| Drawing/Sketch tile | tile | yes | vertical + focusRing | yes | - |
| Dataflow tile | tile | yes | grid | yes | - |
| Graph tile | tile | yes | grid + focusRing | yes | - |
| Geometry tile | tile | yes | grid + focusRing | yes | - |
| Numberline tile | tile | yes | horizontal + focusRing | yes | - |
| Image tile | tile | yes | - | - | - |
| AI tile | tile | yes | - | - | - |
| Simulator tile | tile | yes | - | - | - |
| [CLUE](https://github.com/concord-consortium/collaborative-learning) Header | region | - | horizontal | yes | - |
| Teacher Dashboard | region | - | grid | - | - |
| Playback Controls | region | - | horizontal | - | - |
| Thumbnail Browser | region | - | grid | yes | - |

---

The individual hooks are described below. Each can be used standalone or via `useAccessibility`.

## 1. `useFocusTrap` hook

**Problem:** Every tile that needs focus trap integration must implement the same boilerplate: create a ref to the content element, define an optional `focusContent()` function, wire it into the tile API registration via `onRegisterTileApi`, and handle cleanup via `onUnregisterTileApi`. The name "focusTrap" reflects that this registers the tile's content, title, and toolbar elements with the focus trap system (Enter to enter trap, Tab to cycle within, Escape to exit) - not just making them focusable, which all interactive elements should be by default. Currently this is done ad-hoc in each tile (text tile does it in `componentDidMount`, table tile in a `useMemo`+`useEffect`, drawing tile doesn't do it at all).

**Proposed API:**
```typescript
// In any function component tile:
useFocusTrap({
  onRegisterTileApi,
  onUnregisterTileApi,
  contentRef,           // RefObject<HTMLElement> for the main content area
  focusContent?,        // Optional custom focus function (e.g., for Slate, RDG)
  titleRef?,            // Optional ref to title element
  additionalApi?,       // Other ITileApi methods (exportContentAsTileJson, etc.)
});
// Registers the tile's elements with the focus trap system so that
// Enter enters the trap, Tab cycles through title/toolbar/content,
// and Escape exits the trap.
```

**What it encapsulates:**
- The `useMemo` to build the `ITileApi` object including `getFocusableElements()`
- The `useEffect` for register/unregister lifecycle
- Null-safety for refs that aren't mounted yet

**Use cases:** Any component that needs focus trap integration - tile-like containers, modal dialogs, embedded editors, card layouts.

**Location:** `src/hooks/use-focus-trap.ts`

---

## 2. `useKeyboardNav` hook

**Problem:** Multiple components need arrow-key navigation through a collection of non-standard elements: chart bars, canvas objects, node editor blocks, grid cells, toolbar controls. Each would otherwise re-implement the same pattern of tracking a current index, handling ArrowUp/Down/Left/Right, wrapping or clamping at boundaries, and announcing the focused item.

**Proposed API:**
```typescript
const { activeIndex, handleKeyDown } = useKeyboardNav({
  containerRef,         // Ref to the parent element
  itemSelector,         // CSS selector for navigation items (e.g., "rect.bar", "[data-object-id]")
  orientation?,         // "horizontal" | "vertical" | "grid" (determines which arrow keys navigate)
  wrap?,                // Whether to wrap around at boundaries (default: false)
  columns?,             // For grid mode: number of columns (enables Up/Down across rows)
  onSelect?,            // Callback when item is activated (Enter/Space)
  onFocusChange?,       // Callback with element + index when focus moves (for announcements)
});
```

**What it encapsulates:**
- Arrow key handling with configurable orientation
- Index tracking and DOM focus management
- Home/End support for jumping to first/last item
- Enter/Space activation of the current item
- Grid-mode navigation (Left/Right across columns, Up/Down across rows)

**Use cases:** chart bars (horizontal), node editor blocks (grid), canvas objects (vertical list), header controls (horizontal)

This hook can also serve as the lower-level primitive beneath a roving tabindex implementation - the navigation logic (index tracking, Home/End, arrow key direction) overlaps significantly with roving tabindex, which adds `tabIndex` attribute management on top.

**Location:** `src/hooks/use-keyboard-nav.ts`

---

## 3. Focus ring support (folded into `useKeyboardNav`)

Focus ring management for navigation items - including SVG elements where `:focus-visible` support varies - is built into `useKeyboardNav` via the `focusRing: true` option rather than being a separate hook. When enabled, `getItemProps(index)` returns `tabIndex`, `role`, `aria-label`, and a CSS class for styling.

An SCSS mixin provides consistent focus ring appearance:

```scss
// SCSS mixin for focus rings on navigation items (HTML or SVG)
@mixin navigation-focus-ring {
  &:focus-visible, &.keyboard-focused {
    outline: $focus-ring-outer-width solid $focus-ring-color;
    outline-offset: 2px;
  }
}
```

This uses the existing `$focus-ring-color` variable from `vars.scss` and the `.keyboard-focused` class fallback handles SVG elements where `:focus-visible` browser support is inconsistent.

**Use cases:** chart bars, canvas objects, and any component that sets `focusRing: true` in its `navigation` config.

Common pattern in apps: SVG containers have `tabIndex={0}` for receiving keyboard events, but individual SVG elements (points, bars, objects) are not focusable. The `focusRing` option makes them individually focusable with consistent focus indicators.

**Location:** Built into `src/hooks/use-keyboard-nav.ts`, CSS/SCSS in package exports

---

## 4. `useKeyboardResize` hook

**Problem:** Resizable elements (panel dividers, tiles, split panes) typically only support mouse drag. The WAI-ARIA separator pattern (`role="separator"`, `aria-valuenow`, arrow keys) is well-defined but rarely implemented.

**Proposed API:**
```typescript
const { resizeHandleProps, announce } = useKeyboardResize({
  orientation,          // "horizontal" | "vertical"
  value,                // Current size in pixels
  min,                  // Minimum size
  max,                  // Maximum size
  step?,                // Arrow key increment (default: 10)
  largeStep?,           // Shift+Arrow increment (default: 50)
  onResize,             // Callback with new value
  label?,               // aria-label for the handle
});
// Returns props to spread on the resize handle:
// { role: "separator", tabIndex: 0, aria-orientation, aria-valuenow,
//   aria-valuemin, aria-valuemax, aria-label, onKeyDown }
```

**What it encapsulates:**
- WAI-ARIA separator role and value attributes
- Arrow key handling with step/largeStep via Shift modifier
- Screen reader announcements of new dimensions
- Consistent keyboard resize behavior

**Use cases:** tile resize handles, panel dividers, split panes, any drag-to-resize element that needs keyboard accessibility.

**Location:** `src/hooks/use-keyboard-resize.ts`

---

## 5. `useSelectionAnnouncer` hook

**Problem:** Multiple components need to announce selection changes to screen readers: chart bar selection, canvas object selection, grid row/cell selection, node selection. Each would otherwise duplicate the pattern of watching for selection changes and calling `aria-live` announcements.

**Proposed API:**
```typescript
useSelectionAnnouncer({
  selectedItems,        // Observable array or set of selected IDs
  getLabel,             // (id) => string describing the item (e.g., "Bar: Category A, value 42")
  announceRef,          // Ref to an aria-live region, or uses tile's built-in live region
  multiSelectMessage?,  // Template for multi-select (e.g., "{count} items selected")
});
```

**What it encapsulates:**
- MobX reaction or useEffect watching selection changes
- Debounced announcements (avoid rapid-fire during shift-click multi-select)
- Singular vs. plural messaging
- Integration with the tile's existing `aria-live` region (from `tile-component.tsx`)

**Use cases:** chart bar selection, canvas object selection, grid row/cell selection, node selection, any component with selectable items that need screen reader announcements.

Most apps end up with multiple separate `aria-live` implementations, each managing their own announcement lifecycle. This hook unifies the pattern with configurable politeness level, duration, and debouncing.

**Location:** `src/hooks/use-selection-announcer.ts`

---

See [roadmap.md](roadmap.md) for the phased implementation order.
