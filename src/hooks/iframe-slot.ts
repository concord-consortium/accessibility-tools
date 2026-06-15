/**
 * IframeSlot — framework-agnostic core for an iframe focus-trap slot (§3, §4).
 *
 * Mirrors the agnostic-core split used by FocusTrapController. The host renders
 * [before-sentinel][iframe][after-sentinel] and supplies accessors; this core
 * owns their behavior. See docs/iframe-slot-design.md.
 */

import type { FocusMessage, FocusTransport } from "./focus-messages";
import type { FocusContentContext } from "./types";

export interface IframeSlotOptions {
  /** The slot's name in the strategy's cycleOrder (e.g. "content"). */
  slotName: string;
  getIframe: () => HTMLIFrameElement | null;
  getBeforeSentinel: () => HTMLElement | null;
  getAfterSentinel: () => HTMLElement | null;
  /** Move the trap to the adjacent slot (wired to cycleToAdjacentSlot). */
  onExit: (direction: 1 | -1) => void;
  /** Request a full trap exit (wired to exitTrap). Used for inbound escape. */
  onRequestExit?: () => void;
  /**
   * Per-direction: should a forward / reverse exit be intercepted by a
   * tabbable sentinel (true) or left to native cross-iframe flow (false)?
   */
  getIntercept: () => { forward: boolean; reverse: boolean };
  /** Optional cooperating-path channel. Absent ⇒ non-cooperating. */
  transport?: FocusTransport;
  /**
   * Visible-hint label written/announced when the hint is shown. The host renders the
   * text statically; this is used only for an aria fallback if provided.
   */
  enterLabel?: string;
}

export class IframeSlot {
  private options: IframeSlotOptions;
  private inside = false;
  private attached = false;
  private cooperating = false;
  private unsubscribeTransport: (() => void) | null = null;
  private insideSyncTimer: ReturnType<typeof setTimeout> | null = null;
  // True while WE are programmatically focusing a sentinel. The sentinel
  // focusin/focusout handlers below react to USER/native focus changes (detect
  // an exit; clear the landing hint) — they must ignore our own focus moves,
  // which would otherwise wipe a landing hint as we set it (focusing the
  // entering sentinel blurs the leaving one) or mis-read a self-inflicted exit.
  private movingFocus = false;

  // Elements each set of listeners is currently bound to. syncListeners() rebinds
  // only when these differ from the live getters, so deferred mounts and
  // re-mounts move the listeners precisely and detach() removes the right ones.
  private boundIframe: HTMLIFrameElement | null = null;
  private boundBefore: HTMLElement | null = null;
  private boundAfter: HTMLElement | null = null;

  // Bound listeners for clean add/remove.
  private boundIframeFocus = () => this.handleIframeFocus();
  private boundIframeBlur = () => this.handleIframeBlur();
  private boundBeforeFocusIn = () => this.handleSentinelFocusIn(-1);
  private boundAfterFocusIn = () => this.handleSentinelFocusIn(1);
  // The landing hint is a "focus rests here — press Tab to enter" affordance, so
  // it must only show while a sentinel is focused. Clear it whenever focus
  // leaves a sentinel for any reason other than descent (Escape/trap exit, click
  // away). Descent also clears via handleIframeFocus, so this is idempotent.
  private boundSentinelFocusOut = () => this.handleSentinelFocusOut();
  // Native Tab descent does NOT fire focus/blur on the iframe ELEMENT, so we
  // also track entry/exit from the top window's blur/focus (§ below).
  private boundWindowFocusChange = () => this.scheduleInsideSync();

  constructor(options: IframeSlotOptions) {
    this.options = options;
  }

  get focusInsideIframe(): boolean {
    return this.inside;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    if (typeof window !== "undefined") {
      window.addEventListener("blur", this.boundWindowFocusChange);
      window.addEventListener("focus", this.boundWindowFocusChange);
    }
    const transport = this.options.transport;
    if (transport && !this.unsubscribeTransport) {
      this.unsubscribeTransport = transport.onMessage((msg) =>
        this.handleMessage(msg),
      );
    }
    // Bind to whatever iframe/sentinels exist now; the host calls syncListeners()
    // again as nodes mount/remount.
    this.syncListeners();
  }

  /**
   * Bind the iframe/sentinel focus listeners to the elements the getters
   * currently return, rebinding only what changed. Idempotent. The host calls
   * this whenever a managed node mounts, unmounts, or is replaced (via the
   * sentinel callback refs in useIframeSlot) so the listeners follow deferred
   * mounts and re-mounts. No-op until attach() has run.
   */
  syncListeners(): void {
    if (!this.attached) return;
    const iframe = this.options.getIframe();
    if (iframe !== this.boundIframe) {
      this.boundIframe?.removeEventListener("focus", this.boundIframeFocus);
      this.boundIframe?.removeEventListener("blur", this.boundIframeBlur);
      iframe?.addEventListener("focus", this.boundIframeFocus);
      iframe?.addEventListener("blur", this.boundIframeBlur);
      this.boundIframe = iframe;
    }
    const before = this.options.getBeforeSentinel();
    if (before !== this.boundBefore) {
      this.boundBefore?.removeEventListener("focusin", this.boundBeforeFocusIn);
      this.boundBefore?.removeEventListener(
        "focusout",
        this.boundSentinelFocusOut,
      );
      before?.addEventListener("focusin", this.boundBeforeFocusIn);
      before?.addEventListener("focusout", this.boundSentinelFocusOut);
      this.boundBefore = before;
    }
    const after = this.options.getAfterSentinel();
    if (after !== this.boundAfter) {
      this.boundAfter?.removeEventListener("focusin", this.boundAfterFocusIn);
      this.boundAfter?.removeEventListener(
        "focusout",
        this.boundSentinelFocusOut,
      );
      after?.addEventListener("focusin", this.boundAfterFocusIn);
      after?.addEventListener("focusout", this.boundSentinelFocusOut);
      this.boundAfter = after;
    }
    this.applyTabindex();
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.boundIframe?.removeEventListener("focus", this.boundIframeFocus);
    this.boundIframe?.removeEventListener("blur", this.boundIframeBlur);
    this.boundIframe = null;
    this.boundBefore?.removeEventListener("focusin", this.boundBeforeFocusIn);
    this.boundBefore?.removeEventListener(
      "focusout",
      this.boundSentinelFocusOut,
    );
    this.boundBefore = null;
    this.boundAfter?.removeEventListener("focusin", this.boundAfterFocusIn);
    this.boundAfter?.removeEventListener(
      "focusout",
      this.boundSentinelFocusOut,
    );
    this.boundAfter = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("blur", this.boundWindowFocusChange);
      window.removeEventListener("focus", this.boundWindowFocusChange);
    }
    if (this.insideSyncTimer !== null) {
      clearTimeout(this.insideSyncTimer);
      this.insideSyncTimer = null;
    }
    this.unsubscribeTransport?.();
    this.unsubscribeTransport = null;
  }

  /** Re-apply sentinel tabindex from current inside-state + intercept flags. */
  refreshIntercept(): void {
    this.applyTabindex();
  }

  private applyTabindex(): void {
    const before = this.options.getBeforeSentinel();
    const after = this.options.getAfterSentinel();
    const intercept = this.options.getIntercept();
    // before-sentinel guards the REVERSE exit; after-sentinel the FORWARD exit.
    const beforeTabbable = this.inside && intercept.reverse;
    const afterTabbable = this.inside && intercept.forward;
    before?.setAttribute("tabindex", beforeTabbable ? "0" : "-1");
    after?.setAttribute("tabindex", afterTabbable ? "0" : "-1");
  }

  private handleIframeFocus(): void {
    this.inside = true;
    this.clearHint();
    this.applyTabindex();
  }

  private handleIframeBlur(): void {
    this.inside = false;
    this.applyTabindex();
  }

  /**
   * Track keyboard descent across the iframe boundary.
   *
   * In real browsers a native Tab into/out of an iframe does NOT dispatch
   * focus/blur on the <iframe> ELEMENT — the element silently becomes (or
   * ceases to be) document.activeElement, so the element-level listeners above
   * only fire for click / programmatic entry. The reliable cross-origin signal
   * is on the top window: focus entering the subframe blurs the window (and
   * activeElement becomes the iframe), and focus returning to the host focuses
   * the window. We re-read activeElement on a deferred tick because some
   * browsers update it just after the window event fires. The read is the
   * single source of truth, so window blur and focus share one handler.
   */
  private scheduleInsideSync(): void {
    if (typeof window === "undefined") return;
    if (this.insideSyncTimer !== null) clearTimeout(this.insideSyncTimer);
    this.insideSyncTimer = setTimeout(() => {
      this.insideSyncTimer = null;
      this.syncInsideFromActiveElement();
    }, 0);
  }

  private syncInsideFromActiveElement(): void {
    if (!this.attached) return;
    const nowInside = document.activeElement === this.options.getIframe();
    if (nowInside === this.inside) return;
    if (nowInside) this.handleIframeFocus();
    else this.handleIframeBlur();
  }

  private handleSentinelFocusIn(direction: 1 | -1): void {
    // Ignore the focusin caused by our own landing/positioner focus() — that is
    // us placing focus, not the user walking out of the iframe.
    if (this.movingFocus) return;
    // A sentinel firing while focus is INSIDE the iframe is an exit: native Tab
    // walked out of the iframe and landed on the (tabbable) sentinel. Redirect
    // synchronously via the trap. Direction is purely which sentinel fired.
    // A focusin while OUTSIDE is a landing rest — leave it alone (§3).
    if (!this.inside) return;
    this.options.onExit(direction);
  }

  private handleSentinelFocusOut(): void {
    // Ignore the focusout caused by our own focus move between sentinels (we are
    // establishing a landing, not leaving it). A genuine leave (Escape/trap
    // exit, click away, descent) happens with movingFocus === false.
    if (this.movingFocus) return;
    this.clearHint();
  }

  /**
   * Focus a sentinel on the library's behalf. Brackets the synchronous focus
   * events the `.focus()` dispatches (focusout on the previously-focused
   * sentinel, focusin on this one) so the sentinel handlers don't treat our own
   * move as a user exit or clear the landing hint we're in the middle of setting.
   */
  private focusSentinel(el: HTMLElement | null): void {
    this.movingFocus = true;
    try {
      el?.focus();
    } finally {
      this.movingFocus = false;
    }
  }

  getSentinels(): { before: HTMLElement | null; after: HTMLElement | null } {
    return {
      before: this.options.getBeforeSentinel(),
      after: this.options.getAfterSentinel(),
    };
  }

  /** Mark the cooperating capability (also set by inbound capability message). */
  notifyCapability(focusProtocol: boolean): void {
    this.cooperating = focusProtocol;
  }

  focusContent(ctx: FocusContentContext): boolean {
    const before = this.options.getBeforeSentinel();
    const after = this.options.getAfterSentinel();
    const target = ctx.entryMode === "reverse" ? after : before;

    if (ctx.trigger === "sequentialNavigation") {
      // Positioner: silent invisible sentinel; the pending Tab default descends.
      this.clearHint();
      this.focusSentinel(target);
      return true;
    }

    // Programmatic entry. Cooperating ⇒ precise placement via the protocol (no
    // visible hint either way, so suppressHint is moot here).
    if (this.cooperating && this.options.transport) {
      const mode = ctx.entryMode === "reverse" ? "reverse" : "forward";
      this.options.transport.send({ type: "focusEnter", mode });
      return true;
    }

    // Non-cooperating programmatic entry. Default: focus the sentinel and reveal
    // the visible hint; the user's next Tab descends. suppressHint: focus the
    // sentinel quietly (no visible hint) — focus still rests, the screen reader
    // still reads the sentinel text. Used for pointer-driven entries.
    this.clearHint();
    if (target) {
      if (!ctx.suppressHint) {
        target.setAttribute("data-show-hint", "");
        if (this.options.enterLabel) {
          target.setAttribute("aria-label", this.options.enterLabel);
        }
      }
      this.focusSentinel(target);
    }
    return true;
  }

  private clearHint(): void {
    for (const el of [
      this.options.getBeforeSentinel(),
      this.options.getAfterSentinel(),
    ]) {
      el?.removeAttribute("data-show-hint");
      el?.removeAttribute("aria-label");
    }
  }

  private handleMessage(msg: FocusMessage): void {
    switch (msg.type) {
      case "focusExit":
        if (msg.mode === "escape") this.options.onRequestExit?.();
        else this.options.onExit(msg.mode === "reverse" ? -1 : 1);
        break;
      case "capability":
        this.notifyCapability(msg.focusProtocol);
        break;
      default:
        // focusEnter / trapStateChanged / focusReady are not host-inbound here.
        break;
    }
  }

  requestRestore(): void {
    if (this.cooperating && this.options.transport) {
      this.options.transport.send({ type: "focusEnter", mode: "restore" });
      return;
    }
    // Non-cooperating: re-enter via a forward landing hint.
    this.focusContent({ entryMode: "forward", trigger: "programmatic" });
  }
}
