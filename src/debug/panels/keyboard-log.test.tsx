import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyboardLogPanel } from "./keyboard-log";

let rafCallbacks: Array<() => void> = [];

beforeEach(() => {
  rafCallbacks = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb as () => void);
    return rafCallbacks.length;
  });
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

function pressKey(
  key: string,
  options?: Partial<KeyboardEventInit> & { callPreventDefault?: boolean },
) {
  const { callPreventDefault, ...eventOpts } = options ?? {};
  const event = new KeyboardEvent("keydown", {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    bubbles: true,
    ...eventOpts,
  });
  document.body.dispatchEvent(event);
  if (callPreventDefault) {
    event.preventDefault();
  }
  flushRaf();
}

describe("KeyboardLogPanel", () => {
  it("shows empty state message", () => {
    render(<KeyboardLogPanel />);
    expect(screen.getByText(/no keyboard events captured/i)).toBeTruthy();
  });

  it("logs a keydown event", () => {
    render(<KeyboardLogPanel />);

    act(() => {
      pressKey("Tab");
    });

    expect(screen.getByText(/1 event\b/)).toBeTruthy();
    expect(screen.getByText("Tab")).toBeTruthy();
  });

  it("shows modifier keys", () => {
    render(<KeyboardLogPanel />);

    act(() => {
      pressKey("a", { shiftKey: true, ctrlKey: true });
    });

    expect(screen.getByText("Ctrl+Shift+a")).toBeTruthy();
  });

  it("detects preventDefault via monkey-patch", () => {
    render(<KeyboardLogPanel />);

    act(() => {
      // Add a handler that calls preventDefault before our capture listener logs
      const handler = (e: KeyboardEvent) => e.preventDefault();
      document.addEventListener("keydown", handler);
      pressKey("Escape");
      document.removeEventListener("keydown", handler);
    });

    expect(screen.getByText("PD")).toBeTruthy();
  });

  it("detects stopPropagation via monkey-patch", () => {
    render(<KeyboardLogPanel />);

    act(() => {
      const handler = (e: KeyboardEvent) => e.stopPropagation();
      document.addEventListener("keydown", handler);
      pressKey("Enter");
      document.removeEventListener("keydown", handler);
    });

    expect(screen.getByText("SP")).toBeTruthy();
  });

  it("clears the log", () => {
    render(<KeyboardLogPanel />);

    act(() => {
      pressKey("Tab");
    });

    expect(screen.getByText(/1 event/)).toBeTruthy();

    act(() => {
      screen.getByText("Clear").click();
    });

    expect(screen.getByText(/no keyboard events captured/i)).toBeTruthy();
  });

  it("clear button is disabled when empty", () => {
    render(<KeyboardLogPanel />);
    expect(screen.getByText("Clear").hasAttribute("disabled")).toBe(true);
  });

  it("caps at 50 entries", () => {
    render(<KeyboardLogPanel />);

    act(() => {
      for (let i = 0; i < 55; i++) {
        pressKey("a");
      }
    });

    expect(screen.getByText(/50 event/)).toBeTruthy();
  });

  it("has role=log on the event list", () => {
    render(<KeyboardLogPanel />);

    act(() => {
      pressKey("Tab");
    });

    expect(screen.getByRole("log")).toBeTruthy();
  });

  it("cleans up listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<KeyboardLogPanel />);
    unmount();
    expect(removeSpy.mock.calls.some((c) => c[0] === "keydown")).toBe(true);
  });
});
