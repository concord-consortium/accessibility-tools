# Modality-aware trap entry (suppressible hint) + dialog demo — Design

**Status**: **Closed**
**Date**: 2026-06-15
**Design Doc**: [2026-06-09-iframe-slot-support.md](2026-06-09-iframe-slot-support.md)

## Problem

When a host (activity-player) opens a focus-trapped dialog that contains a
non-cooperating cross-origin iframe, it calls `trap.enterTrap()` on open. For
the iframe content slot, `enterTrap()` performs a **visible landing**: it focuses
a sentinel and reveals the "Press Tab to enter the interactive" hint
(`data-landing` → CSS reveal).

- Opening the dialog **by keyboard** (Enter on the trigger button): the visible
  hint appears and is focused. **Correct** — the user is in keyboard mode and
  needs to know how to descend into the iframe.
- Opening the dialog **by mouse** (click): the same visible hint appears and grabs
  focus. **Wrong** — a sighted pointer user gets keyboard-only jargon shoved into
  focus.

The trap cannot tell *how* it was opened: the host decides when to call
`enterTrap()` and calls it identically in both cases.

### Root cause (verified)

- AP: `DialogOverlay` in `concord-consortium/activity-player`
  (`src/components/activity-page/managed-interactive/dialog-overlay.tsx`) calls
  `trapRef.current?.enterTrap()` unconditionally when its trap container attaches.
- Library: [`focus-trap-controller.ts:245-254`](../src/hooks/focus-trap-controller.ts#L245-L254)
  routes `enterTrap()` through `focusEntrySlot(false, "programmatic")`; for the
  content slot this hits the visible-landing branch in
  [`iframe-slot.ts:292-301`](../src/hooks/iframe-slot.ts#L292-L301)
  (`setAttribute("data-landing")`, sets `aria-label`, focuses the sentinel).

## Goals

1. Give the library a clean primitive so a host can enter the trap **without** the
   visible hint, while still moving focus into the trap correctly.
2. Add a demo scenario (dialog opened by an external button) that demonstrates the
   keyboard-vs-mouse difference and documents the intended host pattern.
3. Resolve the now-overloaded "landing" vocabulary.

Non-goals: building modality detection into the generic trap (that belongs in a
higher-level Dialog layer — see Design decisions); the AP migration itself
(documented as a follow-up).

## Accessibility grounding (WAI-ARIA APG)

- On open, focus **always** moves to an element inside the dialog — this is
  modality-independent; APG does not say "keyboard only."
- Default initial-focus target = the first focusable element. APG lists exceptions
  where you instead focus the **dialog container** (`tabindex="-1"`) or a heading:
  when the first focusable is far down, or is **not a good landing target**.
- A cross-origin iframe **cannot receive DOM focus**, so the sentinel is a *proxy*
  for "the first actionable element," doubling as the keyboard hint.
- The dialog is announced because focus enters a region with `role="dialog"` +
  `aria-modal="true"` + an accessible name — **not** because the container
  specifically is focused. Any focused element inside the labelled dialog triggers
  the "dialog, <name>" announcement.
- The sentinel CSS ([`demo.css:118-124`](../demo/demo.css#L118-L124)) is
  `height:0; overflow:hidden` — a **visual clip only** (not `display:none` /
  `visibility:hidden` / `aria-hidden`). Clipped text **stays in the accessibility
  tree**, so a screen reader still reads the sentinel's text content even when the
  hint is not visually revealed.

Consequence: the keyboard-vs-mouse difference reduces to **whether the visible
hint is shown** — focus moves in either way, and the announcement is effectively
identical (the `data-landing` path's `aria-label` is redundant with the
sentinel's own text content).

## Design decisions

1. **Library exposes a primitive; the host owns modality.** The generic trap does
   not detect or assume input modality, because trap entry is used in many ways
   and automatic modality handling would not be correct for all of them. Modality
   detection belongs in a higher-level Dialog layer (in the host / AP). The demo
   shows the canonical pattern.

2. **Uniform "focus the first actionable element"; the library picks the
   mechanism per element type.** Entering without the hint does **not** mean "focus
   the container." It means: focus the first actionable element as usual; for a
   slot that cannot be entered programmatically (a non-cooperating iframe today),
   focus its sentinel **without** the visible hint. A host that prefers to focus
   the container can simply focus the container element itself — the library does
   not need to encode that policy.

3. **Announcements may fire on pointer actions; only the *visible* hint is
   suppressed.** Live-region/`announce()` output is silent when no screen reader is
   running (the common sighted-pointer case) and appropriate when one is. The
   thing that is wrong for a sighted pointer user is the *visual* affordance. So
   the option suppresses the visible hint, not the focus move and not the
   announcement.

4. **The hint is conditional.** It only appears when a slot cannot be entered
   programmatically — today only a non-cooperating iframe. A *cooperating* iframe
   uses the transport protocol (no hint); a normal focusable slot shows no hint.
   The option therefore *suppresses* an otherwise-automatic hint; it never forces
   one. The option name reflects this (`suppressHint`), and documentation carries
   the "only when needed" nuance.

## Vocabulary: split "landing" from "hint"

"Landing" currently conflates two orthogonal properties of placing focus on a
sentinel:

| Moment | Focus *rests* on sentinel? | Visible hint shown? |
| --- | --- | --- |
| Sequential **Tab** nav into the slot (positioner) | No — transient; a pending Tab descends immediately | No |
| Programmatic **keyboard** entry (`enterTrap`, `cycleToAdjacentSlot`) | Yes — rests until next Tab | **Yes** |
| Programmatic **pointer** entry (NEW) | Yes — rests | No |

At the `focusContent` level the positioner branch and the new pointer branch run
**identical code** (`clearLanding()` + `focusSentinel()`, no `data-landing`). The
only thing `focusContent` actually decides is **"visible hint or not."** The
"rest vs. transient" axis lives in the controller (is a Tab in flight?), not in
the sentinel code.

**Resolution:** keep **"landing"** for the generic sense (focus comes to *rest* on
a sentinel — visible or not; this is how focusin/focusout distinguish a rest from
an exit), and carve out **"hint"** for the visible affordance.

| Today | New | Meaning |
| --- | --- | --- |
| `data-landing` (attribute) | `data-show-hint` | the *visible* "Press Tab…" reveal; CSS keys off this |
| `clearLanding()` | `clearHint()` | remove the visible hint + its `aria-label` |
| `enterLabel` | `enterLabel` (unchanged) | the hint text |
| — | "landing" (prose only) | focus rests on a sentinel; no DOM marker needed |

## API changes (library)

### `enterTrap`

```ts
enterTrap(options?: { suppressHint?: boolean }): void
```

- `suppressHint` defaults to `false` → today's behavior (hint shown when the slot
  needs one). Fully backward-compatible; the existing no-arg `enterTrap()` calls
  are unchanged.
- `suppressHint: true` → enter and focus the first actionable element, but for a
  slot that would otherwise show a hint, focus its sentinel **without** revealing
  the hint (no `data-show-hint`, no `aria-label`). Screen readers still read the
  sentinel text; the next real Tab descends.

### `FocusContentContext`

Add an orthogonal field (does **not** replace `trigger`, whose
positioner-vs-programmatic meaning stays intact):

```ts
export type FocusContentContext = {
  entryMode: "forward" | "reverse";
  trigger: FocusContentTrigger;          // unchanged semantics
  suppressHint?: boolean;                // NEW; default false
};
```

### Threading

`suppressHint` flows: `enterTrap(opts)` → `focusEntrySlot(reverse, "programmatic",
suppressHint)` → `focusSlot(slot, reverse, "programmatic", suppressHint)` →
`focusContent({ entryMode, trigger: "programmatic", suppressHint })`.

In `focusContent` the **non-cooperating programmatic** branch
([`iframe-slot.ts:292-301`](../src/hooks/iframe-slot.ts#L292-L301)) checks
`suppressHint`:

- `false` → set `data-show-hint` + `aria-label`, focus the sentinel (visible landing).
- `true` → `clearHint()` + focus the sentinel only (quiet landing).

The cooperating branch is unaffected (sends `focusEnter`; no hint either way).
Non-content slots are unaffected (`focusContent` isn't called for them, so
`enterTrap({ suppressHint: true })` on a non-content-first trap behaves exactly
like `enterTrap()`).

> Exact wiring (a threaded boolean vs. another representation) is finalized in the
> implementation plan; this spec fixes the **behavior** and the public surface.

### `cycleToAdjacentSlot`

Out of scope to change its signature now. It keeps showing the hint (it is a
keyboard-driven wrap-around, where the hint is wanted). Revisit only if a concrete
need appears.

## Demo scenario — "Dialog open: mouse vs keyboard"

A new scenario (#7) on the iframe-trap page:

- An **external trigger button** ("Open dialog") outside any trap.
- A **dialog-like overlay** rendered when open: `role="dialog"`,
  `aria-modal="true"`, an accessible name, container `tabIndex={-1}`. Conditionally
  rendered (not `react-modal`); the existing deferred-container scenario already
  covers portal/deferred mounting, so this scenario stays focused on entry
  modality.
- The dialog contains an iframe trap (e.g. `close` → iframe, or
  `input` → iframe → `button`) wired with `useIframeSlot` + `useFocusTrap`.
- **Modality detection** in the trigger's `onClick`: `event.detail === 0` ⇒
  keyboard activation (Enter/Space synthesize a click with `detail` 0);
  `event.detail > 0` ⇒ pointer. This is the small "Dialog layer owns modality"
  piece.
- On open: keyboard → `trap.enterTrap()`; pointer → `trap.enterTrap({ suppressHint:
  true })`.
- Close button and Escape dismiss the dialog and **return focus to the trigger
  button**.
- The existing `FocusReadout` shows `isTrapped` + the active element so the
  difference is observable.

**Observable result:** keyboard-open shows the visible hint focused; pointer-open
shows no visible hint (focus rests on the invisible sentinel), and the first Tab
descends.

## Tests

Controller / iframe-slot unit tests:

- `enterTrap({ suppressHint: true })` on a content-slot-first trap focuses the
  sentinel and does **not** set `data-show-hint`.
- `enterTrap()` (default) still sets `data-show-hint` on the same setup (regression).
- After a `suppressHint: true` entry, the next Tab descends/cycles correctly
  (covers caveat 1 below).
- A non-content-first trap (e.g. `["close", "content"]`) behaves identically for
  `enterTrap()` and `enterTrap({ suppressHint: true })`.
- Rename migration: existing `data-landing` assertions become `data-show-hint`.

## Docs

- [`specs/2026-06-09-iframe-slot-support.md`](2026-06-09-iframe-slot-support.md) — update the landing
  sections to the landing/hint split; document the `suppressHint` option and the
  `data-show-hint` rename.
- This spec stands as the record of the modality decision and the canonical host
  pattern; reference it from the iframe-trap test-page design doc if useful.

## Out of scope (documented for handoff)

AP migration: detect modality at the dialog open site and call
`enterTrap({ suppressHint: true })` for pointer opens, mirroring the demo pattern
(in `concord-consortium/activity-player`'s `DialogOverlay`,
`src/components/activity-page/managed-interactive/dialog-overlay.tsx`).
The library change is non-breaking, so AP keeps working until that separate
session lands.

## Verification caveats to carry into implementation

1. Confirm focus resting on the sentinel via `suppressHint` is clean: the
   `focusin` handler must not treat the rest as an exit
   ([`iframe-slot.ts:226-236`](../src/hooks/iframe-slot.ts#L226-L236)), and
   the next real Tab must still descend.
2. Confirm with a real screen reader that the clipped sentinel text is announced
   on a `suppressHint` entry (the accessibility-tree reasoning above).
