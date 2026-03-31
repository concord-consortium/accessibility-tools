import { describe, expect, it } from "vitest";
import { scanAriaValidation } from "./aria-validation";
import { scanColorContrast } from "./color-contrast";
import { scanImages } from "./images";
import { scanLinksButtons } from "./links-buttons";
import { scanTouchTargets } from "./touch-targets";

describe("check modules return valid results on empty DOM", () => {
  it("scanColorContrast returns results structure", () => {
    const result = scanColorContrast();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("issues");
  });

  it("scanImages returns results structure", () => {
    const result = scanImages();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("issues");
  });

  it("scanLinksButtons returns results structure", () => {
    const result = scanLinksButtons();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("issues");
  });

  it("scanAriaValidation returns results structure", () => {
    const result = scanAriaValidation();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("issues");
  });

  it("scanTouchTargets returns results structure", () => {
    const result = scanTouchTargets();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("issues");
  });
});
