import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardNav } from "./use-keyboard-nav";

function createContainer(itemCount: number): {
  container: HTMLDivElement;
  ref: { current: HTMLDivElement };
} {
  const container = document.createElement("div");
  for (let i = 0; i < itemCount; i++) {
    const item = document.createElement("button");
    item.textContent = `Item ${i}`;
    item.setAttribute("data-item", "");
    vi.spyOn(item, "focus");
    container.appendChild(item);
  }
  document.body.appendChild(container);
  return { container, ref: { current: container } };
}

function makeKey(
  key: string,
  opts: Partial<React.KeyboardEvent> = {},
): React.KeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...opts,
  } as unknown as React.KeyboardEvent;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useKeyboardNav", () => {
  it("returns null when config is undefined", () => {
    const { result } = renderHook(() => useKeyboardNav(undefined));
    expect(result.current).toBeNull();
  });

  it("returns navigation result when config is provided", () => {
    const { ref } = createContainer(3);
    const { result } = renderHook(() =>
      useKeyboardNav({
        containerRef: ref,
        itemSelector: "[data-item]",
        orientation: "horizontal",
      }),
    );
    expect(result.current).not.toBeNull();
    expect(result.current?.activeIndex).toBe(0);
  });

  describe("horizontal orientation", () => {
    it("moves right on ArrowRight", () => {
      const { ref, container } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
        }),
      );

      act(() => {
        result.current?.handleKeyDown(makeKey("ArrowRight"));
      });

      expect(result.current?.activeIndex).toBe(1);
      expect((container.children[1] as HTMLElement).focus).toHaveBeenCalled();
    });

    it("moves left on ArrowLeft", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      act(() => result.current?.handleKeyDown(makeKey("ArrowLeft")));

      expect(result.current?.activeIndex).toBe(0);
    });

    it("does not move past end without wrap", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
          wrap: false,
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));

      expect(result.current?.activeIndex).toBe(2);
    });

    it("wraps around with wrap enabled", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
          wrap: true,
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));

      expect(result.current?.activeIndex).toBe(0);
    });

    it("ignores ArrowUp/ArrowDown", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowDown")));
      expect(result.current?.activeIndex).toBe(0);

      act(() => result.current?.handleKeyDown(makeKey("ArrowUp")));
      expect(result.current?.activeIndex).toBe(0);
    });
  });

  describe("vertical orientation", () => {
    it("moves down on ArrowDown", () => {
      const { ref, container } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "vertical",
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowDown")));

      expect(result.current?.activeIndex).toBe(1);
      expect((container.children[1] as HTMLElement).focus).toHaveBeenCalled();
    });

    it("moves up on ArrowUp", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "vertical",
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowDown")));
      act(() => result.current?.handleKeyDown(makeKey("ArrowUp")));

      expect(result.current?.activeIndex).toBe(0);
    });

    it("ignores ArrowLeft/ArrowRight", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "vertical",
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      expect(result.current?.activeIndex).toBe(0);
    });
  });

  describe("Home/End", () => {
    it("Home jumps to first item", () => {
      const { ref } = createContainer(5);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));
      act(() => result.current?.handleKeyDown(makeKey("Home")));

      expect(result.current?.activeIndex).toBe(0);
    });

    it("End jumps to last item", () => {
      const { ref } = createContainer(5);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("End")));

      expect(result.current?.activeIndex).toBe(4);
    });
  });

  describe("Enter/Space activation", () => {
    it("calls onSelect on Enter", () => {
      const onSelect = vi.fn();
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
          onSelect,
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("Enter")));

      expect(onSelect).toHaveBeenCalledWith(expect.any(HTMLElement), 0);
    });

    it("calls onSelect on Space", () => {
      const onSelect = vi.fn();
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
          onSelect,
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey(" ")));

      expect(onSelect).toHaveBeenCalledOnce();
    });
  });

  describe("onFocusChange callback", () => {
    it("fires when focus moves", () => {
      const onFocusChange = vi.fn();
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
          onFocusChange,
        }),
      );

      act(() => result.current?.handleKeyDown(makeKey("ArrowRight")));

      expect(onFocusChange).toHaveBeenCalledWith(expect.any(HTMLElement), 1);
    });
  });

  describe("focusRing / getItemProps", () => {
    it("returns only onClick when focusRing is false", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
          focusRing: false,
        }),
      );

      const props = result.current?.getItemProps(0);
      expect(props?.onClick).toBeTypeOf("function");
      expect(props?.tabIndex).toBeUndefined();
      expect(props?.className).toBeUndefined();
    });

    it("returns tabIndex and className when focusRing is true", () => {
      const { ref } = createContainer(3);
      const { result } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
          focusRing: true,
        }),
      );

      const activeProps = result.current?.getItemProps(0);
      expect(activeProps?.tabIndex).toBe(0);
      expect(activeProps?.className).toBe("keyboard-focused");

      const inactiveProps = result.current?.getItemProps(1);
      expect(inactiveProps?.tabIndex).toBe(-1);
      expect(inactiveProps?.className).toBeUndefined();
    });
  });

  describe("cleanup", () => {
    it("cleans up on unmount", () => {
      const { ref } = createContainer(3);
      const { unmount } = renderHook(() =>
        useKeyboardNav({
          containerRef: ref,
          itemSelector: "[data-item]",
          orientation: "horizontal",
        }),
      );

      unmount(); // should not throw
    });
  });
});
