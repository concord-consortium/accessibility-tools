# iframe-slot support for focus traps

This document specifies the `@concord-consortium/accessibility-tools`
changes needed to let a focus trap contain a **cross-origin interactive
rendered in an iframe**. It is the per-repo implementation spec for the
`accessibility-tools` portion of **AP-108** ([Focus Traps for Cross-Origin
Interactives](https://concord-consortium.atlassian.net/browse/AP-108)); the
strategy-contract extension it describes is tracked under
[LARA-215](https://concord-consortium.atlassian.net/browse/LARA-215).

Read [trap-composition.md](trap-composition.md) first — this work adds a new
kind of self-managed slot (an iframe across an origin boundary) and builds
directly on the slot model described there.

## Background: why the existing trap can't see an iframe

The current trap is single-document. It listens for `keydown` on `document`,
manages `tabindex` on a container's descendants, and releases via
`findNextFocusableOutside` ([dom-utils.ts:196](../src/hooks/dom-utils.ts#L196)) —
all within one document. An iframe is opaque to all of it:

- **Keyboard events inside the iframe never reach the parent.** A capture-phase
  `document` `keydown` listener does not fire for keystrokes while focus is
  inside the iframe (true cross-origin, and also same-origin — DOM events don't
  cross the document boundary). So the trap's `tabHandlers` / `escapeHandlers`,
  which all fire from that `keydown` listener, are blind to anything happening
  inside the iframe.
- **The parent can't reach across a cross-origin boundary.** It can't enumerate
  or `.focus()` an element inside the interactive; `iframe.focus()` lands on the
  iframe *element*, not a chosen inner element.
- **`relatedTarget` is nulled across a cross-origin boundary**, so focus events
  on the parent side can't name where focus came from inside the iframe.

What the parent *can* observe is focus-related events plus DOM elements it fully
controls (sentinels), with an optional message channel (the transport) layered on
top for the things neither can do alone. But observing **when focus is inside the
iframe** is subtler than it first looks. The iframe *element*'s own `focus`/`blur`
fire only for **click** and **programmatic** (`iframe.focus()`) entry — **not**
for a native Tab that descends across the boundary, where the element silently
becomes `document.activeElement` with no event dispatched. Native descent is
instead observed on the **top window**: focus entering the subframe blurs the
window and focus returning to the host focuses it, after which the parent re-reads
`document.activeElement` to confirm which side holds focus. The core combines both
signals — see [§3](#3-the-iframe-slot-core-framework-agnostic).

What is **not** a gap: sequential Tab and Shift+Tab cross iframe boundaries
natively. A forward Tab into an iframe lands on its first focusable; a Tab past
its last returns to the next focusable in the parent; Shift+Tab is symmetric.
This works cross-origin with no cooperation. The design leans on this — the trap
only intervenes to *position* the browser for that native traversal, and to
detect when it crosses the boundary.

## Scope

### This library owns

- An **iframe-slot abstraction**: a framework-agnostic core plus a thin React
  hook. It tracks `focusInsideIframe`, owns the sentinels' dual behavior
  (invisible **positioner** for live-keydown entry; visible labeled **landing**
  hint for programmatic entry), provides the slot's `focusContent`, and
  (optionally) speaks a focus protocol over an injected transport.
- A **`nativeTabSlots` strategy field** and the corresponding reorder of the
  trap's `preventDefault` so a slot can hand off to the browser's native Tab
  traversal.
- A **programmatic slot-cycling API** (`cycleToAdjacentSlot`) on both
  `FocusTrapResult` and `FocusTrapController`, so the iframe-slot can drive
  cycling from a `focusin` or a protocol message rather than from `keydown`.
- An **abstract transport interface** (`FocusTransport`) and a **self-contained
  focus-message vocabulary** (`FocusMessage`).
- Extending `setChildrenNonTabbable` so the iframe-slot is excluded from the
  `tabindex` sweep.
- An **opt-out of exit-refocus** (`exitTrap({ refocus: false })`) so a host can
  release the trap without yanking focus back to the container when focus has
  already legitimately left it (§9). Not iframe-specific, but it ships here.

### This library does not own (and must not depend on)

- iframe-phone / `ParentEndpoint`, `interactive-api-host`'s `FocusManager`, or
  `lara-interactive-api`'s wire types. `accessibility-tools` stays
  concord-dependency-free (see [Self-contained message
  vocabulary](#7-self-contained-focus-message-vocabulary)).
- react-modal, the host-rendered close control, the focus ring. Those are
  Activity Player's job.
- **Rendering** the sentinel DOM. The host renders the nodes and supplies refs;
  the library owns their *behavior*.

## Design

### 1. `nativeTabSlots` and the `preventDefault` reorder

Today the trap calls `e.preventDefault()` **before** entering the next slot, in
every Tab-cycling path — [use-focus-trap.ts:275](../src/hooks/use-focus-trap.ts#L275),
[use-focus-trap.ts:320](../src/hooks/use-focus-trap.ts#L320), and the controller's
equivalent at
[focus-trap-controller.ts:373-401](../src/hooks/focus-trap-controller.ts#L373-L401).
That unconditional `preventDefault` is correct for normal slots (we don't want
the browser to *also* move focus) but wrong for an iframe-slot, which needs the
browser's native Tab to run so it descends into the iframe.

**New strategy field:**

```ts
interface FocusTrapStrategy {
  // ...existing fields...

  /**
   * Slot names whose entry hands off to the browser's native Tab
   * traversal. When the trap cycles into one of these slots it calls
   * focusContent (to position the browser) but does NOT call
   * preventDefault, so the browser's default Tab action runs from the
   * now-focused element. Default: [].
   */
  nativeTabSlots?: string[];
}
```

**Trap change:** in each Tab-cycling path, compute the target slot name first;
if it is in `nativeTabSlots`, call `focusContent` (the positioner) and **skip**
`preventDefault`; otherwise keep today's `preventDefault`-then-focus behavior.
`focusContent`'s return type stays `boolean` — the "don't preventDefault"
decision is declarative and per-slot, deliberately decoupled from
`focusContent`'s "did I handle focus" signal.

Note the ordering subtlety this depends on, verified empirically in AP-108
across Chrome / Firefox / Safari (macOS): focusing the sentinel *synchronously*
inside the `keydown` handler and then returning without `preventDefault` causes
the browser to run its Tab default action **from the now-current
`activeElement`** (the sentinel), descending into the iframe from there.

### 2. Tab-key entry is native-descent via sentinels

> **This refines AP-108.** AP-108 describes a cooperating path where the
> interactive places entry focus itself via `focusEnter { forward | reverse }`.
> Because the chosen `nativeTabSlots` field is *static* per slot name, the
> "should I preventDefault on entry" decision cannot depend on runtime
> cooperation state. We resolve this by making **Tab entry uniform** for
> cooperating and non-cooperating interactives alike: it always goes through the
> sentinel positioner + native descent.

The sentinel positioner already lands entry focus correctly in both directions:

- **Forward Tab** → focus the **before-sentinel** → native descent lands on the
  iframe's **first** focusable.
- **Reverse Shift+Tab** → focus the **after-sentinel** → native descent lands on
  the iframe's **last** focusable.

This is correct without any message, so `focusEnter { forward | reverse }` is
**redundant for entry** and the host iframe-slot never emits it on the Tab path.
The protocol is layered *off* the `keydown` path, for the three things sentinels
can't do:

- `focusExit { escape }` — Escape-to-exit (the trap never sees the keystroke).
- `focusExit { forward | reverse }` — directional exit when the interactive
  traps Tab **internally** and never lets it reach a sentinel.
- `focusEnter { restore }` — re-focus the interactive's last element after an
  AP-owned overlay (e.g. an alert) closes.

**This positioner trick has one precondition: a live Tab keydown in the parent
frame.** The browser's *pending* Tab default action is what descends from the
sentinel. When entry is driven by a live keydown — a Tab from a previous slot —
the sentinel is a silent invisible **positioner** and focus passes straight
through it into the iframe. When entry is *programmatic* (no live keydown:
opening the overlay, wrap-around, focus restore), there is nothing to descend
with, so the same sentinel is used in a second **landing** mode — briefly visible
and labeled — and the user's *next* Tab descends. Programmatic entry is its own
substantial case; it is specified in [§4](#4-programmatic-entry-and-multiple-iframe-slots).

**Consequence — capability timing is robust.** Sentinels work regardless of
cooperation, so the trap's safe default *is* the non-cooperating path. A late or
never-arriving `focusProtocol` handshake can't break entry/exit; declaring the
capability only **adds** precision on top of the working default — escape-to-exit,
restore, and `focusEnter { forward | reverse }` for **programmatic** entry, which
lets a cooperating iframe skip the visible landing sentinel (§4). What stays
unused is `focusEnter` on the **live-Tab** path: there the positioner + native
descent already place focus, so the host slot sends no message.

### 3. The iframe-slot core (framework-agnostic)

A standalone `IframeSlot` (factory/class), mirroring the agnostic-core split the
package already uses for `FocusTrapController`. It is constructed with element
accessors, an optional transport, and a cycle callback wired to the trap:

```ts
interface IframeSlotOptions {
  /** The slot's name in the strategy's cycleOrder (e.g. "content"). */
  slotName: string;
  getIframe: () => HTMLIFrameElement | null;
  getBeforeSentinel: () => HTMLElement | null;
  getAfterSentinel: () => HTMLElement | null;
  /** Move the trap to the adjacent slot (wired to cycleToAdjacentSlot). */
  onExit: (direction: 1 | -1) => void;
  /**
   * Per-direction: should a forward / reverse exit from this iframe be
   * intercepted by the trap (tabbable sentinel) or left to the browser's
   * native cross-iframe traversal (untabbable sentinel)? Derived by the
   * trap from cycleOrder + DOM order — see § Multiple iframe-slots.
   */
  getIntercept: () => { forward: boolean; reverse: boolean };
  /** Optional cooperating-path channel. Absent ⇒ non-cooperating. */
  transport?: FocusTransport;
}
```

Responsibilities:

- **Track `focusInsideIframe`** from two complementary signals, because no single
  one covers every entry path:
  - The iframe *element*'s `focus`/`blur` catch **click** and **programmatic**
    `iframe.focus()` entry/exit — those paths do dispatch element-level events.
  - A native **Tab** across the boundary does **not** fire `focus`/`blur` on the
    iframe element (it silently becomes, or ceases to be, `document.activeElement`),
    so element-level listeners miss it. The reliable cross-origin signal is on the
    **top window**: focus entering the subframe blurs the window; focus returning
    to the host focuses it. On either window event the core re-reads
    `document.activeElement` on a **deferred tick** (some browsers update it just
    after the event fires) and flips the flag when `activeElement === the iframe`
    changes. That deferred read is the single source of truth, so window `blur` and
    `focus` share one handler.

  Either way the flag ends up correct, so the rest of the core (sentinel toggling,
  exit detection, landing-clear) needs no special-casing per entry path.
- **Toggle each sentinel's `tabindex` `0` ↔ `-1`** on that transition. A
  sentinel is `tabindex=0` only while `focusInsideIframe === true` **and** that
  direction must be intercepted (`getIntercept().forward` for the after-sentinel,
  `.reverse` for the before-sentinel) — so native Tab walking out of the iframe
  lands on a sentinel *only where the trap needs to redirect*. Where the neighbor
  is a natively-traversable adjacent iframe, the in-between sentinels stay
  `-1` and the browser flows straight across (see § Multiple iframe-slots). At
  rest sentinels are `tabindex=-1`: programmatically focusable (so the positioner
  works) but never a normal Tab stop, so users never land on them entering the
  iframe.
- **Own `focusin` listeners on the sentinel elements directly** (not via the
  trap's `document` listener). A sentinel firing while `focusInsideIframe ===
  true` is unambiguously an **exit**; direction comes purely from *which*
  sentinel fired (before → `onExit(-1)`, after → `onExit(+1)`) — no reliance on
  `relatedTarget`. The redirect is synchronous; the sentinel never rests on the
  exit path.
- **Provide `focusContent(ctx)`** in one of two modes, selected by a trigger the
  trap passes in `FocusContentContext` (live Tab keydown cycling ⇒ positioner;
  programmatic entry — `enterTrap` or `cycleToAdjacentSlot` ⇒ landing) — so the
  choice never relies on inferring intent from a focus event:
  - **Positioner mode** (called during a live Tab keydown, via the trap's
    `nativeTabSlots` path): forward → focus before-sentinel, reverse → focus
    after-sentinel; keep the sentinel silent and invisible; return `true`. The
    trap skips `preventDefault`, and the pending Tab default descends. Focus never
    rests on the sentinel.
  - **Landing mode** (called programmatically — `cycleToAdjacentSlot` or restore,
    with no live keydown): focus the directional sentinel and toggle it to its
    **visible + labeled** state (a `data-landing`/class the host styles, plus a
    host-supplied "Press Tab to enter …" label). Focus *rests*; the user's next
    Tab descends (see the trap rule below). The hint is a "focus-is-here"
    affordance, so it lives exactly as long as the sentinel holds focus: it is
    cleared the moment focus leaves the sentinel — whether by descending into the
    iframe (handled on iframe entry) **or** by leaving without descending (Escape /
    trap exit, click away), which the slot catches with a `focusout` listener on
    each sentinel. Without that, an Escape on a resting sentinel would leave the
    hint stuck visible. See [§4](#4-programmatic-entry-and-multiple-iframe-slots).
- **Distinguish the core's own focus moves from user/native ones.** Both
  positioner and landing modes call `.focus()` on a sentinel, and that move
  synchronously fires `focusout` on the previously-focused sentinel and `focusin`
  on the target — the very events the exit-detection and landing-clear listeners
  react to. Unguarded, focusing the *entering* sentinel for a landing blurs the
  *leaving* one, whose `focusout` would wipe the `data-landing` just set (and whose
  `focusin` could be mis-read as another exit while `focusInsideIframe` is still
  stale-true). So the core brackets every sentinel `.focus()` it issues with a
  flag, and the `focusin`/`focusout` handlers ignore events fired during that
  window. A genuine native exit, an Escape/click-away clear, and a descent all
  occur with the flag clear, so they are unaffected. This bites hardest on a
  **single-iframe wrap** — Tab out of the only iframe slot hits its after-sentinel
  (exit), and `cycleToAdjacentSlot` lands back on its own before-sentinel, so the
  leaving and entering sentinels are the same slot's.
- **Drive the trap's "Tab from a resting sentinel" rule.** When a *parent* Tab
  keydown fires while the current slot is this iframe-slot, focus must be on one
  of its sentinels (the only parent-focusable elements it owns). The trap then
  resolves four cases: forward + before-sentinel → skip `preventDefault` (native
  descent, clear landing); forward + after-sentinel → `preventDefault` + cycle to
  next slot; and the Shift+Tab mirror (reverse + after → descend; reverse + before
  → cycle to prev). A `focusin` on a sentinel while `focusInsideIframe === false`
  in landing mode is a rest, **not** an exit, and is left alone.
- **With a transport**, translate protocol ↔ trap actions: inbound `focusExit {
  forward | reverse }` → `onExit(±1)`, `focusExit { escape }` → request a
  trap exit, the capability signal → enable cooperating extras; and send
  `focusEnter { restore }` when the host calls `requestRestore()`. Cooperating
  programmatic entry uses `focusEnter` (precise) and **never** needs landing mode.

The host renders `[before-sentinel][iframe][after-sentinel]` and passes the refs
in. Sentinels are **zero-size with no accessible name** in positioner and exit
modes, so screen readers don't dwell on them; in **landing mode** a sentinel
becomes a visible, labeled "Press Tab to enter …" hint (a deliberately announced
affordance). Both stylings are host-rendered; the library only toggles the state.
(Confirming SR behavior of both modes is a host concern AP-108 tracks.)

### 4. Programmatic entry and multiple iframe-slots

There are two ways focus enters an iframe-slot, and they need different
mechanisms:

- **Live-keydown entry** — a Tab from a previous slot is being processed in the
  parent. The §2 positioner descends natively. This is the seamless common case.
- **Programmatic entry** — focus must be placed inside the iframe with **no live
  parent Tab keydown** to descend with. This happens more often than the
  wrap-around case alone:
  - **Trap entry that isn't a Tab** — opening the overlay, or activating a
    trigger with Enter/click, when the first slot is an iframe.
  - **Wrap-around** — forward-Tab out of the last iframe must return to the first
    slot; native traversal goes *DOM-forward toward the page* and can't wrap
    backward, so the trap must move focus itself.
  - **Focus restore** — an AP-owned overlay (e.g. an alert) closes via Escape or
    Enter and focus must return into the iframe it came from.

For a **non-cooperating** iframe, programmatic entry **cannot descend** — there
is no pending Tab default. So the iframe-slot uses **landing mode** (§3): it
focuses the directional sentinel and toggles it visible + labeled ("Press Tab to
enter …"). Focus rests there; the user's next Tab is a live keydown and descends
via the trap's "Tab from a resting sentinel" rule. The result is a visible,
announced hint — *not* a silent landing on the invisible iframe body, and never
stuck. For a **cooperating** iframe, programmatic entry instead sends
`focusEnter { forward | reverse | restore }` and the interactive places focus
precisely — no landing needed.

`iframe.focus()` is kept only as a **deep fallback** for the degenerate case
where a sentinel is somehow unavailable; landing mode supersedes it as the
primary behavior.

**Live-keydown entry between adjacent iframes is still native.** Two iframe-slots
adjacent in both DOM order and `cycleOrder` (nothing tabbable between them) let
the browser move focus A→B (and B→A on Shift+Tab) on a single Tab — *if we don't
interrupt it*. The interrupt is a tabbable sentinel, so a sentinel is made
tabbable (`getIntercept`) **only** where its directional neighbor needs
interception:

- the trap's outer **boundary** (forward exit from the last slot / reverse exit
  from the first → wrap), or
- a **non-iframe slot** (which the trap focuses programmatically), or
- a non-DOM-adjacent or non-enterable iframe (e.g. a content-only neighbor whose
  iframe is `tabindex=-1`; native Tab would skip it and could leak out of the
  trap, so that direction must be intercepted).

When the neighbor *is* a DOM-adjacent, enterable iframe-slot, both in-between
sentinels stay `-1` and native traversal flows across in one keystroke. The trap
derives the per-direction `intercept` flags from `cycleOrder` + DOM order (via
`compareDocumentPosition`) and recomputes them when the strategy or slot elements
change. Each iframe-slot tracks its own `focusInsideIframe` independently, so
"focus moved A→B" needs no central detection: on the boundary crossing each slot's
own window-`blur`/`focus` + deferred `document.activeElement` re-read settles its
flag (A sees `activeElement` is no longer its iframe and clears; B sees it is now
its iframe and sets). For click / programmatic moves the iframe elements' own
`focus`/`blur` do the same. Either way the two flags converge with no shared
state.

**Note on AP's close control.** AP-108 mandates a host-rendered, keyboard-focusable
**close control** in the overlay. As a *normal* slot in the cycle it is itself a
fine programmatic-entry landing (visible, native focus), so in AP's overlays a
wrap often lands on the close control rather than re-entering an iframe at all.
Landing mode is what makes the **general** all-iframe trap (no normal bookend)
behave well too.

### 5. Programmatic slot-cycling API

The iframe-slot needs to advance the trap from a `focusin` or a protocol
message, not from `keydown`. Today slot cycling is internal state
(`slotIndex` in the controller) with no public entry point beyond
`isTrapped` / `enterTrap` / `exitTrap`.

> **Note (2026-06-13):** `useFocusTrap` no longer returns a separate
> `FocusTrapResult` wrapper — it returns the `FocusTrapController` instance
> directly, so the consumer-facing surface below *is* the controller's public
> API. See [the deferred-controller
> plan](superpowers/plans/2026-06-13-deferred-focus-trap-controller.md).

**The consumer-facing surface (on `FocusTrapController`):**

```ts
class FocusTrapController {
  get isTrapped(): boolean;
  enterTrap(): void;
  exitTrap(options?: { refocus?: boolean }): void;
  /**
   * Advance the trap to the next (1) or previous (-1) slot from the
   * current one and focus it — the same path Tab cycling uses. Intended
   * for self-managed slots (e.g. an iframe-slot) that detect a boundary
   * crossing outside the keydown path.
   */
  cycleToAdjacentSlot(direction: 1 | -1): void;
}
```

Internally `cycleToAdjacentSlot` reuses the existing
`findNextSlot` + `focusSlot` machinery so behavior is identical to a Tab cycle,
including wrap-around.

`cycleToAdjacentSlot` is a **programmatic** entry point, so when it lands on an
iframe-slot it invokes `focusContent` in **landing** mode (§3/§4); the trap's own
live Tab keydown cycling invokes it in **positioner** mode. `enterTrap` is
**also** programmatic — it has no pending Tab default to descend with — so the
initial slot focus it performs likewise enters a content slot in **landing**
mode; otherwise focus would rest silently on the invisible before-sentinel with
no hint. (The live-Tab *engage* paths don't run through `enterTrap`, so
positioner there is unaffected.) The trap signals positioner vs landing by
extending `FocusContentContext` with a `trigger`
(`"sequentialNavigation" | "programmatic"`) alongside the existing `entryMode`.
The name describes the browser-navigation function, not the literal key — an
Enter/click that engages the trap is `"programmatic"`, because it carries no
pending native focus advance to descend with.

**React wiring and the build-order cycle.** The strategy passed to
`useFocusTrap` must reference the iframe-slot's `focusContent`; the iframe-slot's
`onExit` must reference the trap's `cycleToAdjacentSlot`. To break the cycle, the
slot reads `onExit` through a ref refreshed each render. The thin
`useIframeSlot` hook (below) encapsulates this so the host just supplies refs and
an optional transport.

### 6. The React hook

```ts
function useIframeSlot(options: UseIframeSlotOptions): {
  /**
   * Spread onto the rendered before/after sentinel elements. This is a
   * **ref only** (plus a stable element key). It deliberately does NOT
   * include tabIndex/data-landing/aria — those are dynamic, focus-critical
   * attributes the library writes imperatively (see "React stability").
   */
  beforeSentinelProps: { ref: Ref<HTMLElement>; key: string };
  afterSentinelProps:  { ref: Ref<HTMLElement>; key: string };
  /** Merge into the FocusTrapStrategy (focusContent + nativeTabSlots entry). */
  strategyFragment: Partial<FocusTrapStrategy>;
  // strategyFragment also sets contentSlot to the iframe slot's name, because
  // the trap only routes focusContent to its contentSlot
  // (use-focus-trap.ts:97). For AP's overlays the iframe is the content slot,
  // so this is natural; a trap that needs a non-content iframe-slot would
  // require generalizing focusContent to be per-slot — out of scope here.
  /** Send focusEnter { restore } to a cooperating interactive. */
  requestRestore: () => void;
};
```

`UseIframeSlotOptions` carries the iframe + sentinel refs, the optional
transport, and a **skip-link label** (e.g. `enterLabel: "Press Tab to enter
" + interactiveName`). The host renders the label text statically inside each
sentinel; CSS shows it only while the library has set `[data-landing]`.

It instantiates the agnostic `IframeSlot`, which attaches `focus`/`blur`/`focusin`
listeners and writes `tabindex`/`data-landing` (and any toggled aria) via
`setAttribute` on the ref'd nodes — synchronously, inside the event, never through
React. It manages the `onExit`/`cycleToAdjacentSlot` ref wiring and tears down
listeners on unmount (idempotent re-attach to survive StrictMode's dev
mount/unmount/remount). The host composes it with `useFocusTrap`, renders the
sentinel DOM, owns the iframe element ref, and provides the transport adapter.

**React stability contract (required of the host).** Because focus moves and the
landing toggle happen *imperatively* inside DOM events, the sentinel nodes must
not move under React mid-event:

- Render each sentinel **unconditionally** with a **stable key** — never
  `{cond && <sentinel/>}`, never a changing key, never a swapped element type. A
  removed/remounted node drops focus to `document.body`.
- The host is **not** a writer of the dynamic attributes: it must not pass
  `tabIndex`, `data-landing`, or the toggled aria as props. The library is the
  single imperative writer; a second (React-controlled) writer would clobber it on
  the next re-render and race the in-event `.focus()`.
- This mirrors the existing trap, which already keeps slot state in refs
  (`slotIndexRef`) and mutates `tabindex` imperatively
  ([use-focus-trap.ts:54](../src/hooks/use-focus-trap.ts#L54)) so no focus move
  depends on a React commit. Attribute changes alone never remount a node, so with
  this contract the node is provably stable across the focus event.

### 7. Self-contained focus-message vocabulary

> **This refines AP-108.** AP-108 places the protocol *types* in
> `lara-interactive-api` and the *generic semantics* in `accessibility-tools`.
> To keep `accessibility-tools` concord-dependency-free (per the AP-108 layers
> table), it defines its **own** minimal vocabulary; it does **not** import
> `lara-interactive-api`.

```ts
type FocusMessage =
  | { type: "focusEnter"; mode: "forward" | "reverse" | "restore" }
  | { type: "focusExit";  mode: "forward" | "reverse" | "escape" }
  | { type: "trapStateChanged"; active: boolean }   // optional
  | { type: "focusReady" }                          // optional
  | { type: "capability"; focusProtocol: boolean };

interface FocusTransport {
  send: (msg: FocusMessage) => void;
  /** Subscribe; returns an unsubscribe function. */
  onMessage: (cb: (msg: FocusMessage) => void) => () => void;
}
```

This is the "trap-action vocabulary." `lara-interactive-api` keeps the concrete
wire types; `interactive-api-host`'s `FocusManager` maps wire ↔ `FocusMessage`.
Two independently-owned, structurally-similar vocabularies — the library never
sees iframe-phone and never imports a concord package.

The transport is symmetric: the same interface can be supplied on the **child**
(interactive) side by an interactive that uses this library for its own internal
trap and emits `focusExit`. v1's deliverable is the **host** iframe-slot; the
child side reuses the vocabulary and the existing trap and is not specified
further here.

### 8. `setChildrenNonTabbable` exclusion and the iframe `tabIndex` policy

`setChildrenNonTabbable` ([use-focus-trap.ts:54](../src/hooks/use-focus-trap.ts#L54))
sweeps everything matching `[tabindex]` to `tabindex=-1` when a trap engages.
Left alone it would clobber the iframe's host-set `tabIndex` (`0`, or `-1` when
locked / content-only) and fight the sentinel toggling.

Today the sweep already skips **managed slots** — slots present in
`tabHandlers`, via `getManagedSlotElements`
([dom-utils.ts:182](../src/hooks/dom-utils.ts#L182)) — by skipping each managed
element and its descendants (`.contains`). The iframe-slot has **no**
`tabHandler` (its Tab handling is `focusContent` + `nativeTab` + sentinel
`focusin`, none of which is a `tabHandler`), so it isn't excluded today.

**Change:** the iframe-slot's `getElements()` entry is a **wrapper** element
containing `[before-sentinel][iframe][after-sentinel]`, and
`getManagedSlotElements` is extended to also include the elements of slots listed
in `nativeTabSlots`. Excluding the wrapper excludes all three descendants via
`.contains`, so the trap never touches the iframe's `tabIndex` or the sentinels'
toggled `tabindex`. This keeps the AP-108 rule intact: the iframe element's
`tabIndex` is set by static host properties (locked / content-only) and is never
mutated by the focus system.

**Host obligation (dormant state).** Because the focus system never writes the
iframe's `tabIndex`, the host must also keep the iframe out of the tab order
while the trap is *inactive* — a locked / content-only static property is not
enough. An enterable iframe left at `tabIndex=0` (or with no `tabindex`) while
its trap is dormant is a stray native tab stop that Shift+Tab can fall into from
outside the container, and once focus is inside a cross-origin frame the parent
can't redirect it. Gate the iframe's `tabIndex` on the trap's active state
(`isTrapped ? 0 : -1`). This is one instance of a requirement that holds for
every managed slot — see
[trap-composition.md → Managed slots must be de-tabbed while the trap is inactive](./trap-composition.md#managed-slots-must-be-de-tabbed-while-the-trap-is-inactive).

### 9. Exit without refocus (host-driven release on outside click)

> **Not iframe-specific.** This is a general trap-lifecycle change that rides
> along in this PR because the same hosts hit it. Recorded here so the PR is
> self-documenting; the underlying modality policy lives in
> [trap-composition.md](trap-composition.md).

`exitTrap()` historically did one thing on release: fire `onExit`, then
`container.focus()` to pull focus back to the trap container. That is right for a
**keyboard exit** (Escape) — focus was *inside* the trap, so on release it must
land somewhere visible rather than vanish to `document.body`.

It is **wrong** when the host releases the trap *because focus has already left
the container* — the user clicked a control outside an inline, non-modal trap.
That click is the host's to handle (the library never sees it), but the host must
also tell the trap to stand down; if `exitTrap` then refocuses, it yanks focus
back from exactly where the user just put it.

**Change:** `exitTrap` takes an optional `{ refocus?: boolean }` (default `true`,
preserving Escape behavior). The host passes `{ refocus: false }` when it is
releasing in response to focus having moved out:

```ts
exitTrap(options?: { refocus?: boolean }): void;
```

Everything else — `trapped = false`, `setChildrenNonTabbable()`, `onExit`,
`announceExit` — is unchanged; only the final `container.focus()` becomes
conditional. Whether a given trap is modal (refocus / focus-guard) or inline
(let focus leave) is the **host's** policy, not the library's. This lands on
`FocusTrapController`; the `useFocusTrap` `exitTrap` can mirror the option if a
hook consumer needs it.

## Testing

`accessibility-tools` is tested with **vitest + jsdom**. jsdom cannot perform
real cross-iframe native Tab descent (no real focus model across frames), which
is precisely the load-bearing step the sentinel design hands to the browser. So
the in-repo tests cover everything **JS-observable**, and the native-descent
step is verified out-of-repo.

In-repo (jsdom) unit tests:

- `nativeTabSlots` entry calls `focusContent` and **skips** `preventDefault`;
  non-`nativeTab` slots still `preventDefault`. (Assert via a spy on the event.)
- `focusInsideIframe` tracking, both signal paths: dispatched `focus`/`blur` on
  the iframe element flip the flag (click / programmatic entry); and a dispatched
  top-window `blur`/`focus`, followed by the deferred `document.activeElement`
  re-read, flips the flag for native Tab descent (stub `activeElement` to the
  iframe, advance the timer, assert the flag — jsdom dispatches no real cross-frame
  focus events).
- Sentinel `tabindex` toggling is gated by `focusInsideIframe` **and**
  `getIntercept`: an intercepted direction goes `0` while focus is inside; a
  native-flow direction (adjacent enterable iframe neighbor) stays `-1`.
- Sentinel `focusin` while `focusInsideIframe === true` calls `onExit` with the
  correct direction (before → `-1`, after → `+1`); a sentinel `focusin` while
  the flag is `false` does **not**.
- `getIntercept` derivation from `cycleOrder` + DOM order: adjacent enterable
  iframe neighbor → not intercepted; trap boundary, normal-slot neighbor, or
  `tabindex=-1` (content-only) iframe neighbor → intercepted.
- **Positioner vs landing selection:** `focusContent` with
  `trigger: "sequentialNavigation"` focuses the sentinel and leaves
  `data-landing` unset; `cycleToAdjacentSlot`
  into a non-cooperating iframe-slot focuses the directional sentinel and **sets**
  `data-landing` (the visible-hint state). Cooperating entry sends `focusEnter {
  forward | reverse | restore }` and sets no landing state.
- **Tab from a resting sentinel:** with focus on the before-sentinel and
  `focusInsideIframe === false` (landing), a forward Tab skips `preventDefault`
  and clears `data-landing`; a forward Tab on the after-sentinel `preventDefault`s
  and cycles to the next slot; Shift+Tab mirrors both.
- **Landing hint clears on focus-out:** after a landing sets `data-landing`, a
  `focusout` dispatched on the sentinel (focus leaving without descent — Escape /
  trap exit, click away) clears `data-landing`, on both before- and after-sentinels.
- **Self-focus guard (single-iframe wrap):** with focus already on the leaving
  sentinel, a programmatic landing on the other sentinel keeps its `data-landing`
  (the leaving sentinel's `focusout` must not wipe it), and the landing `focusin`
  does not fire `onExit` even while `focusInsideIframe` is still true. (jsdom does
  dispatch `focusout`/`focusin` on `.focus()`, so this is exercisable in-repo.)
- Transport translation against a **mock transport**: inbound `focusExit {
  forward | reverse | escape }` and `capability`; outbound `focusEnter { restore
  }` on `requestRestore()`.
- `cycleToAdjacentSlot` advances/wraps the slot index identically to a Tab cycle,
  on both `useFocusTrap` and `FocusTrapController`.
- `setChildrenNonTabbable` leaves the iframe-slot wrapper, the iframe, and the
  sentinels untouched.
- **Exit refocus opt-out (§9):** `exitTrap()` releases and refocuses the container
  (spy on `container.focus`); `exitTrap({ refocus: false })` releases and fires
  `onExit` but does **not** refocus the container.
- **React stability:** the library writes `tabindex`/`data-landing` via
  `setAttribute` (assert the host's render never sets them); and a host re-render
  while focus rests on a landing sentinel keeps the **same** DOM node
  (`document.activeElement` unchanged, attributes intact) — guarding the
  stable-key/unconditional-render contract.

**Out of repo (deliberately not added here):** the real-browser end-to-end —
sentinel positioner → native descent forward/reverse, native Tab-out → sentinel
→ cycle, cross-origin `relatedTarget` nulling, and the cooperating protocol over
real postMessage — is covered by AP-108's Activity Player / testbed Playwright
work, where the real iframe content and transport exist. Adding a parallel
browser harness here would mostly test the browser, not this library's code.

## Open questions / risks

- **Window-focus inside-tracking is a heuristic.** Native Tab across the iframe
  boundary dispatches no element-level `focus`/`blur`, so the core infers
  inside/outside from the top window's `blur`/`focus` plus a deferred
  `document.activeElement` re-read (§3). The deferred tick exists because some
  browsers update `activeElement` just *after* the window event; the exact timing
  is browser-dependent and the read — not the event — is the source of truth.
  Edge cases to validate in the AP/testbed pass: focus leaving to another top-level
  window or browser chrome (window `blur` with `activeElement` still the iframe),
  and rapid Tab sequences that fire multiple window events before a tick settles
  (the timer is debounced, so only the latest read wins). The synchronous
  sentinel-`focusin` exit path is unaffected — it does not depend on this tracking.
- **Sentinel screen-reader behavior, both modes.** Confirm screen readers do not
  dwell on the zero-size, unnamed sentinels in positioner/exit mode given the
  synchronous redirect; and confirm the **landing-mode** visible "Press Tab to
  enter …" hint is announced usefully (role, timing) when focus rests on it.
  (Host rendering concern; tracked in AP-108.)
- **Landing label wording / SR phrasing.** "Press Tab to enter …" is the working
  label; the exact text and any `aria` role wants real-SR validation. Settle in
  the AP/testbed pass.
- **Interaction with the controller's `focusin` auto-enter.** The controller
  already has a `document` `focusin` handler that can auto-enter the trap
  ([focus-trap-controller.ts:169](../src/hooks/focus-trap-controller.ts#L169)).
  The iframe-slot's element-level sentinel `focusin` redirect must route through
  `cycleToAdjacentSlot` so the trap's `slotIndex` stays consistent and the two
  handlers don't fight. Verify ordering when both fire.
- **`focusEnter { forward | reverse }` kept-or-cut.** Unused by v1's host slot for
  Tab *entry* (§2), but it **is** the cooperating programmatic-entry path (§4) —
  so it earns its place. Only the non-emission on the live-Tab path is the
  refinement.
- **Programmatic entry into a non-cooperating iframe costs one explicit Tab
  (accepted, by design).** Landing mode makes this a *visible, labeled* hint the
  user Tabs through — not a silent stop on the iframe body, and never stuck (§4).
  The single-keystroke seamlessness only exists for live-keydown entry; this is
  inherent (no parent keydown to descend with) and the visible hint is the chosen
  UX. `iframe.focus()` survives only as a deep fallback when no sentinel exists.
- **Cross-browser native descent** is assumed from AP-108's empirical findings
  (Chrome / Firefox / Safari, macOS). This spec adds no in-repo guard for it; a
  regression in browser behavior would surface only in AP's browser tests.
