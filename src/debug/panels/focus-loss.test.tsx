import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusLossPanel } from "./focus-loss";

let rafCallbacks: Array<() => void> = [];

beforeEach(() => {
  rafCallbacks = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb as () => void);
    return rafCallbacks.length;
  });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function flushRaf() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  for (const cb of cbs) cb();
}

function simulateFocusLoss(element: Element) {
  // In real browsers, focusout bubbles up to document even from removed elements.
  // In jsdom, dispatching on a detached element doesn't reach document's capture
  // listener, so we dispatch on document with the target simulated via the event.
  const event = new FocusEvent("focusout", {
    bubbles: true,
    relatedTarget: null,
  });
  // If element is still in DOM, dispatch from it; otherwise from document
  if (document.contains(element)) {
    element.dispatchEvent(event);
  } else {
    // jsdom workaround: dispatch directly where our capture listener will see it
    Object.defineProperty(event, "target", { value: element });
    document.dispatchEvent(event);
  }
}

describe("FocusLossPanel", () => {
  it("shows empty state message", () => {
    render(<FocusLossPanel />);
    expect(screen.getByText(/no focus loss detected/i)).toBeTruthy();
  });

  it("detects focus loss when element is removed from DOM", () => {
    render(<FocusLossPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();

    act(() => {
      btn.remove();
      simulateFocusLoss(btn);
      flushRaf();
    });

    expect(screen.getByText(/1 loss event/)).toBeTruthy();
    expect(screen.getByText("Element removed from DOM")).toBeTruthy();
  });

  it("does not flag when focus moves to another element", () => {
    render(<FocusLossPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);
    btn1.focus();

    act(() => {
      // focusout with relatedTarget means focus is moving to btn2
      const event = new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: btn2,
      });
      btn1.dispatchEvent(event);
      flushRaf();
    });

    expect(screen.getByText(/no focus loss detected/i)).toBeTruthy();
  });

  it("does not flag when another element gets focus after rAF", () => {
    render(<FocusLossPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);
    btn1.focus();

    act(() => {
      simulateFocusLoss(btn1);
      // Before rAF fires, focus moves to btn2
      btn2.focus();
      flushRaf();
    });

    expect(screen.getByText(/no focus loss detected/i)).toBeTruthy();
  });

  it("clear button removes all entries", () => {
    render(<FocusLossPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();

    act(() => {
      btn.remove();
      simulateFocusLoss(btn);
      flushRaf();
    });

    expect(screen.getByText(/1 loss event/)).toBeTruthy();

    const clearBtn = screen.getByText("Clear");
    act(() => {
      clearBtn.click();
    });

    expect(screen.getByText(/no focus loss detected/i)).toBeTruthy();
  });

  it("clear button is disabled when no entries", () => {
    render(<FocusLossPanel />);
    const clearBtn = screen.getByText("Clear");
    expect(clearBtn.hasAttribute("disabled")).toBe(true);
  });

  it("logs multiple focus loss events", () => {
    render(<FocusLossPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      btn1.focus();
      btn1.remove();
      simulateFocusLoss(btn1);
      flushRaf();
    });

    act(() => {
      btn2.focus();
      btn2.remove();
      simulateFocusLoss(btn2);
      flushRaf();
    });

    expect(screen.getByText(/2 loss events/)).toBeTruthy();
  });

  it("has role=log on the event list", () => {
    render(<FocusLossPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();

    act(() => {
      btn.remove();
      simulateFocusLoss(btn);
      flushRaf();
    });

    const log = screen.getByRole("log");
    expect(log).toBeTruthy();
  });

  it("cleans up listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<FocusLossPanel />);
    unmount();
    expect(removeSpy.mock.calls.some((c) => c[0] === "focusout")).toBe(true);
  });
});
