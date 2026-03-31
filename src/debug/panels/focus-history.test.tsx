import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachMockFiber } from "../utils/fiber";
import * as focusStream from "../utils/focus-stream";
import { FocusHistoryPanel } from "./focus-history";

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

describe("FocusHistoryPanel", () => {
  it("shows empty state when no focus events", () => {
    render(<FocusHistoryPanel />);
    expect(screen.getByText(/no focus events recorded/i)).toBeTruthy();
  });

  it("shows event count after focus events", () => {
    render(<FocusHistoryPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getByText(/1 event\b/)).toBeTruthy();
  });

  it("shows component name when available", () => {
    render(<FocusHistoryPanel />);
    const btn = document.createElement("button");
    attachMockFiber(btn, "MyButton");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getByText("MyButton")).toBeTruthy();
  });

  it("shows tag name when no component name", () => {
    render(<FocusHistoryPanel />);
    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      dispatch({ element: input, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getAllByText("<input>").length).toBeGreaterThanOrEqual(1);
  });

  it("shows document.body for body focus events", () => {
    render(<FocusHistoryPanel />);

    act(() => {
      dispatch({
        element: document.body,
        previousElement: null,
        timestamp: 1000,
      });
    });

    expect(screen.getByText("document.body")).toBeTruthy();
  });

  it("shows duration for previous entries", () => {
    render(<FocusHistoryPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      dispatch({ element: btn1, previousElement: null, timestamp: 1000 });
    });
    act(() => {
      dispatch({ element: btn2, previousElement: btn1, timestamp: 3500 });
    });

    expect(screen.getByText("2.5s")).toBeTruthy();
    expect(screen.getByText("...")).toBeTruthy();
  });

  it("has role=log on the event list", () => {
    render(<FocusHistoryPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getByRole("log")).toBeTruthy();
  });

  it("calls onNavigateToPanel when clicking a row", () => {
    const navigate = vi.fn();
    render(<FocusHistoryPanel onNavigateToPanel={navigate} />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    const rows = screen.getAllByRole("button");
    // Find the row button (not the panel buttons)
    const historyRow = rows.find((r) =>
      r.getAttribute("aria-label")?.includes("at "),
    );
    expect(historyRow).toBeTruthy();

    act(() => {
      historyRow?.click();
    });

    expect(navigate).toHaveBeenCalledWith("inspector", btn);
  });

  it("shows colored dot for each entry", () => {
    render(<FocusHistoryPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    const dot = document.querySelector(".a11y-focus-history-dot");
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.background).toBeTruthy();
  });
});
