import { afterEach, describe, expect, it } from "vitest";
import {
  type A11yFocusEvent,
  isInsideSidebar,
  setSidebarRoot,
  subscribeFocus,
  withSelfExclusionDisabled,
  withSelfExclusionDisabledAsync,
} from "./focus-stream";

function fireFocusIn(target: Element): void {
  const event = new FocusEvent("focusin", {
    bubbles: true,
    relatedTarget: null,
  });
  Object.defineProperty(event, "target", { value: target });
  document.dispatchEvent(event);
}

const cleanups: (() => void)[] = [];

function sub(callback: (e: A11yFocusEvent) => void): () => void {
  const unsub = subscribeFocus(callback);
  cleanups.push(unsub);
  return unsub;
}

afterEach(() => {
  for (const fn of cleanups) fn();
  cleanups.length = 0;
  setSidebarRoot(null);
});

describe("subscribeFocus", () => {
  it("calls subscriber when focusin fires on a DOM element", () => {
    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    const button = document.createElement("button");
    document.body.appendChild(button);
    fireFocusIn(button);

    expect(events).toHaveLength(1);
    expect(events[0].element).toBe(button);
    expect(events[0].previousElement).toBeNull();
    expect(events[0].timestamp).toBeGreaterThan(0);

    button.remove();
  });

  it("tracks previousElement across focus events", () => {
    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    const a = document.createElement("input");
    const b = document.createElement("input");
    document.body.appendChild(a);
    document.body.appendChild(b);

    fireFocusIn(a);
    fireFocusIn(b);

    expect(events[1].previousElement).toBe(a);

    a.remove();
    b.remove();
  });

  it("supports multiple subscribers", () => {
    const calls1: A11yFocusEvent[] = [];
    const calls2: A11yFocusEvent[] = [];
    sub((e) => calls1.push(e));
    sub((e) => calls2.push(e));

    const el = document.createElement("button");
    document.body.appendChild(el);
    fireFocusIn(el);

    expect(calls1).toHaveLength(1);
    expect(calls2).toHaveLength(1);

    el.remove();
  });

  it("stops calling subscriber after unsubscribe", () => {
    const events: A11yFocusEvent[] = [];
    const unsub = sub((e) => events.push(e));

    const el = document.createElement("button");
    document.body.appendChild(el);

    fireFocusIn(el);
    expect(events).toHaveLength(1);

    unsub();
    fireFocusIn(el);
    expect(events).toHaveLength(1);

    el.remove();
  });

  it("double unsubscribe is safe", () => {
    const unsub = sub(() => {});
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it("is safe when subscriber unsubscribes during dispatch", () => {
    const calls: string[] = [];

    const ref = { unsub: () => {} };
    ref.unsub = subscribeFocus(() => {
      calls.push("first");
      ref.unsub();
    });
    cleanups.push(ref.unsub);
    sub(() => {
      calls.push("second");
    });

    const el = document.createElement("button");
    document.body.appendChild(el);
    fireFocusIn(el);

    // Both should be called due to snapshot
    expect(calls).toEqual(["first", "second"]);

    el.remove();
  });
});

describe("sidebar self-exclusion", () => {
  it("filters out focus events inside the sidebar root", () => {
    const sidebar = document.createElement("div");
    const sidebarButton = document.createElement("button");
    sidebar.appendChild(sidebarButton);
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    fireFocusIn(sidebarButton);
    expect(events).toHaveLength(0);

    sidebar.remove();
  });

  it("allows focus events outside the sidebar", () => {
    const sidebar = document.createElement("div");
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    const appButton = document.createElement("button");
    document.body.appendChild(appButton);

    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    fireFocusIn(appButton);
    expect(events).toHaveLength(1);

    sidebar.remove();
    appButton.remove();
  });

  it("withSelfExclusionDisabled allows sidebar focus events through", () => {
    const sidebar = document.createElement("div");
    const sidebarButton = document.createElement("button");
    sidebar.appendChild(sidebarButton);
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    withSelfExclusionDisabled(() => {
      fireFocusIn(sidebarButton);
    });

    expect(events).toHaveLength(1);

    sidebar.remove();
  });

  it("withSelfExclusionDisabled re-enables on throw", () => {
    const sidebar = document.createElement("div");
    const sidebarButton = document.createElement("button");
    sidebar.appendChild(sidebarButton);
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    try {
      withSelfExclusionDisabled(() => {
        throw new Error("test");
      });
    } catch {
      // expected
    }

    // Self-exclusion should be re-enabled
    fireFocusIn(sidebarButton);
    expect(events).toHaveLength(0);

    sidebar.remove();
  });

  it("withSelfExclusionDisabledAsync allows sidebar focus events through", async () => {
    const sidebar = document.createElement("div");
    const sidebarButton = document.createElement("button");
    sidebar.appendChild(sidebarButton);
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    await withSelfExclusionDisabledAsync(async () => {
      fireFocusIn(sidebarButton);
    });

    expect(events).toHaveLength(1);

    sidebar.remove();
  });

  it("withSelfExclusionDisabledAsync re-enables on rejection", async () => {
    const sidebar = document.createElement("div");
    const sidebarButton = document.createElement("button");
    sidebar.appendChild(sidebarButton);
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    try {
      await withSelfExclusionDisabledAsync(async () => {
        throw new Error("async test");
      });
    } catch {
      // expected
    }

    fireFocusIn(sidebarButton);
    expect(events).toHaveLength(0);

    sidebar.remove();
  });

  it("handles no sidebar root set (all events pass through)", () => {
    const events: A11yFocusEvent[] = [];
    sub((e) => events.push(e));

    const el = document.createElement("button");
    document.body.appendChild(el);
    fireFocusIn(el);

    expect(events).toHaveLength(1);

    el.remove();
  });
});

describe("isInsideSidebar", () => {
  it("returns false when no sidebar root is set", () => {
    const el = document.createElement("div");
    expect(isInsideSidebar(el)).toBe(false);
  });

  it("returns true for element inside sidebar root", () => {
    const sidebar = document.createElement("div");
    const child = document.createElement("button");
    sidebar.appendChild(child);
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    expect(isInsideSidebar(child)).toBe(true);

    sidebar.remove();
  });

  it("returns false for element outside sidebar root", () => {
    const sidebar = document.createElement("div");
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    const outside = document.createElement("button");
    document.body.appendChild(outside);

    expect(isInsideSidebar(outside)).toBe(false);

    sidebar.remove();
    outside.remove();
  });

  it("returns true for element with data-a11y-debug attribute", () => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-a11y-debug", "highlight");
    document.body.appendChild(overlay);

    expect(isInsideSidebar(overlay)).toBe(true);

    overlay.remove();
  });

  it("returns true for child of element with data-a11y-debug", () => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-a11y-debug", "highlight");
    const child = document.createElement("span");
    overlay.appendChild(child);
    document.body.appendChild(overlay);

    expect(isInsideSidebar(child)).toBe(true);

    overlay.remove();
  });

  it("returns false during withSelfExclusionDisabled", () => {
    const sidebar = document.createElement("div");
    const child = document.createElement("button");
    sidebar.appendChild(child);
    document.body.appendChild(sidebar);
    setSidebarRoot(sidebar);

    withSelfExclusionDisabled(() => {
      expect(isInsideSidebar(child)).toBe(false);
    });

    // After: should be true again
    expect(isInsideSidebar(child)).toBe(true);

    sidebar.remove();
  });
});
