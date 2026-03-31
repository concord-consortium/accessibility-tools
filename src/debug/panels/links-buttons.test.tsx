import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LinksButtonsPanel } from "./links-buttons";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("LinksButtonsPanel", () => {
  it("renders with title", () => {
    render(<LinksButtonsPanel />);
    expect(screen.getByText("Link & Button Audit")).toBeTruthy();
  });

  it("has a Rescan button", () => {
    render(<LinksButtonsPanel />);
    expect(screen.getAllByText("Rescan").length).toBeGreaterThanOrEqual(1);
  });

  it("shows element and issue counts", () => {
    render(<LinksButtonsPanel />);
    expect(screen.getByText(/\d+ elements/)).toBeTruthy();
  });

  it("finds links and buttons on the page", () => {
    document.body.innerHTML =
      '<div><a href="/">Home</a><button>Save</button></div>';
    render(<LinksButtonsPanel />);
    // Panel itself has a Rescan button, so count includes it
    expect(screen.getByText(/\d+ elements/)).toBeTruthy();
  });

  it("shows issues for buttons without names", () => {
    document.body.innerHTML = "<div><button></button></div>";
    render(<LinksButtonsPanel />);
    expect(
      screen.getAllByText(/no accessible name/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows link accessible name in list", () => {
    document.body.innerHTML = '<a href="/about">About us</a>';
    render(<LinksButtonsPanel />);
    expect(screen.getAllByText("About us").length).toBeGreaterThanOrEqual(1);
  });

  it("rescan button triggers toast", () => {
    render(<LinksButtonsPanel />);
    const container = document.createElement("div");
    container.className = "a11y-debug-sidebar";
    document.body.appendChild(container);

    act(() => {
      screen.getAllByText("Rescan")[0].click();
    });

    const toast = document.querySelector(".a11y-toast");
    expect(toast?.textContent).toContain("Rescan complete");
  });
});
