import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSelectionAnnouncer } from "./use-selection-announcer";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("useSelectionAnnouncer", () => {
  it("does nothing when config is undefined", () => {
    renderHook(() => useSelectionAnnouncer(undefined));
    expect(document.querySelector("[aria-live]")).toBeNull();
  });

  it("creates a hidden aria-live region when no announceRef provided", () => {
    const { unmount } = renderHook(() =>
      useSelectionAnnouncer({
        selectedItems: ["a"],
        getLabel: (id) => id,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const region = document.querySelector("[aria-live]");
    expect(region).toBeTruthy();
    expect(region?.getAttribute("aria-live")).toBe("polite");

    unmount();
    // Should clean up the created region
    expect(document.querySelector("[aria-live]")).toBeNull();
  });

  it("uses provided announceRef", () => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);

    const ref = { current: liveRegion };

    renderHook(() =>
      useSelectionAnnouncer({
        selectedItems: ["a"],
        getLabel: (id) => `Selected: ${id}`,
        announceRef: ref,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Need to flush rAF for the textContent set
    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(liveRegion.textContent).toBe("Selected: a");
  });

  it("announces single item with getLabel", () => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
    const ref = { current: liveRegion };

    renderHook(() =>
      useSelectionAnnouncer({
        selectedItems: ["apple"],
        getLabel: (id) => `${id} fruit selected`,
        announceRef: ref,
      }),
    );

    act(() => vi.advanceTimersByTime(200));
    act(() => vi.advanceTimersByTime(20));

    expect(liveRegion.textContent).toBe("apple fruit selected");
  });

  it("announces multiple items with multiSelectMessage", () => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
    const ref = { current: liveRegion };

    renderHook(() =>
      useSelectionAnnouncer({
        selectedItems: ["a", "b", "c"],
        getLabel: (id) => id,
        multiSelectMessage: "{count} items selected",
        announceRef: ref,
      }),
    );

    act(() => vi.advanceTimersByTime(200));
    act(() => vi.advanceTimersByTime(20));

    expect(liveRegion.textContent).toBe("3 items selected");
  });

  it("uses default plural message when no multiSelectMessage", () => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
    const ref = { current: liveRegion };

    renderHook(() =>
      useSelectionAnnouncer({
        selectedItems: ["a", "b"],
        getLabel: (id) => id,
        announceRef: ref,
      }),
    );

    act(() => vi.advanceTimersByTime(200));
    act(() => vi.advanceTimersByTime(20));

    expect(liveRegion.textContent).toBe("2 items selected");
  });

  it("debounces rapid selection changes", () => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
    const ref = { current: liveRegion };

    const { rerender } = renderHook(
      ({ items }: { items: string[] }) =>
        useSelectionAnnouncer({
          selectedItems: items,
          getLabel: (id) => id,
          announceRef: ref,
          debounceMs: 100,
        }),
      { initialProps: { items: ["a"] } },
    );

    // Rapidly add items
    rerender({ items: ["a", "b"] });
    act(() => vi.advanceTimersByTime(50));

    rerender({ items: ["a", "b", "c"] });
    act(() => vi.advanceTimersByTime(50));

    // Not yet announced (still within debounce)
    expect(liveRegion.textContent).toBe("");

    // After debounce completes
    act(() => vi.advanceTimersByTime(100));
    act(() => vi.advanceTimersByTime(20));

    // Should announce the final state, not intermediate
    expect(liveRegion.textContent).toBe("3 items selected");
  });

  it("works with Set selectedItems", () => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
    const ref = { current: liveRegion };

    renderHook(() =>
      useSelectionAnnouncer({
        selectedItems: new Set(["x"]),
        getLabel: (id) => `item ${id}`,
        announceRef: ref,
      }),
    );

    act(() => vi.advanceTimersByTime(200));
    act(() => vi.advanceTimersByTime(20));

    expect(liveRegion.textContent).toBe("item x");
  });

  it("does not announce when selection is empty", () => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
    const ref = { current: liveRegion };

    const { rerender } = renderHook(
      ({ items }: { items: string[] }) =>
        useSelectionAnnouncer({
          selectedItems: items,
          getLabel: (id) => id,
          announceRef: ref,
        }),
      { initialProps: { items: ["a"] } },
    );

    act(() => vi.advanceTimersByTime(200));
    act(() => vi.advanceTimersByTime(20));
    expect(liveRegion.textContent).toBe("a");

    // Clear selection
    liveRegion.textContent = "";
    rerender({ items: [] });
    act(() => vi.advanceTimersByTime(200));
    act(() => vi.advanceTimersByTime(20));

    // Should not announce anything for empty selection
    expect(liveRegion.textContent).toBe("");
  });
});
