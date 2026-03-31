import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AriaValidationPanel } from "./aria-validation";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AriaValidationPanel", () => {
  it("renders with title", () => {
    render(<AriaValidationPanel />);
    expect(screen.getByText("ARIA Validation")).toBeTruthy();
  });

  it("has a Rescan button", () => {
    render(<AriaValidationPanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
  });

  it("shows issue count", () => {
    render(<AriaValidationPanel />);
    expect(screen.getByText(/\d+ issue/)).toBeTruthy();
  });

  it("shows empty state when no issues", () => {
    render(<AriaValidationPanel />);
    expect(screen.getByText(/no aria validation issues/i)).toBeTruthy();
  });

  it("shows issues when ARIA errors exist", () => {
    document.body.innerHTML = '<div role="banana">Invalid</div>';
    render(<AriaValidationPanel />);
    expect(screen.getByText(/invalid role/i)).toBeTruthy();
  });

  it("shows severity badge ERR for errors", () => {
    document.body.innerHTML = '<div role="banana">Invalid</div>';
    render(<AriaValidationPanel />);
    expect(screen.getByText("ERR")).toBeTruthy();
  });

  it("rescan button triggers toast", () => {
    render(<AriaValidationPanel />);
    const container = document.createElement("div");
    container.className = "a11y-debug-sidebar";
    document.body.appendChild(container);

    act(() => {
      screen.getByText("Rescan").click();
    });

    const toast = document.querySelector(".a11y-toast");
    expect(toast?.textContent).toContain("Rescan complete");
  });
});
