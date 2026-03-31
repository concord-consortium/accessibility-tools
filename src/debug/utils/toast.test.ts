import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showToast } from "./toast";

beforeEach(() => {
  vi.useFakeTimers();
  // Create a sidebar container for the toast to attach to
  const sidebar = document.createElement("div");
  sidebar.className = "a11y-debug-sidebar";
  document.body.appendChild(sidebar);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("showToast", () => {
  it("creates a toast element in the sidebar", () => {
    showToast("Test message");

    const toast = document.querySelector(".a11y-toast");
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toBe("Test message");
  });

  it("sets role=status and aria-live=polite", () => {
    showToast("Test");

    const toast = document.querySelector(".a11y-toast");
    expect(toast?.getAttribute("role")).toBe("status");
    expect(toast?.getAttribute("aria-live")).toBe("polite");
  });

  it("sets data-a11y-debug for sidebar exclusion", () => {
    showToast("Test");

    const toast = document.querySelector(".a11y-toast");
    expect(toast?.getAttribute("data-a11y-debug")).toBe("toast");
  });

  it("shows the toast with visible class", () => {
    showToast("Test");

    const toast = document.querySelector(".a11y-toast") as HTMLElement;
    expect(toast.style.display).toBe("block");
    expect(toast.classList.contains("a11y-toast-visible")).toBe(true);
  });

  it("hides after the specified duration", () => {
    showToast("Test", 2000);

    const toast = document.querySelector(".a11y-toast") as HTMLElement;
    expect(toast.classList.contains("a11y-toast-visible")).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(toast.classList.contains("a11y-toast-visible")).toBe(false);

    vi.advanceTimersByTime(200); // fade-out transition
    expect(toast.style.display).toBe("none");
  });

  it("replaces previous toast message", () => {
    showToast("First");
    showToast("Second");

    const toasts = document.querySelectorAll(".a11y-toast");
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toBe("Second");
  });

  it("resets timer when called again before hiding", () => {
    showToast("First", 2000);

    vi.advanceTimersByTime(1500);
    showToast("Second", 2000);

    const toast = document.querySelector(".a11y-toast") as HTMLElement;
    expect(toast.classList.contains("a11y-toast-visible")).toBe(true);
    expect(toast.textContent).toBe("Second");

    // Original timer would have fired at 2000, but reset to 3500
    vi.advanceTimersByTime(600);
    expect(toast.classList.contains("a11y-toast-visible")).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(toast.classList.contains("a11y-toast-visible")).toBe(false);
  });
});
