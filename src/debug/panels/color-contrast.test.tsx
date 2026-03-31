import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ColorContrastPanel } from "./color-contrast";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ColorContrastPanel", () => {
  it("renders with title", () => {
    render(<ColorContrastPanel />);
    expect(screen.getByText("Color Contrast Checker")).toBeTruthy();
  });

  it("has a Rescan button", () => {
    render(<ColorContrastPanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
  });

  it("shows element and issue counts", () => {
    render(<ColorContrastPanel />);
    expect(screen.getByText(/\d+ elements, \d+ issues/)).toBeTruthy();
  });

  it("scans text elements on mount", () => {
    document.body.innerHTML = "<p>Hello world</p>";
    render(<ColorContrastPanel />);
    expect(screen.getByText(/\d+ elements/)).toBeTruthy();
  });

  it("shows counts for empty page", () => {
    render(<ColorContrastPanel />);
    // Panel itself has text, but no app text to scan
    expect(screen.getByText(/\d+ elements, \d+ issues/)).toBeTruthy();
  });

  it("rescan button triggers toast", () => {
    render(<ColorContrastPanel />);
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
