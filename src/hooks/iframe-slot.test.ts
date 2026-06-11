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

describe("IframeSlot native-Tab descent tracking (window blur/focus)", () => {
  // Real browsers do NOT dispatch focus/blur on the <iframe> ELEMENT when
  // keyboard Tab moves focus across the frame boundary; the element silently
  // becomes/ceases to be document.activeElement. The element-level focus/blur
  // listeners only fire for click / programmatic entry. To track keyboard
  // descent the slot watches the top window's blur/focus and re-reads
  // document.activeElement on a deferred tick.
  it("window blur with activeElement on the iframe sets inside=true (deferred)", () => {
    vi.useFakeTimers();
    try {
      const { slot, iframe, before, after } = setup();
      vi.spyOn(document, "activeElement", "get").mockReturnValue(iframe);
      window.dispatchEvent(new Event("blur"));
      // Deferred: not applied synchronously (activeElement may settle a tick later).
      expect(slot.focusInsideIframe).toBe(false);
      vi.runAllTimers();
      expect(slot.focusInsideIframe).toBe(true);
      expect(before.getAttribute("tabindex")).toBe("0"); // reverse intercept
      expect(after.getAttribute("tabindex")).toBe("0"); // forward intercept
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  it("window blur while activeElement is NOT the iframe does not enter", () => {
    vi.useFakeTimers();
    try {
      const { slot } = setup();
      // default activeElement is <body>, not the iframe
      window.dispatchEvent(new Event("blur"));
      vi.runAllTimers();
      expect(slot.focusInsideIframe).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returning focus to the host (window focus) clears inside", () => {
    vi.useFakeTimers();
    try {
      const { slot, iframe, before } = setup();
      const ae = vi.spyOn(document, "activeElement", "get");
      ae.mockReturnValue(iframe);
      window.dispatchEvent(new Event("blur"));
      vi.runAllTimers();
      expect(slot.focusInsideIframe).toBe(true);
      ae.mockReturnValue(before); // focus moved back to a host element
      window.dispatchEvent(new Event("focus"));
      vi.runAllTimers();
      expect(slot.focusInsideIframe).toBe(false);
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  it("clears a landing hint when keyboard descent enters the iframe", () => {
    vi.useFakeTimers();
    try {
      const { slot, iframe, before } = setup();
      slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
      expect(before.hasAttribute("data-landing")).toBe(true);
      vi.spyOn(document, "activeElement", "get").mockReturnValue(iframe);
      window.dispatchEvent(new Event("blur"));
      vi.runAllTimers();
      expect(before.hasAttribute("data-landing")).toBe(false);
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  it("after-sentinel focusin still exits when descent was tracked via the window", () => {
    vi.useFakeTimers();
    try {
      const { slot, iframe, after, onExit } = setup();
      vi.spyOn(document, "activeElement", "get").mockReturnValue(iframe);
      window.dispatchEvent(new Event("blur"));
      vi.runAllTimers();
      expect(slot.focusInsideIframe).toBe(true);
      after.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      expect(onExit).toHaveBeenCalledWith(1);
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  it("stops window tracking after detach", () => {
    vi.useFakeTimers();
    try {
      const { slot, iframe } = setup();
      slot.detach();
      vi.spyOn(document, "activeElement", "get").mockReturnValue(iframe);
      window.dispatchEvent(new Event("blur"));
      vi.runAllTimers();
      expect(slot.focusInsideIframe).toBe(false);
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
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
      trigger: "sequentialNavigation",
    });
    expect(handled).toBe(true);
    expect(before.focus).toHaveBeenCalled();
    expect(before.hasAttribute("data-landing")).toBe(false);
  });

  it("positioner reverse focuses the after-sentinel", () => {
    const { slot, after } = setup();
    vi.spyOn(after, "focus");
    slot.focusContent({
      entryMode: "reverse",
      trigger: "sequentialNavigation",
    });
    expect(after.focus).toHaveBeenCalled();
  });

  it("landing mode (non-cooperating) focuses sentinel + sets data-landing", () => {
    const { slot, before } = setup();
    vi.spyOn(before, "focus");
    slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
    expect(before.focus).toHaveBeenCalled();
    expect(before.getAttribute("data-landing")).toBe("");
  });

  it("landing mode (cooperating) sends focusEnter and sets no landing", () => {
    const send = vi.fn();
    const transport = { send, onMessage: () => () => {} };
    const { slot, before } = setup({ transport });
    slot.notifyCapability(true); // mark cooperating
    slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
    expect(send).toHaveBeenCalledWith({ type: "focusEnter", mode: "forward" });
    expect(before.hasAttribute("data-landing")).toBe(false);
  });

  it("clears the landing hint when focus leaves the sentinel (e.g. Escape / trap exit)", () => {
    const { slot, before } = setup();
    slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
    expect(before.getAttribute("data-landing")).toBe("");
    // Focus leaves the sentinel for a host element (trap exit, click away, …)
    // WITHOUT descending into the iframe — the hint must not linger.
    before.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(before.hasAttribute("data-landing")).toBe(false);
  });

  it("clears the reverse landing hint on after-sentinel focusout", () => {
    const { slot, after } = setup();
    slot.focusContent({ entryMode: "reverse", trigger: "programmatic" });
    expect(after.getAttribute("data-landing")).toBe("");
    after.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(after.hasAttribute("data-landing")).toBe(false);
  });

  it("entering the iframe clears data-landing", () => {
    const { slot, iframe, before } = setup();
    slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
    expect(before.hasAttribute("data-landing")).toBe(true);
    iframe.dispatchEvent(new FocusEvent("focus"));
    expect(before.hasAttribute("data-landing")).toBe(false);
  });

  it("keeps the landing hint when entering from an already-focused (leaving) sentinel", () => {
    // Single-slot wrap: native Tab out lands on the after-sentinel, then the
    // trap programmatically lands on the before-sentinel. Focusing the
    // before-sentinel blurs the after-sentinel, firing after's focusout — which
    // must NOT wipe the landing hint we just set on the before-sentinel.
    const { slot, before, after } = setup();
    after.focus();
    expect(document.activeElement).toBe(after);
    slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
    expect(document.activeElement).toBe(before);
    expect(before.getAttribute("data-landing")).toBe("");
  });

  it("does not read its own landing focus as an exit when inside is still true", () => {
    // On a wrap the trap lands focus on a sentinel while `inside` is still true
    // (the window-focus sync is deferred). The focusin from our own focus() must
    // NOT be mistaken for another native exit.
    const onExit = vi.fn();
    const { slot, iframe } = setup({ onExit });
    iframe.dispatchEvent(new FocusEvent("focus")); // inside = true
    slot.focusContent({ entryMode: "forward", trigger: "programmatic" });
    expect(onExit).not.toHaveBeenCalled();
  });

  it("getSentinels returns the before/after pair", () => {
    const { slot, before, after } = setup();
    expect(slot.getSentinels()).toEqual({ before, after });
  });
});

describe("IframeSlot transport translation", () => {
  function transportSetup() {
    let handler: ((m: import("./focus-messages").FocusMessage) => void) | null =
      null;
    const send = vi.fn();
    const transport = {
      send,
      onMessage: (cb: (m: import("./focus-messages").FocusMessage) => void) => {
        handler = cb;
        return () => {
          handler = null;
        };
      },
    };
    const onRequestExit = vi.fn();
    const base = setup({ transport, onRequestExit });
    return {
      ...base,
      send,
      onRequestExit,
      emit: (m: import("./focus-messages").FocusMessage) => handler?.(m),
    };
  }

  it("inbound focusExit forward/reverse → onExit(±1)", () => {
    const { emit, onExit } = transportSetup();
    emit({ type: "focusExit", mode: "forward" });
    expect(onExit).toHaveBeenCalledWith(1);
    emit({ type: "focusExit", mode: "reverse" });
    expect(onExit).toHaveBeenCalledWith(-1);
  });

  it("inbound focusExit escape → onRequestExit", () => {
    const { emit, onRequestExit } = transportSetup();
    emit({ type: "focusExit", mode: "escape" });
    expect(onRequestExit).toHaveBeenCalled();
  });

  it("inbound capability marks cooperating (focusContent sends focusEnter)", () => {
    const { emit, slot, send } = transportSetup();
    emit({ type: "capability", focusProtocol: true });
    slot.focusContent({ entryMode: "reverse", trigger: "programmatic" });
    expect(send).toHaveBeenCalledWith({ type: "focusEnter", mode: "reverse" });
  });

  it("requestRestore sends focusEnter{restore} when cooperating", () => {
    const { emit, slot, send } = transportSetup();
    emit({ type: "capability", focusProtocol: true });
    slot.requestRestore();
    expect(send).toHaveBeenCalledWith({ type: "focusEnter", mode: "restore" });
  });

  it("requestRestore falls back to forward landing when not cooperating", () => {
    const { slot, before } = transportSetup();
    vi.spyOn(before, "focus");
    slot.requestRestore();
    expect(before.getAttribute("data-landing")).toBe("");
    expect(before.focus).toHaveBeenCalled();
  });
});
