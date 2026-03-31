import { afterEach, describe, expect, it } from "vitest";
import { toggleTouchTargetsOverlay } from "./touch-targets-overlay";

afterEach(() => {
  // Remove injected style
  document.getElementById("a11y-overlay-touch-targets")?.remove();
});

describe("toggleTouchTargetsOverlay", () => {
  it("returns true when activating", () => {
    expect(toggleTouchTargetsOverlay()).toBe(true);
    toggleTouchTargetsOverlay(); // deactivate
  });

  it("returns false when deactivating", () => {
    toggleTouchTargetsOverlay(); // activate
    expect(toggleTouchTargetsOverlay()).toBe(false);
  });

  it("injects a style element", () => {
    toggleTouchTargetsOverlay();
    const style = document.getElementById("a11y-overlay-touch-targets");
    expect(style).not.toBeNull();
    expect(style?.tagName.toLowerCase()).toBe("style");
    toggleTouchTargetsOverlay(); // cleanup
  });

  it("removes style on deactivate", () => {
    toggleTouchTargetsOverlay();
    expect(
      document.getElementById("a11y-overlay-touch-targets"),
    ).not.toBeNull();

    toggleTouchTargetsOverlay();
    expect(document.getElementById("a11y-overlay-touch-targets")).toBeNull();
  });
});
