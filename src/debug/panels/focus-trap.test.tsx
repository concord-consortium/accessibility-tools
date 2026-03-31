import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as focusStream from "../utils/focus-stream";
import { FocusTrapPanel } from "./focus-trap";

let subscribers: Array<(event: focusStream.A11yFocusEvent) => void> = [];

beforeEach(() => {
  subscribers = [];
  vi.spyOn(focusStream, "subscribeFocus").mockImplementation((cb) => {
    subscribers.push(cb);
    return () => {
      subscribers = subscribers.filter((s) => s !== cb);
    };
  });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function dispatch(element: Element, timestamp: number) {
  for (const sub of subscribers) {
    sub({ element, previousElement: null, timestamp });
  }
}

describe("FocusTrapPanel", () => {
  it("shows empty state message", () => {
    render(<FocusTrapPanel />);
    expect(screen.getByText(/no focus traps detected/i)).toBeTruthy();
  });

  it("detects a cycle when same elements repeat", () => {
    render(<FocusTrapPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      // Cycle: btn1, btn2, btn1, btn2 (length 2, repeated 2x)
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
      dispatch(btn1, 1200);
      dispatch(btn2, 1300);
    });

    expect(screen.getByText(/1 trap/)).toBeTruthy();
  });

  it("does not flag non-repeating focus", () => {
    render(<FocusTrapPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    const btn3 = document.createElement("a");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);
    document.body.appendChild(btn3);

    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
      dispatch(btn3, 1200);
    });

    expect(screen.getByText(/no focus traps detected/i)).toBeTruthy();
  });

  it("shows active indicator for ongoing trap", () => {
    render(<FocusTrapPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
      dispatch(btn1, 1200);
      dispatch(btn2, 1300);
    });

    expect(screen.getByText(/1 active/)).toBeTruthy();
  });

  it("marks trap as intentional when inside a dialog", () => {
    render(<FocusTrapPanel />);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    dialog.appendChild(btn1);
    dialog.appendChild(btn2);
    document.body.appendChild(dialog);

    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
      dispatch(btn1, 1200);
      dispatch(btn2, 1300);
    });

    expect(screen.getByText("Modal")).toBeTruthy();
  });

  it("marks trap as accidental when not in a dialog", () => {
    render(<FocusTrapPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
      dispatch(btn1, 1200);
      dispatch(btn2, 1300);
    });

    expect(screen.getByText("Trap")).toBeTruthy();
  });

  it("shows element count and cycle count", () => {
    render(<FocusTrapPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
      dispatch(btn1, 1200);
      dispatch(btn2, 1300);
    });

    expect(screen.getByText(/2 elements/)).toBeTruthy();
  });

  it("clear button removes all entries", () => {
    render(<FocusTrapPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
      dispatch(btn1, 1200);
      dispatch(btn2, 1300);
    });

    expect(screen.getByText(/1 trap/)).toBeTruthy();

    const clearBtn = screen.getByText("Clear");
    act(() => {
      clearBtn.click();
    });

    expect(screen.getByText(/no focus traps detected/i)).toBeTruthy();
  });

  it("clear button is disabled when no traps", () => {
    render(<FocusTrapPanel />);
    const clearBtn = screen.getByText("Clear");
    expect(clearBtn.hasAttribute("disabled")).toBe(true);
  });

  it("detects longer cycles (3 elements)", () => {
    render(<FocusTrapPanel />);
    const a = document.createElement("button");
    const b = document.createElement("input");
    const c = document.createElement("a");
    document.body.appendChild(a);
    document.body.appendChild(b);
    document.body.appendChild(c);

    act(() => {
      dispatch(a, 1000);
      dispatch(b, 1100);
      dispatch(c, 1200);
      dispatch(a, 1300);
      dispatch(b, 1400);
      dispatch(c, 1500);
    });

    expect(screen.getByText(/3 elements/)).toBeTruthy();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = render(<FocusTrapPanel />);
    expect(subscribers).toHaveLength(1);
    unmount();
    expect(subscribers).toHaveLength(0);
  });
});
