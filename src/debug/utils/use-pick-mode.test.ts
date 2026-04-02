import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePickMode } from "./use-pick-mode";

afterEach(() => {
  document.body.classList.remove("a11y-pick-mode");
  document.body.innerHTML = "";
});

describe("usePickMode", () => {
  it("does nothing when not active", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePickMode({ active: false, onPick, onCancel }));
    expect(document.body.classList.contains("a11y-pick-mode")).toBe(false);
  });

  it("adds a11y-pick-mode class when active", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePickMode({ active: true, onPick, onCancel }));
    expect(document.body.classList.contains("a11y-pick-mode")).toBe(true);
  });

  it("removes a11y-pick-mode class on cleanup", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    const { unmount } = renderHook(() =>
      usePickMode({ active: true, onPick, onCancel }),
    );
    expect(document.body.classList.contains("a11y-pick-mode")).toBe(true);
    unmount();
    expect(document.body.classList.contains("a11y-pick-mode")).toBe(false);
  });

  it("calls onPick when clicking a non-sidebar element", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    const target = document.createElement("button");
    document.body.appendChild(target);

    renderHook(() => usePickMode({ active: true, onPick, onCancel }));

    act(() => {
      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: target });
      document.dispatchEvent(event);
    });

    expect(onPick).toHaveBeenCalledWith(target);
  });

  it("ignores clicks on sidebar elements", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    const sidebar = document.createElement("div");
    sidebar.setAttribute("data-a11y-debug", "sidebar");
    const btn = document.createElement("button");
    sidebar.appendChild(btn);
    document.body.appendChild(sidebar);

    renderHook(() => usePickMode({ active: true, onPick, onCancel }));

    act(() => {
      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: btn });
      document.dispatchEvent(event);
    });

    expect(onPick).not.toHaveBeenCalled();
  });

  it("calls onCancel when Escape is pressed", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePickMode({ active: true, onPick, onCancel }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("removes highlight on mouseout when leaving document", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => usePickMode({ active: true, onPick, onCancel }));

    // mouseout with null relatedTarget (leaving the document)
    act(() => {
      const event = new MouseEvent("mouseout", {
        bubbles: true,
        relatedTarget: null,
      });
      document.dispatchEvent(event);
    });

    // No highlight element should remain
    expect(document.querySelector("[data-a11y-debug='highlight']")).toBeNull();
  });
});
