/**
 * Shared registry of iframe-slots within a single focus trap (§4).
 *
 * The host creates one registry and passes it to every useIframeSlot in the
 * same trap. It lets each slot's getIntercept derivation see its sibling
 * iframe-slots (so two adjacent enterable iframes flow natively instead of
 * being intercepted). Plain object — no React — so it is trivially testable
 * and can be created in a class component too.
 */

export interface IframeSlotRegistration {
  /** Whether this iframe is currently enterable (tabindex !== "-1"). */
  isEnterable: () => boolean;
}

export interface IframeSlotRegistry {
  /** Register a slot; returns an unregister function. */
  register: (slotName: string, reg: IframeSlotRegistration) => () => void;
  /** Snapshot of registered iframe-slots and their current enterable state. */
  getIframeSlots: () => Record<string, { enterable: boolean }>;
  /** Subscribe to membership changes; returns unsubscribe. */
  onChange: (cb: () => void) => () => void;
  /**
   * Force-notify subscribers — e.g. after the host toggles an iframe's
   * lock/content-only state, which changes `isEnterable` without changing
   * membership.
   */
  notifyChange: () => void;
}

export function createIframeSlotRegistry(): IframeSlotRegistry {
  const entries = new Map<string, IframeSlotRegistration>();
  const subscribers = new Set<() => void>();

  const notify = () => {
    for (const cb of subscribers) cb();
  };

  return {
    register(slotName, reg) {
      entries.set(slotName, reg);
      notify();
      return () => {
        entries.delete(slotName);
        notify();
      };
    },
    getIframeSlots() {
      const out: Record<string, { enterable: boolean }> = {};
      for (const [name, reg] of entries) {
        out[name] = { enterable: reg.isEnterable() };
      }
      return out;
    },
    onChange(cb) {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    notifyChange: notify,
  };
}
