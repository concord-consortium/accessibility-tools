import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("rebuilds badges when DOM changes", async () => {
    vi.useFakeTimers();

    const span = document.createElement("span");
    span.textContent = "Hello";
    span.style.color = "#000";
    span.style.backgroundColor = "#fff";
    vi.spyOn(span, "getBoundingClientRect").mockReturnValue({
      width: 50,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 50,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    document.body.appendChild(span);

    toggleContrastOverlay();
    const initialCount = document.querySelectorAll(
      "[data-a11y-debug='contrast-badge']",
    ).length;

    // Add a new text element
    const span2 = document.createElement("span");
    span2.textContent = "World";
    span2.style.color = "#000";
    span2.style.backgroundColor = "#fff";
    vi.spyOn(span2, "getBoundingClientRect").mockReturnValue({
      width: 50,
      height: 20,
      top: 30,
      left: 0,
      bottom: 50,
      right: 50,
      x: 0,
      y: 30,
      toJSON: () => {},
    });
    document.body.appendChild(span2);

    // Flush MutationObserver microtask queue
    await vi.advanceTimersByTimeAsync(0);

    const newCount = document.querySelectorAll(
      "[data-a11y-debug='contrast-badge']",
    ).length;
    expect(newCount).toBeGreaterThan(initialCount);

    toggleContrastOverlay(); // cleanup
    vi.useRealTimers();
  });
});
