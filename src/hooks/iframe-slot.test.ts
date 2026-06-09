import { afterEach, describe, expect, it, vi } from "vitest";
import { IframeSlot, type IframeSlotOptions } from "./iframe-slot";

afterEach(() => {
  document.body.innerHTML = "";
});

function setup(overrides: Partial<IframeSlotOptions> = {}) {
  const iframe = document.createElement("iframe");
  const before = document.createElement("div");
  const after = document.createElement("div");
  document.body.append(before, iframe, after);
  const onExit = vi.fn();
  const options: IframeSlotOptions = {
    slotName: "content",
    getIframe: () => iframe,
    getBeforeSentinel: () => before,
    getAfterSentinel: () => after,
    onExit,
    getIntercept: () => ({ forward: true, reverse: true }),
    ...overrides,
  };
  const slot = new IframeSlot(options);
  slot.attach();
  return { slot, iframe, before, after, onExit };
}

describe("IframeSlot focusInsideIframe tracking", () => {
  it("starts false", () => {
    const { slot } = setup();
    expect(slot.focusInsideIframe).toBe(false);
  });

  it("becomes true on iframe focus, false on iframe blur", () => {
    const { slot, iframe } = setup();
    iframe.dispatchEvent(new FocusEvent("focus"));
    expect(slot.focusInsideIframe).toBe(true);
    iframe.dispatchEvent(new FocusEvent("blur"));
    expect(slot.focusInsideIframe).toBe(false);
  });

  it("stops tracking after detach", () => {
    const { slot, iframe } = setup();
    slot.detach();
    iframe.dispatchEvent(new FocusEvent("focus"));
    expect(slot.focusInsideIframe).toBe(false);
  });

  it("attach is idempotent (survives StrictMode re-mount)", () => {
    const { slot, iframe } = setup();
    slot.attach(); // second attach must not double-bind
    iframe.dispatchEvent(new FocusEvent("focus"));
    expect(slot.focusInsideIframe).toBe(true);
  });
});

describe("IframeSlot sentinel tabindex toggling", () => {
  it("sentinels rest at -1 when focus is outside the iframe", () => {
    const { before, after } = setup();
    expect(before.getAttribute("tabindex")).toBe("-1");
    expect(after.getAttribute("tabindex")).toBe("-1");
  });

  it("intercepted directions go to 0 while focus is inside", () => {
    const { iframe, before, after } = setup({
      getIntercept: () => ({ forward: true, reverse: true }),
    });
    iframe.dispatchEvent(new FocusEvent("focus"));
    expect(before.getAttribute("tabindex")).toBe("0"); // reverse intercept
    expect(after.getAttribute("tabindex")).toBe("0"); // forward intercept
    iframe.dispatchEvent(new FocusEvent("blur"));
    expect(before.getAttribute("tabindex")).toBe("-1");
    expect(after.getAttribute("tabindex")).toBe("-1");
  });

  it("a native-flow direction stays -1 even while focus is inside", () => {
    const { iframe, before, after } = setup({
      // forward flows to an adjacent enterable iframe; reverse is intercepted.
      getIntercept: () => ({ forward: false, reverse: true }),
    });
    iframe.dispatchEvent(new FocusEvent("focus"));
    expect(after.getAttribute("tabindex")).toBe("-1"); // native flow forward
    expect(before.getAttribute("tabindex")).toBe("0"); // intercept reverse
  });
});

describe("IframeSlot sentinel focusin exit", () => {
  it("after-sentinel focusin while inside → onExit(+1)", () => {
    const { iframe, after, onExit } = setup();
    iframe.dispatchEvent(new FocusEvent("focus")); // inside = true
    after.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(onExit).toHaveBeenCalledWith(1);
  });

  it("before-sentinel focusin while inside → onExit(-1)", () => {
    const { iframe, before, onExit } = setup();
    iframe.dispatchEvent(new FocusEvent("focus"));
    before.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(onExit).toHaveBeenCalledWith(-1);
  });

  it("sentinel focusin while OUTSIDE (landing rest) does NOT exit", () => {
    const { before, onExit } = setup();
    // inside is false (no iframe focus dispatched)
    before.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(onExit).not.toHaveBeenCalled();
  });
});

describe("IframeSlot focusContent modes + getSentinels", () => {
  it("positioner mode focuses the before-sentinel and sets no landing", () => {
    const { slot, before } = setup();
    vi.spyOn(before, "focus");
    const handled = slot.focusContent({
      entryMode: "forward",
      viaKeydown: true,
    });
    expect(handled).toBe(true);
    expect(before.focus).toHaveBeenCalled();
    expect(before.hasAttribute("data-landing")).toBe(false);
  });

  it("positioner reverse focuses the after-sentinel", () => {
    const { slot, after } = setup();
    vi.spyOn(after, "focus");
    slot.focusContent({ entryMode: "reverse", viaKeydown: true });
    expect(after.focus).toHaveBeenCalled();
  });

  it("landing mode (non-cooperating) focuses sentinel + sets data-landing", () => {
    const { slot, before } = setup();
    vi.spyOn(before, "focus");
    slot.focusContent({ entryMode: "forward", viaKeydown: false });
    expect(before.focus).toHaveBeenCalled();
    expect(before.getAttribute("data-landing")).toBe("");
  });

  it("landing mode (cooperating) sends focusEnter and sets no landing", () => {
    const send = vi.fn();
    const transport = { send, onMessage: () => () => {} };
    const { slot, before } = setup({ transport });
    slot.notifyCapability(true); // mark cooperating
    slot.focusContent({ entryMode: "forward", viaKeydown: false });
    expect(send).toHaveBeenCalledWith({ type: "focusEnter", mode: "forward" });
    expect(before.hasAttribute("data-landing")).toBe(false);
  });

  it("entering the iframe clears data-landing", () => {
    const { slot, iframe, before } = setup();
    slot.focusContent({ entryMode: "forward", viaKeydown: false });
    expect(before.hasAttribute("data-landing")).toBe(true);
    iframe.dispatchEvent(new FocusEvent("focus"));
    expect(before.hasAttribute("data-landing")).toBe(false);
  });

  it("getSentinels returns the before/after pair", () => {
    const { slot, before, after } = setup();
    expect(slot.getSentinels()).toEqual({ before, after });
  });
});
