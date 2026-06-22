# iframe-slot: how a focus trap contains an iframe

This document describes how `@concord-consortium/accessibility-tools` lets a
focus trap contain an **interactive rendered in an iframe** — including a
**cross-origin** one that does not cooperate with the parent at all. It describes
the code as it actually works.

Its companion, [iframe-slot-design.md](iframe-slot-design.md), is the original
design/spec. You should not need it to understand the system — everything load-
bearing is here. It is worth opening only to see *why a particular alternative
was rejected*: where this doc says "we deliberately don't do X," the reasoning
lives there. The work is tracked under
[AP-108](https://concord-consortium.atlassian.net/browse/AP-108) (the Activity
Player feature) and
[LARA-215](https://concord-consortium.atlassian.net/browse/LARA-215) (the
strategy-contract extension in this library).

Read [trap-composition.md](trap-composition.md) for the underlying slot model.
An iframe-slot is one kind of **self-managed slot**: the trap delegates the
slot's internal focus behavior to code the slot owns.

## 1. What it does, and why an iframe is hard

A focus trap keeps Tab/Shift+Tab cycling among a fixed set of **slots** and
releases on Escape. The standard trap is single-document: it listens for
`keydown` on `document`, manages `tabindex` on the container's descendants, and
on release hands focus to the next focusable outside the container
(`findNextFocusableOutside` in `dom-utils.ts`). An iframe is opaque to all of
that:

- **Keyboard events inside the iframe never reach the parent.** A `keydown`
  while focus is inside the frame is delivered to the iframe's document, not the
  host's. The trap's `document` keydown listener simply does not fire, so it
  cannot intercept Tab or Escape from there.
- **The parent cannot reach across a cross-origin boundary.** It can neither
  enumerate nor `.focus()` an element inside the interactive. `iframe.focus()`
  lands on the iframe *element*, not on a chosen inner control.
- **`relatedTarget` is nulled across a cross-origin boundary,** so a focus event
  on the parent side can't say where focus came from inside the frame.

What *does* work for free is **native sequential traversal**: a forward Tab into
an iframe lands on its first focusable; a Tab past its last returns to the next
focusable in the parent; Shift+Tab is symmetric. This holds cross-origin with no
cooperation. The whole design leans on it — the trap never tries to move focus
*across* the boundary itself. It only **positions** the browser so native
traversal carries focus the right way, and **detects** when focus has crossed.

## 2. The pieces, and where they live

| Piece | File | Role |
| --- | --- | --- |
| `IframeSlot` | `iframe-slot.ts` | Framework-agnostic core. Owns sentinel behavior, inside-tracking, entry/exit, the optional transport. |
| `useIframeSlot` | `use-iframe-slot.ts` | Thin React hook. Wires one `IframeSlot` to a `FocusTrapController` and hands the host props/strategy to render. |
| `createIframeSlotRegistry` | `iframe-slot-registry.ts` | Shared registry letting sibling iframe-slots in one trap see each other (multi-iframe case). |
| `FocusMessage` / `FocusTransport` | `focus-messages.ts` | The self-contained vocabulary for the optional cooperating path. |
| `FocusTrapController` | `focus-trap-controller.ts` | The trap. Extended with `nativeTabSlots`, `focusContent` triggers, and `cycleToAdjacentSlot`. |
| `deriveIntercept`, `getManagedSlotElements` | `dom-utils.ts` | Pure helpers: per-direction intercept flags; the tabindex-sweep exclusion. |

The host renders the DOM `[before-sentinel][iframe][after-sentinel]` (wrapped in
one element), supplies refs, and merges a `strategyFragment` from `useIframeSlot`
into the `FocusTrapStrategy` it passes to `useFocusTrap`. The library writes the
sentinels' dynamic attributes imperatively; the host owns the iframe element and
the static markup. Responsibilities are split so the library never renders and
never imports a concord package.

## 3. The core trick: sentinels + a mid-keydown focus move

Two **sentinels** — zero-size, host-rendered elements straddling the iframe —
are the entire mechanism for crossing the boundary. At rest each sentinel is
`tabindex="-1"`: programmatically focusable but never a normal Tab stop, so a
user tabbing through the page never lands on one.

The non-obvious part is **how a sentinel makes native Tab descend into the
iframe**. When the trap decides Tab should enter the iframe-slot, it does two
things *synchronously inside the live Tab `keydown` handler*:

1. It focuses the appropriate sentinel (`IframeSlot.focusContent` →
   `focusSentinel`), changing `document.activeElement` to that sentinel.
2. It **does not** call `preventDefault()`.

Because the handler returns without preventing the default, the browser runs its
pending native Tab action — but now **from the element that is currently
focused**, which is the sentinel we just moved to. The sentinel sits immediately
before (or after) the iframe in the DOM, so the browser's own "Tab into the next
thing" carries focus straight into the frame. We have effectively **rewritten
where native Tab goes by mutating `activeElement` mid-event**, while still riding
the browser's free cross-boundary traversal rather than trying to reproduce it.

This trick has one hard precondition: **the Tab `keydown` must be happening in
the host page.** It works only because the parent's handler runs first and can
reposition focus before the default action fires. Once focus is *inside* the
iframe, the next `keydown` is delivered to the iframe's document and the parent
never sees it — so the parent cannot use this trick to reposition anything from
within the frame. That asymmetry is structural, and it shapes the rest of the
design: **entry** can be driven from a host keydown (§5), but **exit** cannot be
intercepted as a keystroke and must be *observed* by other means (§4, §6).

The trap skips `preventDefault` for exactly the slots the host lists in
`nativeTabSlots` (the iframe-slot lists itself there). For every other slot the
trap keeps its normal "preventDefault, then place focus" behavior. The decision
is declarative and per-slot — see `nativeTabSlots` on `FocusTrapStrategy` in
`types.ts`.

### Positioner vs. landing

The sentinel is used in two modes, chosen by a `trigger` the trap passes in
`FocusContentContext`:

- **Positioner** (`trigger: "sequentialNavigation"`) — there *is* a live Tab
  keydown to descend with. `focusContent` focuses the sentinel silently and
  returns; focus passes straight through into the iframe. The user never sees
  the sentinel.
- **Landing** (`trigger: "programmatic"`) — there is **no** pending native Tab
  to descend with (the trap was entered by Enter/click, a wrap-around, or a
  restore). Focus instead comes to **rest** on the sentinel, which is toggled to
  a visible, labeled "Press Tab to enter …" hint (`data-show-hint` plus an
  optional `aria-label` from `enterLabel`). The user's *next* Tab is a live host
  keydown and descends via the positioner trick. The visible hint is a
  deliberate choice over the alternative of focusing the frame directly,
  which would leave focus invisible — see
  [§10, "Why landing instead of focusing the frame"](#why-landing-instead-of-focusing-the-frame).

## 4. Knowing when focus is inside the iframe

Almost everything else depends on one boolean — `IframeSlot.inside`
(`focusInsideIframe`). It is hard to track because **no single event covers
every way focus crosses the boundary**, so the core combines two signals:

- **The iframe element's own `focus`/`blur`.** These fire for **click** and
  **programmatic** (`iframe.focus()`) entry/exit — and *only* those.
- **The top window's `blur`/`focus`, plus a deferred `activeElement` re-read.**
  A native Tab across the boundary does **not** dispatch `focus`/`blur` on the
  `<iframe>` element; the element silently becomes (or stops being)
  `document.activeElement`. What *is* observable is the window: focus entering
  the subframe blurs the host window; focus returning to the host focuses it. On
  either window event the core schedules a `setTimeout(…, 0)` and then re-reads
  `document.activeElement === iframe` (`scheduleInsideSync` →
  `syncInsideFromActiveElement`). The deferred tick exists because some browsers
  update `activeElement` just *after* the window event fires. **The re-read, not
  the event, is the source of truth** — so window `blur` and `focus` can share
  one path, and rapid Tabbing collapses to the latest read (the timer is cleared
  and rescheduled each event).

Either way `inside` ends up correct, so the rest of the core — sentinel toggling,
exit detection, hint clearing — needs no per-entry-path special-casing.

**One Safari-ordering wrinkle: `leavingIframe`.** When the user tabs *out* of the
frame, three things happen — the window gets a `focus` event,
`document.activeElement` stops being the iframe, and one of the sentinels gets the `focusin` event. The timing of these 3 events in Safari can be different than Chromium. In Chromium as far as we've seen, the sentinel `focusin` event happens in the same tick as (or very quickly after) the window `focus` event. In Safari, the sentinel getting `focusin` event can happen much later. We weren't able to figure out the specific conditions which make this sentinel focus take longer. We saw it when using a image question interactive.

Because of this delay, the `focusin` hits the sentinel after the iframe slot thinks focus has already left the iframe. In the code this means if we just use the `inside` flag, this focusing of the sentinel is not seen as an exit. To be precise, the `inside` flag is set to false in a deferred block (`setTimeout(0)`) that runs when the window gets the `focus` event. Even though this `inside` change is deferred, that is not always enough of a delay for the sentinel `focusin` to happen before it.

To counteract this a `leavingIframe` flag has been added. It is set when the window gets the `focus` event and `inside` is true. This flag indicates focus is leaving the iframe but it hasn't hit the sentinel outside of the iframe yet. So when the sentinel gets the `focusin` event it checks both `inside` and `leavingIframe`. The `leavingIframe` is cleared on this `focusin`. It is also cleared when entering the iframe in case we missed clearing it on exit.

## 5. Entering the slot

Whether entry is seamless comes down to one question: **does the trap have a live
Tab keydown in the host page to ride?** If it does, it focuses a sentinel and lets
native Tab descend (§3); if not, it has to place a resting **landing**. This is
the *only* thing that distinguishes the two sentinel modes — and it turns on
*where the keydown happened*, because a keydown inside the iframe never reaches
the host (§3).

**With a host keydown to ride → positioner.** Focus is on a normal slot, or
resting on one of the iframe's sentinels, and the user presses Tab. The trap's
Tab handling (`handleKeyDown` in `focus-trap-controller.ts`) cycles to the
iframe-slot, focuses the entry sentinel in **positioner** mode, and — because the
slot is in `nativeTabSlots` — skips `preventDefault`, so the pending native Tab
descends. This is the seamless, single-keystroke common case. It also covers
**wrap-around**: a forward Tab off the last slot is just a cycle whose next slot
is the first iframe-slot, so the trap focuses that iframe's before-sentinel and
native Tab carries focus in. Nothing has to "wrap backward" — the trap repositions
`activeElement` and rides an ordinary forward descent. (See *Tab from a resting
sentinel* below for the exact rules.)

**With no host keydown to ride → landing.** The trap must place focus itself, so
it rests focus on a visible "Press Tab to enter …" sentinel (§3). Three things
cause this:

- **Engaging the trap without a Tab** — `enterTrap()` from Enter on the
  container, a click, or a host opening an overlay. A host may pass
  `enterTrap({ suppressHint: true })` for a **pointer-driven** entry (a
  mouse-opened dialog): focus still rests on the sentinel, but the visible hint
  is suppressed so a sighted mouse user isn't shown keyboard-only text. The trap
  itself does not detect modality — the host decides and passes the flag.
- **Re-entering an iframe after tabbing *out* of one** — that exit's keydown
  happened *inside the frame*, so the trap never saw it; it learns of the exit
  only from a sentinel `focusin` (§6) and advances with `cycleToAdjacentSlot`.
  When that advance lands on an iframe-slot it has no host Tab to ride, so it
  uses a landing — most visibly a **wrap** from the last slot back to a first
  iframe-slot, or a solo iframe wrapping into itself. This is the only kind of
  wrap that needs a landing; the host-keydown wrap above does not.
- **Restore** — re-entering the iframe after an overlay it spawned closes
  (`requestRestore`): a landing, or a protocol message if cooperating (§8).

The trap tells `focusContent` which case it is via `FocusContentContext.trigger`
(`"sequentialNavigation"` ⇒ ride the keydown ⇒ positioner; `"programmatic"` ⇒ no
keydown ⇒ landing; defined in `types.ts`). The name describes the
*browser-navigation* function, not the literal key: an Enter or click that
engages the trap is `"programmatic"` because it carries no pending native focus
advance to descend with.

### Tab from a resting sentinel

After a landing, focus rests on a sentinel and the user presses Tab. Now there
*is* a live host keydown, and the trap resolves four cases (in `handleKeyDown`,
using `getNativeTabSlotSentinels` to know which sentinel holds focus):

| Focus on | Key | Action |
| --- | --- | --- |
| before-sentinel | Tab | descend (skip `preventDefault`) |
| after-sentinel | Tab | `preventDefault`, cycle to next slot |
| after-sentinel | Shift+Tab | descend (skip `preventDefault`) |
| before-sentinel | Shift+Tab | `preventDefault`, cycle to previous slot |

A wrap that re-enters the *same* iframe (a trap whose only slot is the iframe)
is handled by the same rule: the next slot is itself a `nativeTabSlot`, so the
trap must **not** `preventDefault` — it lets the pending Tab descend from the
freshly-focused opposite sentinel.

## 6. Exiting the slot

Because the parent can't intercept Tab from inside the frame (§3), exit is
detected, not intercepted. The sentinels do double duty here.

While focus is inside the iframe, `applyTabindex` makes a sentinel a **real Tab
stop** (`tabindex="0"`) in the direction that must be caught — the after-sentinel
for a forward exit, the before-sentinel for a reverse exit (gated by
`getIntercept`, §7). So a native Tab walking out of the frame lands on a
sentinel, which fires `focusin`. A sentinel `focusin` while `inside` (or while
`leavingIframe`) is **unambiguously an exit**; the direction is simply *which*
sentinel fired (before → `onExit(-1)`, after → `onExit(+1)`), with no reliance on
the nulled `relatedTarget`. `onExit` is wired to the trap's `cycleToAdjacentSlot`,
so the redirect is synchronous and the user never rests on the exit sentinel.

Once focus has left the frame, `inside` flips back to false and `applyTabindex`
runs again, returning **both** sentinels to `tabindex="-1"`. So a sentinel is a
real Tab stop only for the brief window focus is actually inside the iframe; at
rest neither is — which is why a user tabbing through the page never lands on one,
and why the sentinel that just caught an exit isn't a stray stop afterward.

A sentinel `focusin` while focus is genuinely **outside** the iframe (neither
`inside` nor mid-ascent) is a landing rest, not an exit, and is left alone.

### The self-focus guard

Both positioner and landing call `.focus()` on a sentinel, and that move
synchronously fires `focusout` on the previously-focused sentinel and `focusin`
on the target — these are the very events the exit detection and hint-clearing handlers react to.
Unguarded, these internal focus changes would be interpreted as an exit or trigger clearing the hint. So the code brackets every internal
sentinel `.focus()` it issues with a `movingFocus` flag (`focusSentinel`), and
the `focusin`/`focusout` handlers early-return while it is set. Genuine native
exits, Escape/click-away clears, and descents all happen with the flag clear, so
they are unaffected. This matters most in a **single-iframe wrap**, where the
leaving and entering sentinels belong to the same slot.

### The landing hint is tied to focus

The hint is a "focus is resting here" affordance, so it lives exactly as long as
the sentinel holds focus. It is cleared the moment focus leaves the sentinel for
any reason: by **descending** into the iframe (`handleIframeFocus` → `clearHint`)
or by **leaving without descending** — Escape, trap exit, click away — which the
sentinel's `focusout` catches (`handleSentinelFocusOut` → `clearHint`). Without
the `focusout` path an Escape on a resting sentinel would leave the hint stuck
visible.

## 7. Multiple iframes in one trap

Two iframe-slots that are adjacent in **both** DOM order and cycle order (nothing
tabbable between them) should let the browser flow A→B (and B→A on Shift+Tab) in
a single native Tab — *if the trap doesn't interrupt*. The interrupt is a
tabbable sentinel, so the question for each sentinel is: should this direction be
**intercepted** (sentinel goes `tabindex="0"` while inside, so the trap
redirects) or **left to native flow** (sentinel stays `-1`)?

`deriveIntercept` (`dom-utils.ts`) answers it per direction. A direction is
**not** intercepted only when the directional neighbor in cycle order is also a
**DOM-adjacent, enterable iframe-slot** (checked with `compareDocumentPosition`).
Every other case is intercepted:

- the trap's outer **boundary** (the neighbor wraps to the other DOM side),
- a **normal (non-iframe) slot** neighbor (the trap focuses it programmatically),
- a **non-adjacent or non-enterable** iframe neighbor (e.g. a content-only frame
  at `tabindex="-1"`; native Tab would skip it and could leak focus out of the
  trap).

Each iframe-slot tracks its **own** `inside` flag, so an A→B crossing needs no
central coordination: on the boundary, A's window-focus + deferred re-read sees
its iframe is no longer active and clears; B's sees its iframe is now active and
sets. The two flags converge with no shared state.

The shared **registry** (`createIframeSlotRegistry`) is what lets each slot's
`deriveIntercept` see its siblings. The host creates one registry and passes it
to every `useIframeSlot` in the trap; each slot registers an `isEnterable`
probe. When the host toggles an iframe's lock/content-only state — changing
`isEnterable` without changing membership — it calls `registry.notifyChange()`
(from an effect, *after* React commits the new `tabindex`, since the registry
reads it live), and every slot re-runs `refreshIntercept`.

> **Known limitation (single content slot).** The trap routes `focusContent` to
> exactly one slot — its `contentSlot` — and `useIframeSlot` sets
> `contentSlot` to its own slot name. So a trap containing two iframe-slots can
> designate only **one** of them for *programmatic* entry; native Tab flow
> between them works, but a wrap or `enterTrap` can only land on the designated
> one. Generalizing `focusContent` to be per-slot was left out of scope — see
> [iframe-slot-design.md](iframe-slot-design.md). The demo's multi-iframe
> scenario documents the rough edge.

## 8. Cooperating interactives (the transport)

Everything above is the **non-cooperating** path, and it is the safe default: it
needs nothing from the iframe. An interactive that *does* run focus-aware code
can opt into a richer path by supplying a `FocusTransport` — a minimal,
symmetric `send`/`onMessage` channel over whatever real transport the host has
(e.g. iframe-phone). The library defines its **own** message vocabulary
(`FocusMessage` in `focus-messages.ts`) and never imports a concord package; a
host adapter maps the concrete wire types to/from `FocusMessage`.

When a transport is present, `IframeSlot` subscribes on `attach`. The
interactive declares itself focus-aware with a `capability` message (or the host
calls `notifyCapability`), which sets the `cooperating` flag. Cooperation changes
two things:

- **Programmatic entry becomes precise.** Instead of a landing hint,
  `focusContent` sends `focusEnter { forward | reverse }` and the interactive
  places entry focus on its own first/last control. `requestRestore` likewise
  sends `focusEnter { restore }`. No sentinel hint is shown.
- **The interactive can report exits it traps internally.** An inbound
  `focusExit { forward | reverse }` drives `onExit(±1)` (cycle to the adjacent
  slot); `focusExit { escape }` requests a full trap exit (`onRequestExit` →
  `exitTrap`). This covers the cases sentinels can't see: Escape inside the
  frame, and an interactive that traps Tab internally so it never reaches a
  sentinel.

Capability can arrive late or never; because the non-cooperating path already
works, a missing handshake never breaks entry or exit — cooperation only **adds**
precision. The live-Tab entry path stays native either way: even a cooperating
host slot sends no message there, because the positioner + native descent already
place focus. (On the host side, inbound `focusEnter` / `trapStateChanged` /
`focusReady` are ignored — they belong to the child side of the protocol.)

## 9. What the host must guarantee

Because focus moves and attribute toggles happen **imperatively inside DOM
events**, the host has to keep the sentinel nodes stable and stay out of the
library's way. `useIframeSlot` enforces most of this by construction, but the
contract is:

- **Render each sentinel unconditionally, with a stable key.** Spread the
  returned `beforeSentinelProps` / `afterSentinelProps` — which are **ref + key
  only**. Never `{cond && <sentinel/>}`, never a changing key. A removed or
  remounted node drops focus to `document.body` mid-event.
- **Don't write the dynamic attributes.** The library is the single imperative
  writer of `tabindex`, `data-show-hint`, and the toggled `aria-label` on the
  sentinels. A second, React-controlled writer would clobber it on the next
  re-render and race the in-event `.focus()`. (Attribute changes alone never
  remount a node, so the node stays put across the focus event.)
- **De-tab the iframe while the trap is dormant.** The focus system never writes
  the iframe's `tabIndex`, so the host must keep an enterable iframe out of the
  tab order whenever its trap is inactive — gate it on `isTrapped`
  (`isTrapped ? 0 : -1`). An enterable iframe left tabbable while dormant is a
  stray native tab stop that Shift+Tab can fall into from outside the container,
  and once focus is in a cross-origin frame the parent can't redirect it. This is
  the general managed-slot rule from
  [trap-composition.md](trap-composition.md#managed-slots-must-be-de-tabbed-while-the-trap-is-inactive).
- **Map the content slot to the iframe wrapper** in the strategy's `getElements`,
  so the trap's tabindex sweep skips the wrapper and its descendants
  (`getManagedSlotElements` includes `nativeTabSlots`), leaving the iframe's
  host-set `tabIndex` and the sentinels' toggled `tabindex` untouched.

`useIframeSlot` uses **callback refs** that re-bind the core's listeners whenever
a sentinel mounts, unmounts, or is replaced (`syncListeners`), so deferred mounts
and re-mounts work; `attach`/`detach` are idempotent, so React StrictMode's
dev-time mount/unmount/remount is safe.

## 10. Caveats and deliberate limitations

### Why landing instead of focusing the frame

The obvious way to place focus inside a non-cooperating iframe programmatically
would be `iframe.focus()` — focus the frame *element* and let the user take it
from there. We deliberately don't, because it strands the user. Focusing the
iframe element shows **no focus ring** and gives no cue that focus has even
moved, let alone that another Tab is needed to reach the controls inside; and on
a cross-origin frame the parent can't draw or place any indicator within it. The
result is **invisible focus** — a keyboard user can't tell where they are.

Landing mode is the alternative: focus comes to rest on a sentinel that shows a
visible, labeled "Press Tab to enter …" hint, so the user can both *see* that
focus has arrived and knows the single keystroke that takes them in. The price is
that one explicit Tab — accepted by design, since the alternative is invisible
focus. (`iframe.focus()` survives only as a deep fallback for the degenerate case
where no sentinel is available.) This price applies only to *programmatic* entry;
live-keydown entry still descends in one seamless keystroke (§5), because there
is a host keydown to ride.

### Other caveats

- **Inside-tracking is a heuristic.** A native Tab *into or out of* the iframe
  fires no `focus`/`blur` on the iframe **element** (unlike an ordinary element,
  and unlike click/programmatic entry, which do — §4), so `inside` is inferred
  from window `blur`/`focus` plus a deferred `activeElement` re-read (§4). The exact tick timing is browser-dependent (hence
  the Safari `leavingIframe` flag), and edge cases such as focus leaving to another
  top-level window or browser chrome, very rapid Tab sequences might cause problems. The exit redirect itself is synchronous, but
  it is **gated on** this tracking — `handleSentinelFocusIn` redirects only while
  `inside` or `leavingIframe` is set.
- **Solo-iframe wrap is intentionally asymmetric.** When the iframe is the trap's
  only slot, the after sentinel can be landed on. A forward wrap exits to the after sentinel, which then focuses the before sentinel in landing mode. A reverse wrap exits to the before sentinel, which then focuses the after sentinel in landing mode. This landing on the after sentinel seems inconsistent, but it required less logic so it is how we left it for now.
- **Sentinel screen-reader behavior is a host concern.** The sentinels are
  zero-size and host-styled; whether a screen reader announces the landing hint
  usefully, and stays quiet on the silent positioner/exit sentinels, depends on
  the host's markup. Tracked in AP-108.
- **Native cross-boundary descent isn't unit-tested here.** jsdom has no real
  cross-frame focus model, which is exactly the browser step the sentinel design
  delegates. In-repo tests (vitest + jsdom) cover everything JS-observable —
  flag tracking, tabindex toggling, exit detection, intercept derivation, the
  positioner/landing selection, the self-focus guard — but the real native
  descent, the load-bearing browser step, has no automated coverage; it has been
  validated only by manual testing in real browsers (Chrome / Firefox / Safari).

For alternatives that were considered and **not** taken — emitting
`focusEnter { forward | reverse }` on the live-Tab path, building modality
detection into the generic trap, generalizing `focusContent` to multiple content
slots — see [iframe-slot-design.md](iframe-slot-design.md).
