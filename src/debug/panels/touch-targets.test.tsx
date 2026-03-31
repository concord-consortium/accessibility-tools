import { render, screen } from "@testing-library/react";
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

  it("shows target count", () => {
    render(<TouchTargetsPanel />);
    expect(screen.getByText(/targets/)).toBeTruthy();
  });
});
