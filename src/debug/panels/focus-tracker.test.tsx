import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachMockFiber } from "../utils/fiber";
import * as focusStream from "../utils/focus-stream";
import { FocusTrackerPanel } from "./focus-tracker";

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

function dispatch(event: focusStream.A11yFocusEvent) {
  for (const sub of subscribers) {
    sub(event);
  }
}

describe("FocusTrackerPanel", () => {
  it("shows empty state when no focus events yet", () => {
    render(<FocusTrackerPanel />);
    expect(screen.getByText(/no focus events captured/i)).toBeTruthy();
  });

  it("shows focused element tag after focus event", () => {
    render(<FocusTrackerPanel />);
    const btn = document.createElement("button");
    btn.id = "test-btn";
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getByText("<button>")).toBeTruthy();
    expect(screen.getByText("test-btn")).toBeTruthy();
  });

  it("shows React component name when available", () => {
    render(<FocusTrackerPanel />);
    const btn = document.createElement("button");
    attachMockFiber(btn, "MyButton");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getAllByText("MyButton").length).toBeGreaterThanOrEqual(1);
  });

  it("shows ARIA attributes", () => {
    render(<FocusTrackerPanel />);
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-label", "Settings tab");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getByText("tab")).toBeTruthy();
    expect(screen.getByText("Settings tab")).toBeTruthy();
  });

  it("shows previous element description", () => {
    render(<FocusTrackerPanel />);
    const prev = document.createElement("input");
    prev.id = "prev-input";
    const next = document.createElement("button");
    document.body.appendChild(prev);
    document.body.appendChild(next);

    act(() => {
      dispatch({ element: next, previousElement: prev, timestamp: 1000 });
    });

    expect(screen.getByText(/Previous:/)).toBeTruthy();
  });

  it("shows component path breadcrumb", () => {
    render(<FocusTrackerPanel />);
    const btn = document.createElement("button");
    attachMockFiber(btn, "ToolbarButton", ["App", "Workspace"]);
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getByText("App")).toBeTruthy();
    expect(screen.getByText("Workspace")).toBeTruthy();
    expect(screen.getAllByText("ToolbarButton").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("has a Highlight toggle button", () => {
    render(<FocusTrackerPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    const highlightBtn = screen.getByText("Highlight");
    expect(highlightBtn).toBeTruthy();
    expect(highlightBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("has an Inspect button that calls onNavigateToPanel", () => {
    const navigate = vi.fn();
    render(<FocusTrackerPanel onNavigateToPanel={navigate} />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    const inspectBtn = screen.getByText("Inspect");
    act(() => {
      inspectBtn.click();
    });

    expect(navigate).toHaveBeenCalledWith("inspector", btn);
  });
});
