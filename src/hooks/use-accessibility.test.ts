import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAccessibility } from "./use-accessibility";

describe("useAccessibility", () => {
  it("returns null navigation and resizable when no options provided", () => {
    const { result } = renderHook(() => useAccessibility({}));
    expect(result.current.navigation).toBeNull();
    expect(result.current.resizable).toBeNull();
  });

  it("returns null debug when no provider", () => {
    const { result } = renderHook(() => useAccessibility({}));
    expect(result.current.debug).toBeNull();
  });
});
