import { describe, expect, it } from "vitest";
import { scanAriaValidation } from "./aria-validation";
import { scanColorContrast } from "./color-contrast";
import { scanImages } from "./images";
import { scanLinksButtons } from "./links-buttons";
import { scanTouchTargets } from "./touch-targets";

describe("stub check modules", () => {
  it("scanColorContrast returns empty results", () => {
    const result = scanColorContrast();
    expect(result.items).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("scanImages returns empty results", () => {
    const result = scanImages();
    expect(result.items).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("scanLinksButtons returns empty results", () => {
    const result = scanLinksButtons();
    expect(result.items).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("scanAriaValidation returns empty results", () => {
    const result = scanAriaValidation();
    expect(result.items).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("scanTouchTargets returns empty results", () => {
    const result = scanTouchTargets();
    expect(result.items).toEqual([]);
    expect(result.issues).toEqual([]);
  });
});
