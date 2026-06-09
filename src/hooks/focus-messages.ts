/**
 * Self-contained focus-message vocabulary (§7 of iframe-slot-design.md).
 *
 * This is the "trap-action vocabulary." It is intentionally NOT
 * `lara-interactive-api`'s wire types — `accessibility-tools` stays
 * concord-dependency-free. A host adapter (e.g. interactive-api-host's
 * FocusManager) maps the concrete wire types to/from FocusMessage.
 */

export type FocusMessage =
  | { type: "focusEnter"; mode: "forward" | "reverse" | "restore" }
  | { type: "focusExit"; mode: "forward" | "reverse" | "escape" }
  | { type: "trapStateChanged"; active: boolean }
  | { type: "focusReady" }
  | { type: "capability"; focusProtocol: boolean };

/**
 * Abstract, symmetric transport. The host supplies an adapter over its real
 * channel (e.g. iframe-phone). The same interface can be supplied on the child
 * (interactive) side by an interactive running its own internal trap.
 */
export interface FocusTransport {
  send: (msg: FocusMessage) => void;
  /** Subscribe; returns an unsubscribe function. */
  onMessage: (cb: (msg: FocusMessage) => void) => () => void;
}
