import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { AccessibilityProvider, useAccessibilityContext } from "./provider";

function wrapper(debug: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AccessibilityProvider debug={debug}>{children}</AccessibilityProvider>
    );
  };
}

describe("AccessibilityProvider", () => {
  it("provides null context when debug=false", () => {
    const { result } = renderHook(() => useAccessibilityContext(), {
      wrapper: wrapper(false),
    });
    expect(result.current).toBeNull();
  });

  it("provides context value when debug=true", () => {
    const { result } = renderHook(() => useAccessibilityContext(), {
      wrapper: wrapper(true),
    });
    expect(result.current).not.toBeNull();
    expect(result.current?.registerInstance).toBeTypeOf("function");
    expect(result.current?.unregisterInstance).toBeTypeOf("function");
    expect(result.current?.reportFocusTrapEvent).toBeTypeOf("function");
    expect(result.current?.log).toBeTypeOf("function");
  });

  it("returns null when no provider wraps the hook", () => {
    const { result } = renderHook(() => useAccessibilityContext());
    expect(result.current).toBeNull();
  });

  it("defaults debug to false", () => {
    const { result } = renderHook(() => useAccessibilityContext(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      ),
    });
    expect(result.current).toBeNull();
  });
});
