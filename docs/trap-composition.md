# Focus trap composition: limits and patterns

This document describes how this package's focus traps compose with each
other and with the regions they contain ("slots"), what the library
currently supports, and what falls out of that for consumers.

## Headline: there is no support for nested traps

The library exposes one trap per DOM subtree. Two traps active on
overlapping containers will race; the library provides no coordination
between them and no way to ask "is there an outer trap that should handle
this Tab instead of me?"

This is implicit in the implementation, not stated in any user-facing
contract. It's worth surfacing because every other design decision
(slot-aware strategy fields, the choice CLUE made, what's missing for
future work) follows from this constraint.

### Implementation evidence

Both `FocusTrapController` and `useFocusTrap` install three capture-phase
listeners on `document` (two keydown, one focusin) for their entire
lifetime. Listeners are attached in install order, so the outer trap
(created first) sees every event first; the inner trap sees the same
event next, regardless of whether the outer already handled it.

Filtering happens *inside* each handler: `target === this.container` and
`this.container.contains(target)` checks decide whether the event is
"this trap's problem." For an element inside both an outer and an inner
trap, both checks return `true` — both handlers run their full logic.

The keydown handlers do not call `stopImmediatePropagation()`, so even
explicit cooperation between handlers is impossible without a separate
coordination channel.

### Failure mode if you try

Container A contains element E. Element E hosts an inner trap on
container B. Focus is on focusable F inside B.

1. User presses Tab. `keydown` fires on `document`.
2. A's `handleKeyDown` runs first. It sees F as inside its container,
   processes its own slot/cycle logic, calls `preventDefault()`, and
   moves focus to A's next slot.
3. B's `handleKeyDown` runs next on the same event. F is also inside B,
   so B's logic also fires — but focus has already moved out of B, so
   B's slot resolution gets garbage state.

A wins; B's `slotIndex` desyncs from reality. No error is thrown.

### The only safe pattern with two traps

Ensure exactly one trap is `enabled` at a time. The disabled trap's
`handleKeyDown` early-returns at the `!enabled` check, leaving the
enabled trap to run alone. This is a consumer-side discipline; the
library does not enforce it.

A "modal inside a trapped tile" would work today only if the consumer
disables the tile's trap while the modal is open and re-enables it on
close. The library has no awareness of this dance.

### A trap does not auto-exit when focus leaves it

Once a trap is `trapped`, that flag only clears via `exitTrap()`/Escape,
`setEnabled(false)`, or `destroy()`. The trap does **not** watch for focus
moving out of its container (there is no `focusout`/blur exit). So if focus
moves from trap A to trap B — most visibly by clicking an element inside B —
A stays `trapped` until its owner disables it. With nothing driving
`setEnabled`, both A and B can read as `trapped` at once, and Tab back into A
re-enters it (its `trapped` state was never cleared).

This is the same constraint stated from the focus side: keeping exactly one
trap `enabled` at a time is what also keeps exactly one `trapped`, because
disabling a trapped trap auto-exits it (`setEnabled(false)` clears `trapped`).
CLUE gets this for free — selecting a tile disables every other tile's trap,
which exits it. A consumer that leaves multiple traps permanently enabled (as
the demo does) will see the stale-`trapped` behavior above.

Why this is owner-driven rather than a built-in `focusout` exit: a focus-out
exit would have to know what counts as "still inside" (portaled external
elements via `getExternalElements`, a non-cooperating iframe slot where focus
legitimately leaves the document) and whether leaving should fire `onExit`
(which a consumer may wire to selection side effects). Those policies belong
to the owner, not the generic trap, for the same reason modality detection does.

## Composition primitive: slots, not nested traps

Inside a single trap, composition happens via **slots** — named regions
defined by `cycleOrder` and `getElements()`. Slots are not traps:

- A slot has no `enabled`/`trapped` state of its own.
- A slot does not install listeners.
- Tab does not "enter" a slot in the sense it enters a trap. The trap
  decides which slot's focusable to focus next, based on `cycleOrder`,
  `tabWithinSlots`, and per-slot `tabHandlers`.

A slot is a label and an extension point, not an independently-managed
focus region. This is fine for the common case (heterogeneous content
inside one trap), but it means a region with truly independent focus
semantics — a `react-data-grid`, a `CodeMirror` instance, an embedded
modal — can't host its own trap inside the parent trap. It has to
participate in the parent trap via slot-level extension fields.

## CLUE-453 slot-aware fields: nested-trap-like behavior without nesting

`tabHandlers`, `escapeHandlers`, and a per-slot view of `focusContent`
exist precisely because a slot sometimes needs to behave like a
sub-trap without being one.

```ts
type TabHandlerResult = "handled" | "exit";

interface FocusTrapStrategy {
  // existing fields...
  tabHandlers?: Record<
    string,
    (event: KeyboardEvent, reverse: boolean) => TabHandlerResult
  >;
  escapeHandlers?: Record<
    string,
    (event: KeyboardEvent) => "handled" | "exit"
  >;
  focusContent?: (context: { entryMode: "forward" | "reverse" }) => boolean;
}
```

What these buy you:

- **Per-slot Tab semantics.** A handler returns `"handled"` to take
  responsibility for the Tab event (own `preventDefault`, own focus
  movement) or `"exit"` to let the trap advance to the next slot.
  This is what CLUE's table tile uses to let `react-data-grid` manage
  its own roving cells: while focus is inside the body cell grid, the
  handler returns `"handled"` and RDG's native key handling runs;
  at the row/column edge, the handler returns `"exit"` and the trap
  cycles to the next slot.
- **Per-slot Escape semantics.** Same shape — `"handled"` to suppress
  the trap's "Escape exits" default behavior (so e.g. RDG's edit-mode
  Escape can cancel an edit without dropping the user out of the
  trap entirely).
- **Direction-aware focus restoration.** `focusContent` receives
  `{ entryMode }` so the slot can pick where to focus based on how
  the trap is entering it — `"forward"` (Tab from previous slot or
  initial entry) or `"reverse"` (Shift+Tab from next slot). The field
  is a discriminated string so new modes (e.g. `"restore"` for
  re-entering the last-focused element when the trap is re-engaged)
  can be added without a breaking change.

### The managed-slot semantic

A **managed slot** is one the trap leaves alone when it sweeps `tabindex`:
its element and all descendants are skipped by `setChildrenNonTabbable`.
A slot is managed if it appears in either of two strategy fields —
`tabHandlers` **or** `nativeTabSlots` — which `getManagedSlotElements`
([dom-utils.ts](../src/hooks/dom-utils.ts)) unions together.

The skip is necessary because the trap sweeps `tabindex="-1"` onto every
focusable descendant of its container to make out-of-container Tab
handling work, and that sweep would destroy a slot that owns its own
`tabindex`. The two kinds of managed slot own it for different reasons:

- **`tabHandlers` slots** keep a roving `tabindex="0"`/`"-1"` for their
  own key navigation. RDG's body grid is the example: the sweep would
  wipe the roving-cell state that arrow-key navigation depends on.
- **`nativeTabSlots` slots** (the iframe slot) carry a host-owned
  `tabindex` the focus system must never touch — the AP-108 rule that
  the iframe's `tabindex` comes from static host properties, not the
  trap (see [iframe-slot-support §8](../specs/2026-06-09-iframe-slot-support.md)). An
  iframe slot has no `tabHandler` at all, so `nativeTabSlots` is what
  marks it managed.

Managed status is *derived* from these two existing fields rather than
declared through a separate `managedSlots: string[]`. Each field already
says the slot has its own focus/Tab behavior — a `tabHandler` declares
custom Tab semantics, a `nativeTabSlot` declares a hand-off to native
traversal — so wanting the trap to leave `tabindex` alone always
coincides with one of them. A standalone field would just be a third
knob to misconfigure.

### Managed slots must be de-tabbed while the trap is inactive

The corollary the host owns: because the trap never writes a managed
slot's `tabindex` — in *either* direction — removing the slot's
focusables from the tab order while the trap is dormant is the host's
job, not the library's.

`setChildrenNonTabbable` sweeps every *non-managed* focusable to
`tabindex="-1"` when the trap is disabled or engaged, and
`restoreChildrenTabbable` restores them on entry
([focus-trap-controller.ts](../src/hooks/focus-trap-controller.ts)).
Managed slots are skipped by both, so a managed slot the host leaves
natively tabbable stays a live tab stop while its trap is inactive.

That stray tab stop is reachable by the browser's native sequential
navigation, which the trap can't intercept once focus is outside the
container. It bites Shift+Tab specifically: the container sits *before*
the slot in the DOM, so a forward Tab reaches the container first and
skips the whole subtree, but a Shift+Tab arriving from a following
sibling reaches the slot first and lands in it. For an iframe slot this
is the worst case — once focus is inside a cross-origin frame the parent
can't see the keydown to redirect.

**Requirement.** While a trap is inactive (not `trapped`), the host must
keep every managed slot's focusables out of the tab order
(`tabindex="-1"`) and restore them only while the trap is active. This
applies to any slot whose `tabindex` the library does not manage:

- **iframe slots** (`nativeTabSlots`) — the host owns the iframe's
  `tabindex` (the AP-108 rule, [iframe-slot-support §8](../specs/2026-06-09-iframe-slot-support.md)).
  Gate it on the trap's active state, e.g. `tabIndex={isTrapped ? 0 : -1}`,
  not on a static `locked` / `content-only` property alone.
- **roving-tabindex slots** (`tabHandlers`, e.g. `react-data-grid`) — the
  widget's own `tabindex="0"` cell is a stray tab stop while the tile is
  unselected unless the host parks it at `-1`.

The library can't do this for the host: not knowing a managed slot's
internal `tabindex` scheme is exactly why the slot is managed. Only the
host knows which element is the slot's single tab stop, and when.

### What this is not

These fields don't give a slot an independent `enabled`/`trapped`
state, its own listeners, or the ability to stop the parent trap from
running. They give a slot custom *behavior* within the parent trap.
A handler returning `"handled"` doesn't suspend the parent trap; it
just says "the parent trap shouldn't advance the slot for this Tab."

If a slot's needs ever exceed what these fields express — e.g. a
slot that wants to ignore Tab entirely when a sub-mode is active,
or one that wants to install its own document-level listener — the
slot either grows its needs into the strategy interface or steps
outside the trap entirely.

## Deployment consequences for consumers

Given the no-nested-traps constraint, a consumer integrating these traps
into a tile-based UI has two architectural choices:

**Model A: per-child trap.** Each child component (e.g. each "tile")
hosts its own `FocusTrapController` or `useFocusTrap`. Works only if
there is no outer trap on a parent container.

**Model B: parent-hosted trap with slot-aware strategy.** A parent
component instantiates one trap per child. Each child registers a
strategy fragment with the parent; the parent assembles the fragments
into the trap's strategy. Children customize per-slot behavior via
`tabHandlers`/`escapeHandlers`.

The two models are not freely mixable. A parent with its own trap that
also lets children host their own traps would have nested traps,
which doesn't work.

### CLUE picked Model B

CLUE's `tile-component.tsx` hosts the trap for every tile. Each tile
function/class component registers a `tileApi` with
`getFocusableElements()`, and the parent assembles strategy fragments
into the trap's strategy. Tiles do not host their own traps. A comment
in `useClueAccessibility` hints at a future where tiles "manage their
own trap," but the library doesn't support that mix today and CLUE
doesn't attempt it.

CLUE's drivers for Model B:

1. **Mixed component paradigms.** Some tiles are class components, some
   are function components. The parent owning the trap means every
   tile integrates identically regardless of paradigm.
2. **Cross-tile concerns.** Inter-tile Tab navigation, selection
   toggling on Enter/Escape, exit announcements all live in the
   parent. Per-child traps would duplicate these or need a
   coordination layer.
3. **The nested-trap constraint.** Model A inside Model B isn't a
   thing today. Picking Model B is the only consistent option once
   the parent has a trap.

## If nested traps were supported

Some shape this could take:

- A `parent` reference on each trap so the inner can ask "are you
  going to handle this Tab?" before running its own logic.
- A registration mechanism so an outer trap's `handleKeyDown` can
  detect "focus is inside a registered inner trap" and skip its
  own slot/cycle logic for that event.
- An explicit "this slot owns its own trap" mode where the parent's
  `setChildrenNonTabbable` and Tab handler both skip the slot, and
  the slot's own trap takes over on entry.

The slot-vs-trap boundary would have to get sharper. Today a slot is
a label inside one trap. With nested traps, a slot would need to
choose between "I am a region inside this trap" and "I am a sub-trap
that this trap delegates to."

This is potentially the right direction for consumers whose widgets
genuinely need self-contained focus management. It is not a small
change — `setChildrenNonTabbable`, the Tab handler, the focusin
handler, and the cycle/slot resolution would all need to be
nested-aware.

It is also not necessary for the use cases the library has seen so
far. CLUE-453 deliberately picked the slot-aware-handlers route
instead, on the grounds that it solves the actual problem (RDG inside
a table tile) with strictly additive strategy fields.

## What's not in the library

The Model B coordination protocol — how a parent builds a strategy
from fragments registered by children — is consumer-specific. CLUE
uses a `tileApi.getFocusableElements()` channel; other consumers will
have their own conventions. The library exposes the trap and the
strategy; the wiring layer is the consumer's to design.

If multiple consumers converge on similar wiring patterns, that's a
signal to add a helper. Today there's only one consumer (CLUE) and
the variation isn't worth abstracting.

## Summary

- One trap per DOM subtree. No nested traps; no coordination provided.
- Slots are the in-trap composition mechanism. Slots are not traps.
- Slot-level extension fields (`tabHandlers`, `escapeHandlers`,
  managed-for-tabindex) let a slot behave like a sub-trap without
  being one. This is how the library handles widgets with their own
  focus semantics today.
- Consumers with a parent trap must use Model B: parent hosts, children
  contribute strategy fragments.
- Real nested-trap support is a future direction, not a current
  capability.
