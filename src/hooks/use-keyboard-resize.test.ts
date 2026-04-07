import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardResize } from "./use-keyboard-resize";

function makeKey(
  key: string,
  opts: Partial<React.KeyboardEvent> = {},
): React.KeyboardEvent {
  return {
    key,
    shiftKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...opts,
  } as unknown as React.KeyboardEvent;
}

describe("useKeyboardResize", () => {
  it("returns null when config is undefined", () => {
    const { result } = renderHook(() => useKeyboardResize(undefined));
    expect(result.current).toBeNull();
  });

  it("returns resizeHandleProps with correct ARIA attributes when role is provided", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardResize({
        orientation: "horizontal",
        value: 200,
        min: 100,
        max: 400,
        onResize,
        label: "Resize panel",
        role: "separator",
      }),
    );

    const props = result.current?.resizeHandleProps;
    expect(props?.role).toBe("separator");
    expect(props?.["aria-orientation"]).toBe("horizontal");
    expect(props?.["aria-valuenow"]).toBe(200);
    expect(props?.["aria-valuemin"]).toBe(100);
    expect(props?.["aria-valuemax"]).toBe(400);
    expect(props?.["aria-label"]).toBe("Resize panel");
    expect(props?.tabIndex).toBe(0);
  });

  it("omits role and value attributes when role is not provided", () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardResize({
        orientation: "horizontal",
        value: 200,
        onResize,
        label: "Resize panel",
      }),
    );

    const props = result.current?.resizeHandleProps;
    expect(props?.role).toBeUndefined();
    expect(props?.["aria-orientation"]).toBeUndefined();
    expect(props?.["aria-valuenow"]).toBeUndefined();
    expect(props?.["aria-label"]).toBe("Resize panel");
    expect(props?.tabIndex).toBe(0);
  });

  describe("horizontal orientation", () => {
    it("increases on ArrowRight", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 200,
          min: 100,
          max: 400,
          step: 10,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowRight")));
      expect(onResize).toHaveBeenCalledWith(210);
    });

    it("decreases on ArrowLeft", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 200,
          min: 100,
          max: 400,
          step: 10,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowLeft")));
      expect(onResize).toHaveBeenCalledWith(190);
    });

    it("ignores ArrowUp/ArrowDown", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 200,
          min: 100,
          max: 400,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowDown")));
      act(() => handler(makeKey("ArrowUp")));
      expect(onResize).not.toHaveBeenCalled();
    });
  });

  describe("vertical orientation", () => {
    it("increases on ArrowDown", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "vertical",
          value: 100,
          min: 50,
          max: 200,
          step: 5,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowDown")));
      expect(onResize).toHaveBeenCalledWith(105);
    });

    it("decreases on ArrowUp", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "vertical",
          value: 100,
          min: 50,
          max: 200,
          step: 5,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowUp")));
      expect(onResize).toHaveBeenCalledWith(95);
    });
  });

  describe("clamping", () => {
    it("clamps to min", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 105,
          min: 100,
          max: 400,
          step: 10,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowLeft")));
      expect(onResize).toHaveBeenCalledWith(100);
    });

    it("clamps to max", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 395,
          min: 100,
          max: 400,
          step: 10,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowRight")));
      expect(onResize).toHaveBeenCalledWith(400);
    });

    it("does not call onResize when already at boundary", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 100,
          min: 100,
          max: 400,
          step: 10,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowLeft")));
      expect(onResize).not.toHaveBeenCalled();
    });
  });

  describe("Shift for large step", () => {
    it("uses largeStep with Shift key", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 200,
          min: 100,
          max: 400,
          step: 10,
          largeStep: 50,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("ArrowRight", { shiftKey: true })));
      expect(onResize).toHaveBeenCalledWith(250);
    });
  });

  describe("Home/End", () => {
    it("Home jumps to min", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 200,
          min: 100,
          max: 400,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("Home")));
      expect(onResize).toHaveBeenCalledWith(100);
    });

    it("End jumps to max", () => {
      const onResize = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardResize({
          orientation: "horizontal",
          value: 200,
          min: 100,
          max: 400,
          onResize,
          label: "Resize",
        }),
      );

      const handler = result.current?.resizeHandleProps.onKeyDown as (
        e: React.KeyboardEvent,
      ) => void;
      act(() => handler(makeKey("End")));
      expect(onResize).toHaveBeenCalledWith(400);
    });
  });

  it("computes percentage in data attribute", () => {
    const { result } = renderHook(() =>
      useKeyboardResize({
        orientation: "horizontal",
        value: 250,
        min: 100,
        max: 400,
        onResize: vi.fn(),
        label: "Resize",
      }),
    );

    expect(result.current?.resizeHandleProps["data-resize-percentage"]).toBe(
      50,
    );
  });
});
