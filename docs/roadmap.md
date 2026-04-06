# Roadmap

See [design.md](design.md) for the full package architecture, hook APIs, and debug sidebar specification.

The implementation is structured in phases, each building on the previous. All hooks and panels are developed and tested against the package's built-in demo app (a kitchen sink of accessible and inaccessible elements) before any consuming app integrates them.

## Phase 1: Package Scaffold + Debug Sidebar

- [x] Create package with Vite build, TypeScript, React peer dep
- [x] Standalone demo app (npm run demo):
  - [x] Vite dev server with root: "demo"
  - [x] Flexbox layout: kitchen sink on left, debug sidebar on right
  - [x] demo/index.html + demo/main.tsx (excluded from npm build)
  - [x] Styles injected at runtime (no CSS loader dependency)
- [x] AccessibilityProvider context
- [x] AccessibilityDebugSidebar component wireframe
  - [x] Sidebar Container
    - [x] Tab Container
      - [x] Tabs (Checks | Tools | Hooks)
        - [x] Panel Container (in each tab)
          - [x] Vertical Icons Container (with final Heroicons per tab)
          - [x] Panel Content Container (tied to panel+icon selected with "TBD" rendered)
    - [x] Overlay Toggle Container (with "TBD" rendered)
    - [x] Persistent Footer Container (removed - audit buttons moved to Overview panel)
- [x] Tab reorganization: 5 tabs (Focus, Structure, Validate, Tools, Hook State) -> 3 tabs (Checks, Tools, Hooks)
- [x] Overview panel (Checks tab landing page):
  - [x] 0-100 accessibility score with weighted scoring system
  - [x] Per-check score cards with click-to-navigate
  - [x] Explain button showing score calculation breakdown
  - [x] Export button generating markdown audit report to clipboard
  - [x] Audit Page / Audit Sidebar buttons (moved from footer, disabled until Tier 6)
- [x] Scoring module (src/debug/checks/scoring.ts)
- [x] Stub check modules for unimplemented checks (color-contrast, images, links-buttons, aria-validation, touch-targets)

- [ ] Convert wireframe elements to real code

  Ordered for quick wins first, with shared code dependencies respected.
  Panel numbers (e.g., "9. Heading Hierarchy") are identifiers from design.md, not sequence.
  Unit tests for each panel should be written alongside the panel (colocated), not deferred.

  See design.md "Sidebar panels" section for the full specification of each panel.
  Each panel description there is the authoritative spec for what to build.

  **Panel registration:**
  Each panel renders inside the existing sidebar wireframe's panel content area.
  Register new panels in `src/debug/panels/index.ts` by mapping the panel ID
  (from `sidebar-data.ts`) to a React component. Unregistered panels show
  "Not yet implemented" with the panel title.

  **Panel architecture - checks vs rendering:**
  All DOM scan/audit logic must live in `src/debug/checks/`, NOT inline in panel
  components. Each check module exports a function like `scanHeadings(root)` that
  takes a root element (or document) and returns typed results. Panel components
  import from checks and only handle rendering. This enables the WCAG Audit Report
  Generator (Tier 6) to run the same checks against scoped DOM subtrees.
  Tests go on the check functions (pure DOM in, results out).

  **Panel UI conventions:**
  - Each panel renders its own `<h3 className="a11y-panel-title">` as the first child
  - Use `<div className="a11y-panel-content">` as the root wrapper
  - Include a Rescan button via `<div className="a11y-panel-toolbar">`
  - Show issue count in `<span className="a11y-panel-count">`
  - Show issues in `<div className="a11y-panel-issues">`

  **Clickable element rows:**
  All panel rows that reference a page element must be clickable `<button>` elements
  (never div+onClick) with proper ARIA:
  - Use `<button className="a11y-panel-row a11y-panel-row-clickable">`
  - Include `aria-label` describing the action (e.g., "Go to h2: Focusable Elements")
  - Include `title` attribute for hover tooltip with full details
  - Call `scrollToAndHighlight(element)` on click - this scrolls to the element
    with padding so it isn't pinned to viewport edges, highlights it with an overlay,
    and toggles highlight off if the same element is clicked again
  - Use `forceUpdate` state counter to re-render after click so active row updates
  - Apply `a11y-panel-row-error` class for elements with issues (red background)
  - Apply `a11y-panel-row-active` class via `isHighlighted(element)` for the
    currently highlighted element (blue background + left border)

  **Foundation utilities** (in `src/debug/utils/`):
  - `fiber.ts` - React component name resolution via fiber traversal
  - `highlight.ts` - element highlight overlay with scroll tracking, toggle, padding
  - `focus-stream.ts` - shared focus event stream with sidebar self-exclusion

  **Sidebar self-exclusion:**
  The sidebar root has `data-a11y-debug="sidebar"`. All panels that scan the DOM
  must use `isInsideSidebar(element)` to filter out sidebar elements. The highlight
  overlay has `data-a11y-debug="highlight"` so it is also excluded from scans.

  **Overlay toggles:**
  Overlay toggles inject/remove CSS into the app content area (not the sidebar).
  CSS overlays must exclude the sidebar using the reset pattern:
  apply styles globally, then reset on `.a11y-debug-sidebar, .a11y-debug-sidebar *`.
  Disabled overlays (e.g., Reflow Test - standalone mode only) set `disabled: true`
  in `sidebar-data.ts`.

  **Overlay help panel:**
  The overlay strip has a `?` button that toggles a help panel showing each
  overlay's icon, name, and description. Descriptions are in `sidebar-data.ts`
  on each `OverlayToggleDef`. The `X` button next to `?` clears the current
  element highlight.

  **Demo layout:**
  The demo imports from `../src/` directly (not path aliases - Vite's self-referencing
  package resolution doesn't work). The demo `<main>` wraps the content area.
  A sticky "Top" button floats at the top-right corner.

  **Version display:**
  The sidebar header reads the version from `src/debug/version.ts` which imports
  directly from `package.json`. Do not use `define` or global constants for the version.

  ### Foundation (build first - used by many panels)

  - [x] React fiber traversal utility (`getReactComponentName`, `getReactFiberPath`)
    - Used by nearly every panel for component name resolution
    - Build once, all panels benefit
  - [x] Element highlight overlay utility (`highlightElement`, `removeHighlight`)
    - Shared by Focus Tracker, Contrast Checker, Focus Loss, overlays
  - [x] Focus event stream (`focusin` listener with sidebar self-exclusion)
    - Shared by Live Focus Tracker, Focus Trap Detector, Focus Loss Detector, Focus History Log, Focus Order Recorder

  ### Tier 1: Quick wins - simple DOM queries or pure CSS, immediate value

  - [x] Text Spacing Override overlay toggle (WCAG 1.4.12)
    - Pure CSS injection - simplest possible item: inject/remove a `<style>` tag
  - [x] Reflow Test overlay toggle (WCAG 1.4.10)
    - Pure CSS width constraint on app content
  - [x] Forced Colors Mode overlay toggle (WCAG 1.4.11)
    - Pure CSS override for high contrast simulation
  - [x] 9. Heading Hierarchy Validator
    - Query `h1`-`h6`, validate nesting, render tree
    - No event listeners, no MutationObserver
  - [x] 20. Landmark Summary
    - Query landmark elements, check labels, render outline
    - Same pattern as Heading Hierarchy
  - [x] 16. Duplicate ID Detector
    - `querySelectorAll('[id]')`, group by id, flag duplicates
    - MutationObserver for live updates
  - [x] 12. Form Label Checker
    - Query form controls, check label associations
    - Static scan + MutationObserver
  - [x] 17. Reduced Motion Indicator
    - `matchMedia` check + stylesheet scan

  ### Tier 2: Focus panels (share the focus event stream)

  - [x] 1. Live Focus Tracker
    - Uses focus event stream + fiber traversal + highlight utility
    - Foundation for all other focus panels
    - Highlight toggle, Inspect button navigates to Element Inspector
  - [x] 5. Element Inspector
    - Click-to-pick from page or navigate from Focus Tracker/History
    - Full ARIA attribute dump + fiber path + tab order info
    - Missing accessible name warning on interactive elements
  - [x] 15. Focus Loss Detector
    - Watches for `document.body` focus after a specific element was focused
    - Detects cause: removed from DOM, display:none, visibility:hidden, disabled
    - Click row to highlight previous element
  - [x] 18. Focus History Log
    - Passive log of all focus events, renders as `role="log"`
    - Click any row to open in Element Inspector
    - Color-coded dots by component, duration tracking
  - [x] Shared: useFocusStream hook + FocusHistoryEntry with duration
  - [x] 7. Focus Trap Detector (heuristic)
    - Cycle detection on focus event stream (2-20 elements, 2+ repetitions)
    - Distinguishes intentional (dialog/modal) from accidental traps
    - Pulsing active indicator, container identification
  - [x] 13. Focus Order Recorder
    - Record/stop workflow with live event counter
    - Export as markdown table or JSON to clipboard
    - Click any step to scroll-to-highlight

  ### Tier 3: Keyboard, announcements, and live regions

  - [x] 2. Keyboard Event Log
    - Capture-phase keydown listener + preventDefault/stopPropagation detection
    - Monkey-patches Event.prototype to detect interception after all handlers run
    - Color-coded: red for prevented/stopped, PD/SP badges
  - [x] 3. Announcements Log
    - MutationObserver on `[aria-live]` elements for text changes
    - Shows politeness level (polite/assertive), component name, timestamp
    - Log persists after announcements are cleared from DOM
  - [x] 21. Live Region Inventory
    - Lists all `[aria-live]` elements with politeness, text, component name
    - Flags: competing assertive regions, large subtrees, aria-live="off"
    - Click to scroll-to-highlight with politeness-colored overlay
  - [x] Shared: live-region-observer utility for MutationObserver + subscription

  ### Tier 4: Accessible name computation + audits + overlays

  - [x] Shared: accname utility (wraps dom-accessibility-api), contrast utility (ancestor walk + compositing)
  - [x] 14. Screen Reader Text Preview
    - Wraps dom-accessibility-api for WAI-ARIA accname computation
    - Shows name, role, states, description for focused element
  - [x] 23. Link & Button Text Audit
    - Scans a[href], button, [role=link], [role=button]
    - Flags empty names, generic names, duplicate link text to different hrefs
  - [x] 22. Image Audit
    - Scans img, svg[role=img]; categorizes: has-alt, decorative, missing, generic, long-alt
  - [x] 8. Color Contrast Checker + 19. Contrast Overlay toggle
    - Contrast ratio computation with ancestor background walk
    - Flags AA/AAA failures, large text thresholds, complex backgrounds
    - Overlay: ratio badges on text elements (green/yellow/red)
  - [x] 11. Touch Target Size Checker + Touch Targets overlay toggle
    - Checks interactive elements against 24x24 AA and 44x44 AAA thresholds
    - Overlay: dashed outlines on interactive elements
  - [x] 4. Tab Order panel + overlay toggle
    - Queries tabbable elements, sorts by browser tab order rules
    - Flags positive tabindex, shows tabindex=-1 elements separately
    - Overlay: numbered badges on tabbable elements
  - [x] 10. ARIA Validation
    - Invalid roles, broken id refs, aria-hidden on focusable, nested interactives,
      misused aria-checked/selected, aria-label on non-interactive without role

  ### Tier 5: Complex panel

  - [x] 6. ARIA Tree View
    - Full DOM tree walk with collapsible UI, role="tree"/role="treeitem"
    - Filter: all elements or roles-only, expand/collapse all buttons
    - Role-bearing elements highlighted, non-role elements dimmed
    - Inline ARIA attribute display on expanded nodes
    - Click to scroll-to-highlight any element

  ### Tier 6: Capstone

  - [x] 24. WCAG Audit Report Generator
    - Runs all 10 check modules against scoped root element
    - Report organized by WCAG success criterion (passing/failing)
    - Export as markdown to clipboard
    - Overview "Audit Page" button wired up (runs against document root)
    - Overview "Audit Sidebar" button wired up (withSelfExclusionDisabled)

- [x] Standalone injection mode (standalone.js entry point):
  - [x] Self-contained IIFE bundle with React included (~335KB minified)
  - [x] Bookmarklet support via window.__a11yDebugToggle()
  - [x] Shadow DOM style isolation

## Phase 2: Hooks + Strategy Pattern

During this phase update the AccessibilityProvider context as needed to support the hooks.

- [x] Implement FocusTrapStrategy interface
- [ ] Implement core hooks:
  - [x] useFocusTrap (Tab cycling, Enter/Escape, capture-phase listeners, portal support via getExternalElements)
  - [ ] useKeyboardNav (arrow/Home/End/Enter navigation + optional focusRing)
  - [ ] useSelectionAnnouncer (aria-live announcements for selection changes)
  - [ ] useKeyboardResize (WAI-ARIA separator pattern)
- [x] Implement useAccessibility uber-hook composing all sub-hooks:
  - [x] focusTrap?: { containerRef, strategy }
  - [ ] navigation?: { itemSelector, orientation, focusRing, ... }
  - [ ] announcements?: { selectedItems, getLabel, ... }
  - [ ] resize?: { orientation, min, max, step, ... }
  - [ ] Auto-wiring: navigation.activeIndex -> announcements
- [ ] CSS + SCSS for focus rings:
  - [ ] Pure CSS with custom properties (--a11y-focus-ring-color, etc.)
  - [ ] SCSS mixin wrapping the CSS custom properties
- [ ] Wire hooks into debug context so hook-enhanced panels activate:
  - [ ] Focus Trap State (from useFocusTrap reports)
  - [ ] Navigation State (from useKeyboardNav reports)
  - [ ] Custom App Log (from debug.log() calls)
  - [ ] Panels 1-7 gain richer data when hooks are present
- [x] Expose debug handle in hook return value:
  - [x] a11y.debug?.log(), reportKeyEvent(), reportAnnouncement()
- [ ] Add hook-exercising sections to demo kitchen sink:
  - [x] Focus trap demo (Enter to enter, Tab cycles, Escape exits)
  - [ ] Keyboard navigation demo (arrow keys through a list of items)
  - [ ] Selection announcer demo (click items, hear announcements)
  - [ ] Keyboard resize demo (arrow keys to resize a panel)
  - [ ] Strategy swap demo (switch between different FocusTrapStrategy implementations to show the strategy pattern in action)
- [ ] Unit tests for all hooks using mock strategies

## Phase 3: CLI + Test Framework Integration

- [ ] cc-a11y-tools CLI:
  - [ ] `audit` command (exits non-zero on failures - CI gate)
  - [ ] `report` command (always exits 0 - informational)
  - [ ] Options: --level, --scope, --max-failures, --output
  - [ ] Uses Playwright internally to load URL and run audit engine
    NOTE: keep node_modules small and use the playwright-core package. It includes the API but zero browser binaries, allowing the cli to connect to an existing browser instance or a remote browser server manually.
- [ ] Playwright plugin (@concord-consortium/accessibility-tools/playwright):
  - [ ] toPassA11yAudit matcher (assertion - fails test on violations)
  - [ ] generateA11yReport (report only - returns results, optional outputPath)
- [ ] Cypress plugin (@concord-consortium/accessibility-tools/cypress):
  - [ ] passA11yAudit assertion
  - [ ] generateA11yReport command
- [ ] CI pipeline for this repo (validates tools against the demo app):
  - [ ] Run `cc-a11y-tools audit` against the demo app - verifies the CLI works and the demo's intentional a11y gaps are detected
  - [ ] Run `cc-a11y-tools report` against the demo app - verifies report generation and saves the markdown as a CI artifact
  - [ ] Playwright tests using `toPassA11yAudit` against the demo kitchen sink sections that are intentionally accessible (should pass)
  - [ ] Playwright tests using `generateA11yReport` against sections with intentional gaps (verify expected failures appear in report)
  - [ ] Playwright tests running `toPassA11yAudit` against the sidebar itself (the sidebar must pass its own audit)
  - [ ] Cypress equivalents of the above Playwright tests
- [ ] CI example in README (GitHub Actions: serve build + run audit)

## Phase 4: Documentation + Publishing

- [ ] README with:
  - [ ] Quick start for each distribution mode (React, standalone, CLI, Playwright, Cypress)
  - [ ] How to create an app-specific wrapper (FocusTrapStrategy examples)
  - [ ] Hook API reference
  - [ ] Sidebar panel reference
- [ ] Publish to npm as @concord-consortium/accessibility-tools
- [ ] Publish standalone.js to CDN (unpkg/jsdelivr)

## Rationale

- **Phase 1** delivers the debug sidebar and demo app first - the most immediately useful output. Every panel is developed and tested against the demo kitchen sink. The standalone injection mode means anyone can try the sidebar on any page without installing anything. No hooks needed yet.
- **Phase 2** adds the React hooks and strategy pattern. These are developed and tested against new sections added to the same demo kitchen sink - a focus trap demo, keyboard nav demo, resize demo, etc. The demo app serves as both the development testbed and the documentation (developers can read the demo source to see how to use the hooks). Hooks are prioritized over CLI/CI tooling because they provide immediate value to consuming apps.
- **Phase 3** adds CI/CD and test framework integration. The audit engine from Phase 1 is already built - this phase wraps it in a CLI and test matchers. These are tested by running the CLI/matchers against the demo app itself.
- **Phase 4** is documentation and publishing. By this point everything is working and tested via the demo app.

App-specific wrappers (e.g., `useClueAccessibility` for [CLUE](https://github.com/concord-consortium/collaborative-learning), `useCodapAccessibility` for [CODAP](https://github.com/concord-consortium/codap)) are created in each app's own repo, not in this package. See design.md for examples of how apps create strategy factories that translate their concepts into the generic `FocusTrapStrategy` interface.
