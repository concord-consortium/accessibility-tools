/**
 * IframeSlot — framework-agnostic core for an iframe focus-trap slot (§3, §4).
 *
 * Mirrors the agnostic-core split used by FocusTrapController. The host renders
 * [before-sentinel][iframe][after-sentinel] and supplies accessors; this core
 * owns their behavior. See docs/iframe-slot-design.md.
 */

import type { FocusTransport } from "./focus-messages";

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

  private handleIframeFocus(): void {
    this.inside = true;
  }

  private handleIframeBlur(): void {
    this.inside = false;
  }

  // Placeholder; fully implemented in Task 10.
  private handleSentinelFocusIn(_direction: 1 | -1): void {}
}
