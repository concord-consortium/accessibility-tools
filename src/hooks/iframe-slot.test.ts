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
