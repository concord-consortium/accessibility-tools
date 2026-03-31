import { afterEach, describe, expect, it } from "vitest";
import { scanColorContrast } from "./color-contrast";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanColorContrast", () => {
  it("returns empty for no text content", () => {
    document.body.innerHTML = "<div></div>";
    const result = scanColorContrast();
    expect(result.items).toHaveLength(0);
  });

  it("finds text elements", () => {
    document.body.innerHTML = "<p>Hello world</p>";
    const result = scanColorContrast();
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it("returns ratio and pass/fail for each item", () => {
    document.body.innerHTML = "<p>Hello</p>";
    const result = scanColorContrast();
    if (result.items.length > 0) {
      const item = result.items[0];
      expect(item).toHaveProperty("ratio");
      expect(item).toHaveProperty("passes");
      expect(item).toHaveProperty("foreground");
      expect(item).toHaveProperty("background");
      expect(item).toHaveProperty("isLargeText");
      expect(item).toHaveProperty("canCompute");
    }
  });

  it("skips hidden elements", () => {
    document.body.innerHTML =
      '<p style="display:none">Hidden text</p><p>Visible</p>';
    const result = scanColorContrast();
    // Should only find the visible one
    expect(result.items.length).toBeLessThanOrEqual(1);
  });

  it("processes each parent element only once", () => {
    document.body.innerHTML = "<p>Word one and word two</p>";
    const result = scanColorContrast();
    // Single <p> should produce one item, not two
    expect(result.items).toHaveLength(1);
  });
});
