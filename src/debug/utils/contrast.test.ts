import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  formatRatio,
  parseRgbString,
  rgbaToHex,
  suggestFixColor,
} from "./contrast";

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

describe("rgbaToHex", () => {
  it("converts black", () => {
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe("#000000");
  });

  it("converts white", () => {
    expect(rgbaToHex({ r: 255, g: 255, b: 255, a: 1 })).toBe("#ffffff");
  });

  it("converts a color", () => {
    expect(rgbaToHex({ r: 202, g: 138, b: 4, a: 1 })).toBe("#ca8a04");
  });
});

describe("parseRgbString", () => {
  it("parses rgb string", () => {
    const result = parseRgbString("rgb(202, 138, 4)");
    expect(result).toEqual({ r: 202, g: 138, b: 4, a: 1 });
  });

  it("parses rgba string", () => {
    const result = parseRgbString("rgba(0, 0, 0, 0.5)");
    expect(result).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
  });

  it("returns null for invalid string", () => {
    expect(parseRgbString("red")).toBeNull();
  });
});

describe("suggestFixColor", () => {
  it("suggests a darker color for light fg on white bg", () => {
    const fg = { r: 202, g: 138, b: 4, a: 1 }; // #ca8a04 - yellow
    const bg = { r: 255, g: 255, b: 255, a: 1 }; // white
    const suggested = suggestFixColor(fg, bg, 4.5);

    // Parse the suggested hex and verify it passes
    const hex = suggested;
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);

    // Verify the suggested color actually passes
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    const ratio = contrastRatio({ r, g, b, a: 1 }, bg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("suggests a lighter color for dark fg on dark bg", () => {
    const fg = { r: 100, g: 100, b: 100, a: 1 }; // gray
    const bg = { r: 30, g: 30, b: 30, a: 1 }; // dark bg
    const suggested = suggestFixColor(fg, bg, 4.5);

    expect(suggested).toMatch(/^#[0-9a-f]{6}$/);

    const r = Number.parseInt(suggested.slice(1, 3), 16);
    const g = Number.parseInt(suggested.slice(3, 5), 16);
    const b = Number.parseInt(suggested.slice(5, 7), 16);
    const ratio = contrastRatio({ r, g, b, a: 1 }, bg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("handles white fg on dark bg by darkening instead", () => {
    const fg = { r: 255, g: 255, b: 255, a: 1 }; // white
    const bg = { r: 22, g: 163, b: 74, a: 1 }; // green (#16a34a)
    const suggested = suggestFixColor(fg, bg, 4.5);

    expect(suggested).toMatch(/^#[0-9a-f]{6}$/);
    // Should NOT return #ffffff (same as input)
    expect(suggested).not.toBe("#ffffff");

    const r = Number.parseInt(suggested.slice(1, 3), 16);
    const g = Number.parseInt(suggested.slice(3, 5), 16);
    const b = Number.parseInt(suggested.slice(5, 7), 16);
    const ratio = contrastRatio({ r, g, b, a: 1 }, bg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
