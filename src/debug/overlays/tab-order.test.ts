import { afterEach, describe, expect, it, vi } from "vitest";
import { toggleTabOrder } from "./tab-order";

afterEach(() => {
  // Ensure deactivated
  const badges = document.querySelectorAll(
    "[data-a11y-debug='tab-order-badge']",
  );
  if (badges.length > 0) toggleTabOrder();
  document.body.innerHTML = "";
});

describe("toggleTabOrder", () => {
  it("returns true when activating", () => {
    expect(toggleTabOrder()).toBe(true);
    toggleTabOrder();
  });

  it("returns false when deactivating", () => {
    toggleTabOrder();
    expect(toggleTabOrder()).toBe(false);
  });

  it("creates badges for tabbable elements", () => {
    const btn1 = document.createElement("button");
    btn1.textContent = "One";
    const btn2 = document.createElement("button");
    btn2.textContent = "Two";
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    // Mock getBoundingClientRect for both buttons
    const mockRect = {
      width: 40,
      height: 30,
      top: 10,
      left: 10,
      bottom: 40,
      right: 50,
      x: 10,
      y: 10,
      toJSON: () => {},
    };
    vi.spyOn(btn1, "getBoundingClientRect").mockReturnValue(mockRect);
    vi.spyOn(btn2, "getBoundingClientRect").mockReturnValue(mockRect);

    toggleTabOrder();
    const badges = document.querySelectorAll(
      "[data-a11y-debug='tab-order-badge']",
    );
    expect(badges.length).toBe(2);
    expect(badges[0].textContent).toBe("1");
    expect(badges[1].textContent).toBe("2");
  });

  it("removes badges on deactivate", () => {
    const btn = document.createElement("button");
    btn.textContent = "One";
    document.body.appendChild(btn);
    vi.spyOn(btn, "getBoundingClientRect").mockReturnValue({
      width: 40,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 40,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    toggleTabOrder();
    expect(
      document.querySelectorAll("[data-a11y-debug='tab-order-badge']").length,
    ).toBe(1);

    toggleTabOrder();
    expect(
      document.querySelectorAll("[data-a11y-debug='tab-order-badge']").length,
    ).toBe(0);
  });

  it("handles invalid tabindex without breaking sort order", () => {
    const btn1 = document.createElement("button");
    btn1.textContent = "Valid";
    const btn2 = document.createElement("button");
    btn2.textContent = "Invalid";
    btn2.setAttribute("tabindex", "notanumber");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    const mockRect = {
      width: 40,
      height: 30,
      top: 10,
      left: 10,
      bottom: 40,
      right: 50,
      x: 10,
      y: 10,
      toJSON: () => {},
    };
    vi.spyOn(btn1, "getBoundingClientRect").mockReturnValue(mockRect);
    vi.spyOn(btn2, "getBoundingClientRect").mockReturnValue(mockRect);

    toggleTabOrder();
    const badges = document.querySelectorAll(
      "[data-a11y-debug='tab-order-badge']",
    );
    expect(badges.length).toBe(2);
  });

  it("badges have aria-hidden", () => {
    const btn = document.createElement("button");
    btn.textContent = "One";
    document.body.appendChild(btn);
    vi.spyOn(btn, "getBoundingClientRect").mockReturnValue({
      width: 40,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 40,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    toggleTabOrder();
    const badge = document.querySelector("[data-a11y-debug='tab-order-badge']");
    expect(badge?.getAttribute("aria-hidden")).toBe("true");
  });
});
