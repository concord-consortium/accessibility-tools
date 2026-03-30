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
- [ ] Implement DOM-based sidebar panels (no hook integration needed, use demo to exercise every panel):
  - [ ] 1. Live Focus Tracker
  - [ ] 2. Keyboard Event Log
  - [ ] 3. Announcements Log
  - [ ] 4. Tab Order Overlay
  - [ ] 5. Element Inspector
  - [ ] 6. ARIA Tree View
  - [ ] 7. Focus Trap Detector
  - [ ] 8. Color Contrast Checker
  - [ ] 9. Heading Hierarchy Validator
  - [ ] 10. ARIA Validation
  - [ ] 11. Touch Target Size Checker
  - [ ] 12. Form Label Checker
  - [ ] 13. Focus Order Recorder
  - [ ] 14. Screen Reader Text Preview
  - [ ] 15. Focus Loss Detector
  - [ ] 16. Duplicate ID Detector
  - [ ] 17. Reduced Motion Indicator
  - [ ] 18. Focus History Log
  - [ ] 19. Contrast Overlay Mode
  - [ ] 20. Landmark Summary
  - [ ] 21. Live Region Inventory + Overlay
  - [ ] 22. Image Audit
  - [ ] 23. Link & Button Text Audit
  - [ ] 24. WCAG Audit Report Generator
- [ ] Implement overlay toggles (in strip above footer):
  - [ ] Tab Order
  - [ ] Contrast Ratios
  - [ ] Touch Targets
  - [ ] Live Regions
  - [ ] Text Spacing Override (WCAG 1.4.12)
  - [ ] Reflow Test (WCAG 1.4.10)
  - [ ] Forced Colors Mode (WCAG 1.4.11)
- [ ] React fiber traversal for component name resolution in all panels
- [ ] Standalone injection mode (standalone.js entry point):
  - [ ] Self-contained bundle with React included
  - [ ] Bookmarklet generation
  - [ ] Shadow DOM style isolation
- [ ] Unit tests for all panels using jsdom + mock DOM

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
