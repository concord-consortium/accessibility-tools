import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachMockFiber } from "../utils/fiber";
import { ElementInspectorPanel } from "./element-inspector";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ElementInspectorPanel", () => {
  it("shows empty state with Pick Element button", () => {
    render(<ElementInspectorPanel />);
    expect(screen.getByText("Pick Element")).toBeTruthy();
    expect(screen.getByText(/click.*pick element/i)).toBeTruthy();
  });

  it("shows element details when inspectTarget is provided", () => {
    const btn = document.createElement("button");
    btn.id = "my-btn";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-label", "Settings");
    document.body.appendChild(btn);

    render(<ElementInspectorPanel inspectTarget={btn} />);

    expect(screen.getByText("<button>")).toBeTruthy();
    expect(screen.getByText("my-btn")).toBeTruthy();
    expect(screen.getByText("tab")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows tab order info", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    render(<ElementInspectorPanel inspectTarget={btn} />);

    expect(screen.getByText("Tab Order")).toBeTruthy();
    expect(screen.getByText("naturally tabbable")).toBeTruthy();
  });

  it("marks buttons as naturally tabbable", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    render(<ElementInspectorPanel inspectTarget={btn} />);

    const values = screen.getAllByText("yes");
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  it("marks divs as not naturally tabbable", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    render(<ElementInspectorPanel inspectTarget={div} />);

    const values = screen.getAllByText("no");
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  it("shows ARIA attributes section", () => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-haspopup", "menu");
    document.body.appendChild(btn);

    render(<ElementInspectorPanel inspectTarget={btn} />);

    expect(screen.getByText("ARIA Attributes")).toBeTruthy();
    expect(screen.getByText("aria-expanded")).toBeTruthy();
    expect(screen.getByText("true")).toBeTruthy();
    expect(screen.getByText("aria-haspopup")).toBeTruthy();
    expect(screen.getByText("menu")).toBeTruthy();
  });

  it("warns about missing accessible name on interactive elements", () => {
    const div = document.createElement("div");
    div.setAttribute("role", "button");
    document.body.appendChild(div);

    render(<ElementInspectorPanel inspectTarget={div} />);

    expect(
      screen.getByText(/interactive element has no accessible name/i),
    ).toBeTruthy();
  });

  it("does not warn when accessible name exists", () => {
    const btn = document.createElement("button");
    btn.textContent = "Click me";
    document.body.appendChild(btn);

    render(<ElementInspectorPanel inspectTarget={btn} />);

    expect(
      screen.queryByText(/interactive element has no accessible name/i),
    ).toBeNull();
  });

  it("shows React component path", () => {
    const btn = document.createElement("button");
    btn.textContent = "Click";
    attachMockFiber(btn, "ToolbarButton", ["App", "Workspace"]);
    document.body.appendChild(btn);

    render(<ElementInspectorPanel inspectTarget={btn} />);

    expect(screen.getByText("React Component Path")).toBeTruthy();
    expect(screen.getByText("App")).toBeTruthy();
    expect(screen.getByText("Workspace")).toBeTruthy();
    expect(screen.getAllByText("ToolbarButton").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("has a Locate button", () => {
    const btn = document.createElement("button");
    btn.textContent = "Click";
    document.body.appendChild(btn);

    render(<ElementInspectorPanel inspectTarget={btn} />);

    expect(
      screen.getByLabelText("Scroll to and highlight this element"),
    ).toBeTruthy();
  });

  it("Pick Element button toggles aria-pressed", () => {
    render(<ElementInspectorPanel />);
    const pickBtn = screen.getByText("Pick Element");
    expect(pickBtn.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      pickBtn.click();
    });

    expect(pickBtn.getAttribute("aria-pressed")).toBe("true");
  });
});
