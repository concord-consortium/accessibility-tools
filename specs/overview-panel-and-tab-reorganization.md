# Overview Panel and Tab Reorganization

**Status**: **Closed**
**Design Doc**: [../docs/design.md](../docs/design.md)
**Roadmap**: [../docs/roadmap.md](../docs/roadmap.md)

## Overview

Add a score-driven Overview panel as the landing page of the sidebar, reorganize the tab structure from 5 tabs (Focus, Structure, Validate, Tools, Hook State) to 3 tabs (Checks, Tools, Hooks), and implement a 0-100 accessibility scoring system derived from all check modules.

## Background

The current sidebar has 5 category tabs organized by WCAG domain (Focus, Structure, Validate, Tools, Hook State). This categorization is meaningful to accessibility experts but confusing for regular developers who don't know which tab to look in for a specific issue. There is no high-level summary - users must click through individual panels to understand the state of accessibility.

The check modules in `src/debug/checks/` already return structured `CheckResult` data with typed issues, WCAG criteria, and severity levels. This data can be aggregated into a top-level score.

## Requirements

### Overview Panel (landing page + audit report)

- [ ] Overview panel is the default panel shown when the sidebar opens
- [ ] Displays a single 0-100 accessibility score at the top, colored by range (green/yellow/red)
- [ ] Score is weighted by severity: errors > warnings, WCAG A > AA > AAA
- [ ] Below the score, shows a list of individual check cards, one per check module
- [ ] Each check card shows:
  - Check name (e.g., "Heading Hierarchy", "Form Labels")
  - Individual 0-100 score for that check
  - Issue count (errors + warnings)
  - Brief summary (e.g., "3 skipped levels, 2 multiple h1s")
- [ ] Clicking a check card navigates to that check's panel
- [ ] Check cards with issues are visually highlighted (similar to error row pattern)
- [ ] Manual rescan only (Rescan button) - no live MutationObserver updates
- [ ] "Export as Markdown" button generates the WCAG audit report from current results
- [ ] "Audit Page" and "Audit Sidebar" buttons move from the footer into this panel
- [ ] The footer is removed or simplified (buttons now live in the Overview panel)

### Tab Reorganization

- [ ] Reduce tabs from 5 to 3: Checks, Tools, Hooks
- [ ] **Checks tab** (first tab, default):
  - Overview panel (landing - shows scores)
  - Heading Hierarchy Validator
  - Landmark Summary
  - Duplicate ID Detector
  - Form Label Checker
  - Color Contrast Checker
  - ARIA Validation
  - Touch Target Size Checker
  - Image Audit
  - Link & Button Text Audit
  - Reduced Motion Indicator
- [ ] **Tools tab**:
  - Live Focus Tracker
  - Element Inspector
  - Focus Trap Detector
  - Focus Loss Detector
  - Focus History Log
  - Focus Order Recorder
  - Keyboard Event Log
  - Announcements Log
  - Live Region Inventory
  - Screen Reader Text Preview
  - ARIA Tree View
  - Tab Order Overlay
  - WCAG Audit Report Generator (scoped per-component audits)
- [ ] **Hooks tab** (grayed out until hooks adopted):
  - Focus Trap State
  - Navigation State
  - Custom App Log

### Scoring System

- [ ] Each check module produces a 0-100 score
- [ ] Top-level score is a weighted aggregate of individual check scores
- [ ] Weights by severity: errors deduct more than warnings
- [ ] Weights by WCAG level: A issues deduct more than AA, AA more than AAA
- [ ] Score displayed as a simple colored number: green (80-100), yellow (50-79), red (0-49)
- [ ] Scoring formula lives in `src/debug/checks/scoring.ts` for reuse by CLI/audit

### Footer Changes

- [ ] "Audit Page" and "Audit Sidebar" buttons move from footer into Overview panel
- [ ] Footer is either removed or simplified to just the overlay strip

## Technical Notes

### Check Module Integration

Each check module in `src/debug/checks/` already returns `CheckResult<T>` with `items` and `issues` arrays. The scoring system needs to:
1. Run all check modules against the current document
2. Convert each `CheckResult` into a 0-100 score
3. Aggregate into a top-level score

The Overview panel imports from `src/debug/checks/` directly - same pattern as existing panels.

### Tab Data Changes

The `sidebar-data.ts` file needs to be restructured from the current 5-category model to 3 categories. Panel IDs stay the same - only the category grouping changes. The icon strip will have more icons per category (10+ for Checks) so it may need to scroll or use a different layout.

### Navigation Between Panels

Clicking a check card in the Overview needs to switch the active panel to the corresponding check panel. This requires the Overview to know about panel IDs and be able to set the active panel state.

## Out of Scope

- Changes to individual panel implementations (they stay as-is)
- New check modules (those come from the existing roadmap tiers)
- Hook panel implementations
- Overlay toggle changes

## Open Questions

### RESOLVED: How should the 0-100 score be calculated?
**Context**: Each check returns items and issues with severity (error/warning) and WCAG level (A/AA/AAA). Need a formula that produces a meaningful, stable score.
**Options considered**:
- A) Simple pass rate: `(items without issues / total items) * 100`
- B) Weighted by severity: errors count more than warnings, WCAG A issues count more than AA which count more than AAA
- C) Deduction model: start at 100, deduct points per issue
- D) Per-check binary + average: each check is pass (100) or fail (0)

**Decision**: B - Weighted by severity. Errors count more than warnings, WCAG A issues weigh more than AA which weigh more than AAA. Weights need to be defined during implementation.

### RESOLVED: Should the score update live or only on manual rescan?
**Context**: The check modules can re-run on DOM changes via MutationObserver. Live scoring could cause flickering during React re-renders.
**Options considered**:
- A) Manual rescan only - stable, predictable
- B) Live with debounce (500ms)
- C) Live with debounce + "scanning..." indicator

**Decision**: A - Manual rescan only. Stable and predictable. Users press Rescan to update scores.

### RESOLVED: How should the icon strip handle 10+ panels in the Checks tab?
**Context**: The current icon strip is designed for 3-6 icons per category. The Checks tab would have 11 panels.
**Options considered**:
- A) Scrollable icon strip with overflow indicators
- B) Two-column icon grid
- C) Collapsible icon sections
- D) Keep single column, let it scroll - icons are small enough (28px)

**Decision**: D - Keep single column, let it scroll. Icons are 28px so 11 icons = 308px + gaps, which fits in most viewports. If it overflows, it scrolls naturally.

### RESOLVED: Should the Overview panel be a separate concept from the WCAG Audit Report?
**Context**: The Overview panel (live score + check cards) and the WCAG Audit Report Generator (markdown report) overlap in purpose.
**Options considered**:
- A) Keep them separate
- B) Merge - Overview IS the report in live form, with "Export" button
- C) Overview links to Report panel

**Decision**: B - Merge. The Overview panel is the live report with an "Export as Markdown" button. The sidebar audit buttons ("Audit Page" / "Audit Sidebar") also move into this panel. No separate WCAG Audit Report Generator panel needed.

### RESOLVED: What color/visual treatment for the score?
**Context**: The score needs to convey meaning at a glance.
**Options considered**:
- A) Color gradient: green (80-100), yellow (50-79), red (0-49)
- B) Circular progress ring with color
- C) Simple number with color, no graphic
- D) Progress bar with color fill

**Decision**: C - Simple number with color. Green for good, yellow for moderate, red for poor. Clean and readable at small sizes.
