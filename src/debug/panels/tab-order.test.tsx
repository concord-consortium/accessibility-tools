import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TabOrderPanel } from "./tab-order";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("TabOrderPanel", () => {
  it("renders with title", () => {
    render(<TabOrderPanel />);
    expect(screen.getByText("Tab Order")).toBeTruthy();
  });

  it("has a Rescan button", () => {
    render(<TabOrderPanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
  });

  it("shows tabbable count", () => {
    render(<TabOrderPanel />);
    expect(screen.getByText(/tabbable/)).toBeTruthy();
  });

  it("finds tabbable elements", () => {
    document.body.innerHTML =
      "<div><button>One</button><button>Two</button></div>";
    render(<TabOrderPanel />);
    expect(screen.getByText(/tabbable/)).toBeTruthy();
  });

  it("flags positive tabindex", () => {
    document.body.innerHTML = '<button tabindex="5">Bad Order</button>';
    render(<TabOrderPanel />);
    expect(screen.getByText(/1 issue/)).toBeTruthy();
    expect(screen.getByText(/positive tabindex/i)).toBeTruthy();
  });

  it("shows removed-from-tab-order section for tabindex=-1", () => {
    document.body.innerHTML = '<button tabindex="-1">Removed</button>';
    render(<TabOrderPanel />);
    expect(screen.getByText(/removed from tab order/i)).toBeTruthy();
  });

  it("rescan button triggers toast", () => {
    render(<TabOrderPanel />);
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
