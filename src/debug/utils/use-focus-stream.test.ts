import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as focusStream from "./focus-stream";
import { useFocusStream } from "./use-focus-stream";

let subscribers: Array<(event: focusStream.A11yFocusEvent) => void> = [];

beforeEach(() => {
  subscribers = [];
  vi.spyOn(focusStream, "subscribeFocus").mockImplementation((cb) => {
    subscribers.push(cb);
    return () => {
      subscribers = subscribers.filter((s) => s !== cb);
    };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function dispatch(event: focusStream.A11yFocusEvent) {
  for (const sub of subscribers) {
    sub(event);
  }
}

describe("useFocusStream", () => {
  it("starts with null current and empty history", () => {
    const { result } = renderHook(() => useFocusStream());
    expect(result.current.current).toBeNull();
    expect(result.current.history).toHaveLength(0);
  });

  it("subscribes to focus events on mount", () => {
    renderHook(() => useFocusStream());
    expect(focusStream.subscribeFocus).toHaveBeenCalledOnce();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useFocusStream());
    expect(subscribers).toHaveLength(1);
    unmount();
    expect(subscribers).toHaveLength(0);
  });

  it("updates current on focus event", () => {
    const { result } = renderHook(() => useFocusStream());
    const el = document.createElement("button");

    act(() => {
      dispatch({ element: el, previousElement: null, timestamp: 1000 });
    });

    expect(result.current.current?.element).toBe(el);
  });

  it("builds history in reverse chronological order", () => {
    const { result } = renderHook(() => useFocusStream());
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");

    act(() => {
      dispatch({ element: btn1, previousElement: null, timestamp: 1000 });
    });
    act(() => {
      dispatch({ element: btn2, previousElement: btn1, timestamp: 2000 });
    });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].element).toBe(btn2);
    expect(result.current.history[1].element).toBe(btn1);
  });

  it("computes duration for previous entries", () => {
    const { result } = renderHook(() => useFocusStream());
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");

    act(() => {
      dispatch({ element: btn1, previousElement: null, timestamp: 1000 });
    });
    act(() => {
      dispatch({ element: btn2, previousElement: btn1, timestamp: 3000 });
    });

    // Most recent entry has null duration (still active)
    expect(result.current.history[0].duration).toBeNull();
    // Previous entry has computed duration
    expect(result.current.history[1].duration).toBe(2000);
  });

  it("caps history at 200 entries", () => {
    const { result } = renderHook(() => useFocusStream());

    act(() => {
      for (let i = 0; i < 210; i++) {
        dispatch({
          element: document.createElement("div"),
          previousElement: null,
          timestamp: i * 100,
        });
      }
    });

    expect(result.current.history).toHaveLength(200);
  });
});
