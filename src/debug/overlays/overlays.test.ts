import { afterEach, describe, expect, it } from "vitest";
import { toggleForcedColors } from "./forced-colors";
import { isOverlayActive, removeOverlayCSS } from "./inject-css";
import { toggleReflow } from "./reflow";
import { toggleTextSpacing } from "./text-spacing";

afterEach(() => {
  // Clean up any injected styles
  removeOverlayCSS("text-spacing");
  removeOverlayCSS("reflow");
  removeOverlayCSS("forced-colors");
});

describe("toggleTextSpacing", () => {
  it("injects WCAG 1.4.12 text spacing CSS", () => {
    const result = toggleTextSpacing();
    expect(result).toBe(true);
    expect(isOverlayActive("text-spacing")).toBe(true);

    const style = document.getElementById("a11y-overlay-text-spacing");
    expect(style?.textContent).toContain("line-height: 1.5");
    expect(style?.textContent).toContain("letter-spacing: 0.12em");
    expect(style?.textContent).toContain("word-spacing: 0.16em");
  });

  it("includes sidebar reset", () => {
    toggleTextSpacing();
    const style = document.getElementById("a11y-overlay-text-spacing");
    expect(style?.textContent).toContain(".a11y-debug-sidebar");
    expect(style?.textContent).toContain("line-height: normal");
  });

  it("toggles off on second call", () => {
    toggleTextSpacing();
    const result = toggleTextSpacing();
    expect(result).toBe(false);
    expect(isOverlayActive("text-spacing")).toBe(false);
  });
});

describe("toggleReflow", () => {
  it("injects 320px constraint on first call", () => {
    const result = toggleReflow();
    expect(result).toBe(320);
    expect(isOverlayActive("reflow")).toBe(true);

    const style = document.getElementById("a11y-overlay-reflow");
    expect(style?.textContent).toContain("320px");
  });

  it("cycles to 256px on second call", () => {
    toggleReflow();
    const result = toggleReflow();
    expect(result).toBe(256);

    const style = document.getElementById("a11y-overlay-reflow");
    expect(style?.textContent).toContain("256px");
  });

  it("turns off on third call", () => {
    toggleReflow();
    toggleReflow();
    const result = toggleReflow();
    expect(result).toBeNull();
    expect(isOverlayActive("reflow")).toBe(false);
  });
});

describe("toggleForcedColors", () => {
  it("injects forced colors CSS", () => {
    const result = toggleForcedColors();
    expect(result).toBe(true);
    expect(isOverlayActive("forced-colors")).toBe(true);

    const style = document.getElementById("a11y-overlay-forced-colors");
    expect(style?.textContent).toContain("Canvas");
    expect(style?.textContent).toContain("CanvasText");
    expect(style?.textContent).toContain("forced-color-adjust");
  });

  it("toggles off on second call", () => {
    toggleForcedColors();
    const result = toggleForcedColors();
    expect(result).toBe(false);
    expect(isOverlayActive("forced-colors")).toBe(false);
  });
});
