import { render, screen } from "@testing-library/react";
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
      '<div id="root"><a href="/">Home</a><button>Save</button></div>';
    render(<LinksButtonsPanel />);
    expect(screen.getByText(/elements/)).toBeTruthy();
  });

  it("shows issues for buttons without names", () => {
    document.body.innerHTML = '<div id="root"><button></button></div>';
    render(<LinksButtonsPanel />);
    expect(screen.getByText(/no accessible name/i)).toBeTruthy();
  });
});
