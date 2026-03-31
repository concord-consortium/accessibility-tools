import { describe, expect, it } from "vitest";
import { contrastRatio, formatRatio } from "./contrast";

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const ratio = contrastRatio(
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
    );
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for white on white", () => {
    const ratio = contrastRatio(
      { r: 255, g: 255, b: 255, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
    );
    expect(ratio).toBeCloseTo(1, 0);
  });

  it("returns 1 for same color", () => {
    const ratio = contrastRatio(
      { r: 128, g: 128, b: 128, a: 1 },
      { r: 128, g: 128, b: 128, a: 1 },
    );
    expect(ratio).toBeCloseTo(1, 0);
  });

  it("computes correct ratio for gray on white", () => {
    // #767676 on white is approximately 4.54:1 (the AA threshold for normal text)
    const ratio = contrastRatio(
      { r: 118, g: 118, b: 118, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
    );
    expect(ratio).toBeGreaterThan(4.5);
    expect(ratio).toBeLessThan(5);
  });
});

describe("formatRatio", () => {
  it("formats ratio with one decimal", () => {
    expect(formatRatio(4.5)).toBe("4.5:1");
  });

  it("formats ratio with rounding", () => {
    expect(formatRatio(21)).toBe("21.0:1");
  });

  it("formats small ratio", () => {
    expect(formatRatio(1.23)).toBe("1.2:1");
  });
});
