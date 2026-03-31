import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as focusStream from "../utils/focus-stream";
import { ScreenReaderPreviewPanel } from "./screen-reader-preview";

let subscribers: Array<(event: focusStream.A11yFocusEvent) => void> = [];

beforeEach(() => {
  subscribers = [];
  vi.spyOn(focusStream, "subscribeFocus").mockImplementation((cb) => {
    subscribers.push(cb);
    return () => {
      subscribers = subscribers.filter((s) => s !== cb);
    };
  });
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

describe("ScreenReaderPreviewPanel", () => {
  it("renders with title", () => {
    render(<ScreenReaderPreviewPanel />);
    expect(screen.getByText("Screen Reader Text Preview")).toBeTruthy();
  });

  it("shows empty state when no focus", () => {
    render(<ScreenReaderPreviewPanel />);
    expect(screen.getByText(/focus an element/i)).toBeTruthy();
  });

  it("shows accessible info after focus event", () => {
    render(<ScreenReaderPreviewPanel />);
    const btn = document.createElement("button");
    btn.textContent = "Save";
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getAllByText(/Save/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("button").length).toBeGreaterThanOrEqual(1);
  });

  it("shows role for focused element", () => {
    render(<ScreenReaderPreviewPanel />);
    const btn = document.createElement("button");
    btn.textContent = "Click";
    document.body.appendChild(btn);

    act(() => {
      dispatch({ element: btn, previousElement: null, timestamp: 1000 });
    });

    // Should show role in the breakdown
    const roleValues = screen.getAllByText("button");
    expect(roleValues.length).toBeGreaterThanOrEqual(1);
  });

  it("warns when focused element has no accessible name", () => {
    render(<ScreenReaderPreviewPanel />);
    const div = document.createElement("div");
    div.setAttribute("role", "button");
    document.body.appendChild(div);

    act(() => {
      dispatch({ element: div, previousElement: null, timestamp: 1000 });
    });

    expect(screen.getByText(/no accessible name/i)).toBeTruthy();
  });
});
