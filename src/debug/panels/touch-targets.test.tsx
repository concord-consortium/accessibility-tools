import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TouchTargetsPanel } from "./touch-targets";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("TouchTargetsPanel", () => {
  it("renders with title", () => {
    render(<TouchTargetsPanel />);
    expect(screen.getByText("Touch Target Size")).toBeTruthy();
  });

  it("has a Rescan button", () => {
    render(<TouchTargetsPanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
  });

  it("shows target and issue counts", () => {
    render(<TouchTargetsPanel />);
    expect(screen.getByText(/\d+ targets, \d+ issues/)).toBeTruthy();
  });

  it("shows all-clear message when no issues", () => {
    render(<TouchTargetsPanel />);
    // jsdom elements have 0x0 rects so none are scanned
    expect(screen.getByText(/0 targets/)).toBeTruthy();
  });

  it("rescan button triggers toast on click", () => {
    render(<TouchTargetsPanel />);
    const sidebar = document.querySelector(".a11y-debug-sidebar");
    // Create sidebar container for toast
    if (!sidebar) {
      const container = document.createElement("div");
      container.className = "a11y-debug-sidebar";
      document.body.appendChild(container);
    }

    act(() => {
      screen.getByText("Rescan").click();
    });

    const toast = document.querySelector(".a11y-toast");
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain("Rescan complete");
  });
});
