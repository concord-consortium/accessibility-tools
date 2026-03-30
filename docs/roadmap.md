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
      - [x] Tabs (Focus | Structure | Validate | Tools)
        - [x] Panel Container (in each tab)
          - [x] Vertical Icons Container (with final Heroicons per tab)
          - [x] Panel Content Container (tied to panel+icon selected with "TBD" rendered)
    - [x] Overlay Toggle Container (with "TBD" rendered)
    - [x] Persistent Footer Container (with "TBD" rendered)

- [ ] Convert wireframe elements to real code

  Ordered for quick wins first, with shared code dependencies respected.
  Panel numbers (e.g., "9. Heading Hierarchy") are identifiers from design.md, not sequence.
  Unit tests for each panel should be written alongside the panel, not deferred.

  Each panel renders inside the existing sidebar wireframe's panel content area.
  The sidebar-data.ts file maps panel IDs to categories/icons - new panels register
  there and provide a component that receives the panel content container.

  Foundation utilities (fiber traversal, element highlight, focus stream) are shared
  modules in src/debug/utils/ imported by multiple panels. Build and test these first
  since nearly every panel depends on at least one.

  Overlay toggles inject/remove DOM into the app content area (not the sidebar).
  The sidebar self-exclusion filter (checking if target is inside the sidebar root)
  must be applied in every panel that observes the page DOM.

  See design.md "Sidebar panels" section for the full specification of each panel.
  Each panel description there is the authoritative spec for what to build.

  ### Foundation (build first - used by many panels)

  - [x] React fiber traversal utility (`getReactComponentName`, `getReactFiberPath`)
    - Used by nearly every panel for component name resolution
    - Build once, all panels benefit
  - [x] Element highlight overlay utility (`highlightElement`, `removeHighlight`)
    - Shared by Focus Tracker, Contrast Checker, Focus Loss, overlays
  - [x] Focus event stream (`focusin` listener with sidebar self-exclusion)
    - Shared by Live Focus Tracker, Focus Trap Detector, Focus Loss Detector, Focus History Log, Focus Order Recorder

  ### Tier 1: Quick wins - simple DOM queries or pure CSS, immediate value

  - [ ] Text Spacing Override overlay toggle (WCAG 1.4.12)
    - Pure CSS injection - simplest possible item: inject/remove a `<style>` tag
  - [ ] Reflow Test overlay toggle (WCAG 1.4.10)
    - Pure CSS width constraint on app content
  - [ ] Forced Colors Mode overlay toggle (WCAG 1.4.11)
    - Pure CSS override for high contrast simulation
  - [ ] 9. Heading Hierarchy Validator
    - Query `h1`-`h6`, validate nesting, render tree
    - No event listeners, no MutationObserver
  - [ ] 20. Landmark Summary
    - Query landmark elements, check labels, render outline
    - Same pattern as Heading Hierarchy
  - [ ] 16. Duplicate ID Detector
    - `querySelectorAll('[id]')`, group by id, flag duplicates
    - MutationObserver for live updates
  - [ ] 12. Form Label Checker
    - Query form controls, check label associations
    - Static scan + MutationObserver
  - [ ] 17. Reduced Motion Indicator
    - `matchMedia` check + stylesheet scan

  ### Tier 2: Focus panels (share the focus event stream)

  - [ ] 1. Live Focus Tracker
    - Uses focus event stream + fiber traversal + highlight utility
    - Foundation for all other focus panels
  - [ ] 5. Element Inspector
    - Click-to-inspect from Focus Tracker
    - Full ARIA attribute dump + fiber path
    - Build early: other panels link to it (Focus History, Contrast Overlay, etc.)
  - [ ] 15. Focus Loss Detector
    - Watches for `document.body` focus after a specific element was focused
  - [ ] 18. Focus History Log
    - Passive log of all focus events, renders as `role="log"`
    - Click any row to open in Element Inspector
  - [ ] 7. Focus Trap Detector (heuristic)
    - Cycle detection on focus event stream
  - [ ] 13. Focus Order Recorder
    - Record/stop/compare/export workflow
    - Most complex in this tier

  ### Tier 3: Keyboard, announcements, and live regions

  - [ ] 2. Keyboard Event Log
    - Capture-phase keydown listener + preventDefault/stopPropagation detection
    - Log panel
  - [ ] 3. Announcements Log
    - MutationObserver on `[aria-live]` elements for text changes
    - Log panel
  - [ ] 21. Live Region Inventory + overlay toggle
    - Lists all `[aria-live]` elements (complements Announcements Log)
    - Shares MutationObserver pattern from Announcements Log
    - Overlay: colored borders with flash on change

  ### Tier 4: Accessible name computation + audits + overlays

  - [ ] 14. Screen Reader Text Preview
    - Build the accessible name computation utility (WAI-ARIA spec)
    - Reused by Link & Button Audit and WCAG Audit Report
  - [ ] 23. Link & Button Text Audit
    - Reuses accessible name computation from Screen Reader Preview
    - Scan, group duplicates, flag issues
  - [ ] 22. Image Audit
    - Scan images/SVG/canvas, categorize by alt text status
  - [ ] 8. Color Contrast Checker + 19. Contrast Overlay toggle
    - Build contrast ratio utility + panel
    - Contrast Overlay reuses the same calculation, build together
  - [ ] 11. Touch Target Size Checker + Touch Targets overlay toggle
    - Build size checking utility + panel
    - Touch Targets overlay reuses the same logic, build together
  - [ ] 4. Tab Order Overlay (panel + overlay toggle)
    - Query tabbable elements, sort by tab order, render numbered badges
    - Same overlay pattern as Contrast and Touch Targets
  - [ ] 10. ARIA Validation
    - Complex rule set (many individual checks)
    - No dependencies on other panels, but benefits from all prior utilities

  ### Tier 5: Complex panel

  - [ ] 6. ARIA Tree View
    - Full DOM tree walk with collapsible UI
    - Most complex panel UI (tree rendering, expand/collapse, filtering)
    - No other panel depends on this

  ### Tier 6: Capstone

  - [ ] 24. WCAG Audit Report Generator
    - Runs checks from Heading Hierarchy, Form Labels, ARIA Validation, Contrast, Touch Targets, Image Audit, accessible name computation
    - Produces scoped markdown report with copy-to-clipboard
    - Last panel - depends on all audit utilities being built

- [ ] Standalone injection mode (standalone.js entry point):
  - [ ] Self-contained bundle with React included
  - [ ] Bookmarklet generation
  - [ ] Shadow DOM style isolation

## Phase 2: CLI + Test Framework Integration

- [ ] cc-a11y-tools CLI:
  - [ ] `audit` command (exits non-zero on failures - CI gate)
  - [ ] `report` command (always exits 0 - informational)
  - [ ] Options: --level, --scope, --max-failures, --output
  - [ ] Uses Playwright internally to load URL and run audit engine
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

## Phase 3: Hooks + Strategy Pattern

During this phase update the AccessibilityProvider context as needed to support the hooks.

- [ ] Implement FocusTrapStrategy interface
- [ ] Implement core hooks:
  - [ ] useFocusTrap (Tab cycling, Enter/Escape, capture-phase listeners, portal support via getExternalElements)
  - [ ] useKeyboardNav (arrow/Home/End/Enter navigation + optional focusRing)
  - [ ] useSelectionAnnouncer (aria-live announcements for selection changes)
  - [ ] useKeyboardResize (WAI-ARIA separator pattern)
- [ ] Implement useAccessibility uber-hook composing all sub-hooks:
  - [ ] focusTrap?: { containerRef, strategy }
  - [ ] navigation?: { itemSelector, orientation, focusRing, ... }
  - [ ] announcements?: { selectedItems, getLabel, ... }
  - [ ] resize?: { orientation, min, max, step, ... }
  - [ ] Auto-wiring: navigation.activeIndex → announcements
- [ ] CSS + SCSS for focus rings:
  - [ ] Pure CSS with custom properties (--a11y-focus-ring-color, etc.)
  - [ ] SCSS mixin wrapping the CSS custom properties
- [ ] Wire hooks into debug context so hook-enhanced panels activate:
  - [ ] Focus Trap State (from useFocusTrap reports)
  - [ ] Navigation State (from useKeyboardNav reports)
  - [ ] Custom App Log (from debug.log() calls)
  - [ ] Panels 1-7 gain richer data when hooks are present
- [ ] Expose debug handle in hook return value:
  - [ ] a11y.debug?.log(), reportKeyEvent(), reportAnnouncement()
- [ ] Add hook-exercising sections to demo kitchen sink:
  - [ ] Focus trap demo (Enter to enter, Tab cycles, Escape exits)
  - [ ] Keyboard navigation demo (arrow keys through a list of items)
  - [ ] Selection announcer demo (click items, hear announcements)
  - [ ] Keyboard resize demo (arrow keys to resize a panel)
  - [ ] Strategy swap demo (switch between different FocusTrapStrategy implementations to show the strategy pattern in action)
- [ ] Unit tests for all hooks using mock strategies

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
- **Phase 2** adds CI/CD and test framework integration. The audit engine from Phase 1 is already built - this phase wraps it in a CLI and test matchers. These are tested by running the CLI/matchers against the demo app itself.
- **Phase 3** adds the React hooks and strategy pattern. These are developed and tested against new sections added to the same demo kitchen sink - a focus trap demo, keyboard nav demo, resize demo, etc. The demo app serves as both the development testbed and the documentation (developers can read the demo source to see how to use the hooks).
- **Phase 4** is documentation and publishing. By this point everything is working and tested via the demo app.

App-specific wrappers (e.g., `useClueAccessibility` for [CLUE](https://github.com/concord-consortium/collaborative-learning), `useCodapAccessibility` for [CODAP](https://github.com/concord-consortium/codap)) are created in each app's own repo, not in this package. See design.md for examples of how apps create strategy factories that translate their concepts into the generic `FocusTrapStrategy` interface.
