import { render, screen } from "@testing-library/react";
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
    document.body.innerHTML =
      '<div id="root"><p style="color: black">Hello</p></div>';
    render(<ColorContrastPanel />);
    expect(screen.getByText(/\d+ elements/)).toBeTruthy();
  });
});
