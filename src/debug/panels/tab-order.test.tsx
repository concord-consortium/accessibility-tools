import { render, screen } from "@testing-library/react";
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
      '<div id="root"><button>One</button><button>Two</button></div>';
    render(<TabOrderPanel />);
    expect(screen.getByText(/tabbable/)).toBeTruthy();
  });
});
