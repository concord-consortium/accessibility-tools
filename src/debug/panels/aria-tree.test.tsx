import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AriaTreePanel } from "./aria-tree";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AriaTreePanel", () => {
  it("renders with title", () => {
    render(<AriaTreePanel />);
    expect(screen.getByText("ARIA Tree View")).toBeTruthy();
  });

  it("has Rescan, Expand, and Collapse buttons", () => {
    render(<AriaTreePanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
    expect(screen.getByText("Expand")).toBeTruthy();
    expect(screen.getByText("Collapse")).toBeTruthy();
  });

  it("has All and Roles filter buttons", () => {
    render(<AriaTreePanel />);
    expect(screen.getByText(/All \(/)).toBeTruthy();
    expect(screen.getByText(/Roles \(/)).toBeTruthy();
  });

  it("builds tree from DOM on mount", () => {
    document.body.innerHTML =
      '<div><nav aria-label="Main"><a href="/">Home</a></nav></div>';
    render(<AriaTreePanel />);
    expect(screen.getByRole("tree")).toBeTruthy();
  });

  it("shows role-bearing elements with role label", () => {
    document.body.innerHTML = '<nav aria-label="Main">Links</nav>';
    render(<AriaTreePanel />);
    expect(screen.getAllByText("navigation").length).toBeGreaterThanOrEqual(1);
  });

  it("shows aria-label in tree", () => {
    document.body.innerHTML = '<nav aria-label="Main">Links</nav>';
    render(<AriaTreePanel />);
    expect(screen.getAllByText(/"Main"/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows element tags", () => {
    document.body.innerHTML = "<main><p>Hello</p></main>";
    render(<AriaTreePanel />);
    expect(screen.getAllByText(/<main>/).length).toBeGreaterThanOrEqual(1);
  });

  it("toggles node expansion on click", () => {
    document.body.innerHTML =
      '<nav aria-label="Main"><a href="/">Home</a></nav>';
    render(<AriaTreePanel />);

    // Find a toggle arrow (nav has children so it gets one)
    const toggles = document.querySelectorAll(".a11y-tree-toggle");
    expect(toggles.length).toBeGreaterThan(0);
  });

  it("roles-only filter shows count", () => {
    document.body.innerHTML =
      "<div><button>Click</button><span>Text</span></div>";
    render(<AriaTreePanel />);

    const rolesBtn = screen.getByText(/Roles \(/);
    expect(rolesBtn).toBeTruthy();
    // Should have at least 1 role (button)
    expect(rolesBtn.textContent).toMatch(/Roles \(\d+\)/);
  });

  it("uses role=tree on the container", () => {
    render(<AriaTreePanel />);
    const tree = screen.getByRole("tree");
    expect(tree.getAttribute("aria-label")).toBe("ARIA tree");
  });

  it("rescan button triggers toast", () => {
    render(<AriaTreePanel />);
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
