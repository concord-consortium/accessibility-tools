import { describe, expect, it, vi } from "vitest";
import { createIframeSlotRegistry } from "./iframe-slot-registry";

describe("createIframeSlotRegistry", () => {
  it("snapshots registered slots with live enterable state", () => {
    const registry = createIframeSlotRegistry();
    let enterable = true;
    registry.register("a", { isEnterable: () => enterable });
    expect(registry.getIframeSlots()).toEqual({ a: { enterable: true } });
    enterable = false;
    expect(registry.getIframeSlots()).toEqual({ a: { enterable: false } });
  });

  it("unregister removes the entry", () => {
    const registry = createIframeSlotRegistry();
    const off = registry.register("a", { isEnterable: () => true });
    off();
    expect(registry.getIframeSlots()).toEqual({});
  });

  it("notifies subscribers on register, unregister, and notifyChange", () => {
    const registry = createIframeSlotRegistry();
    const cb = vi.fn();
    const unsub = registry.onChange(cb);
    const off = registry.register("a", { isEnterable: () => true });
    expect(cb).toHaveBeenCalledTimes(1); // register
    registry.notifyChange();
    expect(cb).toHaveBeenCalledTimes(2); // explicit
    off();
    expect(cb).toHaveBeenCalledTimes(3); // unregister
    unsub();
    registry.notifyChange();
    expect(cb).toHaveBeenCalledTimes(3); // no longer subscribed
  });
});
