import { afterEach, describe, expect, it } from "vitest";
import { toggleContrastOverlay } from "./contrast-overlay";

afterEach(() => {
  // Ensure deactivated
  const badges = document.querySelectorAll(
    "[data-a11y-debug='contrast-badge']",
  );
  if (badges.length > 0) toggleContrastOverlay();
  document.body.innerHTML = "";
});

describe("toggleContrastOverlay", () => {
  it("returns true when activating", () => {
    expect(toggleContrastOverlay()).toBe(true);
    toggleContrastOverlay();
  });

  it("returns false when deactivating", () => {
    toggleContrastOverlay();
    expect(toggleContrastOverlay()).toBe(false);
  });

  it("toggle cycle activates then deactivates", () => {
    expect(toggleContrastOverlay()).toBe(true);
    expect(toggleContrastOverlay()).toBe(false);
    expect(toggleContrastOverlay()).toBe(true);
    toggleContrastOverlay(); // cleanup
  });
});
