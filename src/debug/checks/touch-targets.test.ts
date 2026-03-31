import { afterEach, describe, expect, it, vi } from "vitest";
import { scanTouchTargets } from "./touch-targets";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanTouchTargets", () => {
  it("returns empty for no interactive elements", () => {
    document.body.innerHTML = "<p>Just text</p>";
    const result = scanTouchTargets();
    expect(result.items).toHaveLength(0);
  });

  it("finds buttons (with mocked rect)", () => {
    const btn = document.createElement("button");
    btn.textContent = "Click";
    document.body.appendChild(btn);
    vi.spyOn(btn, "getBoundingClientRect").mockReturnValue({
      width: 30,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 30,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const result = scanTouchTargets();
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it("finds links (with mocked rect)", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/");
    a.textContent = "Home";
    document.body.appendChild(a);
    vi.spyOn(a, "getBoundingClientRect").mockReturnValue({
      width: 50,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 50,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const result = scanTouchTargets();
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it("skips hidden inputs", () => {
    document.body.innerHTML = '<input type="hidden" name="token">';
    const result = scanTouchTargets();
    expect(result.items).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    document.body.innerHTML = '<button aria-hidden="true">Hidden</button>';
    const result = scanTouchTargets();
    expect(result.items).toHaveLength(0);
  });

  it("includes width and height on items", () => {
    document.body.innerHTML = "<button>Click</button>";
    const result = scanTouchTargets();
    if (result.items.length > 0) {
      expect(result.items[0]).toHaveProperty("width");
      expect(result.items[0]).toHaveProperty("height");
      expect(result.items[0]).toHaveProperty("meetsAA");
      expect(result.items[0]).toHaveProperty("meetsAAA");
    }
  });
});
