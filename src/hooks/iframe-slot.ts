/**
 * IframeSlot — framework-agnostic core for an iframe focus-trap slot (§3, §4).
 *
 * Mirrors the agnostic-core split used by FocusTrapController. The host renders
 * [before-sentinel][iframe][after-sentinel] and supplies accessors; this core
 * owns their behavior. See docs/iframe-slot-design.md.
 */

import type { FocusTransport } from "./focus-messages";
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
   * Visible-hint label written/announced in landing mode. The host renders the
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

  // Bound listeners for clean add/remove.
  private boundIframeFocus = () => this.handleIframeFocus();
  private boundIframeBlur = () => this.handleIframeBlur();
  private boundBeforeFocusIn = () => this.handleSentinelFocusIn(-1);
  private boundAfterFocusIn = () => this.handleSentinelFocusIn(1);

  constructor(options: IframeSlotOptions) {
    this.options = options;
  }

  get focusInsideIframe(): boolean {
    return this.inside;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    const iframe = this.options.getIframe();
    iframe?.addEventListener("focus", this.boundIframeFocus);
    iframe?.addEventListener("blur", this.boundIframeBlur);
    this.options
      .getBeforeSentinel()
      ?.addEventListener("focusin", this.boundBeforeFocusIn);
    this.options
      .getAfterSentinel()
      ?.addEventListener("focusin", this.boundAfterFocusIn);
    this.applyTabindex();
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    const iframe = this.options.getIframe();
    iframe?.removeEventListener("focus", this.boundIframeFocus);
    iframe?.removeEventListener("blur", this.boundIframeBlur);
    this.options
      .getBeforeSentinel()
      ?.removeEventListener("focusin", this.boundBeforeFocusIn);
    this.options
      .getAfterSentinel()
      ?.removeEventListener("focusin", this.boundAfterFocusIn);
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
    this.clearLanding();
    this.applyTabindex();
  }

  private handleIframeBlur(): void {
    this.inside = false;
    this.applyTabindex();
  }

  private handleSentinelFocusIn(direction: 1 | -1): void {
    // A sentinel firing while focus is INSIDE the iframe is an exit: native Tab
    // walked out of the iframe and landed on the (tabbable) sentinel. Redirect
    // synchronously via the trap. Direction is purely which sentinel fired.
    // A focusin while OUTSIDE is a landing rest — leave it alone (§3).
    if (!this.inside) return;
    this.options.onExit(direction);
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

    if (ctx.viaKeydown) {
      // Positioner: silent invisible sentinel; the pending Tab default descends.
      this.clearLanding();
      target?.focus();
      return true;
    }

    // Programmatic (landing). Cooperating ⇒ precise placement via the protocol.
    if (this.cooperating && this.options.transport) {
      const mode = ctx.entryMode === "reverse" ? "reverse" : "forward";
      this.options.transport.send({ type: "focusEnter", mode });
      return true;
    }

    // Non-cooperating ⇒ visible labeled landing hint; user's next Tab descends.
    this.clearLanding();
    if (target) {
      target.setAttribute("data-landing", "");
      if (this.options.enterLabel) {
        target.setAttribute("aria-label", this.options.enterLabel);
      }
      target.focus();
    }
    return true;
  }

  private clearLanding(): void {
    for (const el of [
      this.options.getBeforeSentinel(),
      this.options.getAfterSentinel(),
    ]) {
      el?.removeAttribute("data-landing");
      el?.removeAttribute("aria-label");
    }
  }
}
