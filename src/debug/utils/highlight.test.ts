import { afterEach, describe, expect, it } from "vitest";
import {
  destroyHighlight,
  highlightElement,
  removeHighlight,
  updateHighlightPosition,
} from "./highlight";

afterEach(() => {
  destroyHighlight();
});

describe("highlightElement", () => {
  it("creates an overlay element in the DOM", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);

    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay).not.toBeNull();
    expect(overlay?.style.display).toBe("block");

    el.remove();
  });

  it("sets data-a11y-debug attribute for sidebar exclusion", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);

    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay?.getAttribute("data-a11y-debug")).toBe("highlight");

    el.remove();
  });

  it("sets aria-hidden for screen reader exclusion", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);

    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay?.getAttribute("aria-hidden")).toBe("true");

    el.remove();
  });

  it("applies custom border color", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el, { color: "red" });

    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay?.style.borderColor).toBe("red");
    expect(overlay?.style.background).toBe("transparent");

    el.remove();
  });

  it("uses default blue color when no color specified", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);

    const overlay = document.getElementById("a11y-debug-highlight");
    // jsdom normalizes hex to rgb
    expect(overlay?.style.borderColor).toBe("rgb(37, 99, 235)");

    el.remove();
  });
});

describe("removeHighlight", () => {
  it("hides the overlay", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);
    removeHighlight();

    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay?.style.display).toBe("none");

    el.remove();
  });

  it("is safe to call when nothing is highlighted", () => {
    expect(() => removeHighlight()).not.toThrow();
  });
});

describe("updateHighlightPosition", () => {
  it("is a no-op when nothing is highlighted", () => {
    expect(() => updateHighlightPosition()).not.toThrow();
  });

  it("updates position for the tracked element without arguments", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);
    updateHighlightPosition();

    // jsdom returns all-zero rects, but we can verify the code path ran
    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay?.style.top).toBe("0px");
    expect(overlay?.style.left).toBe("0px");

    el.remove();
  });

  it("updates position for an explicit element", () => {
    const el1 = document.createElement("div");
    const el2 = document.createElement("div");
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    highlightElement(el1);
    updateHighlightPosition(el2);

    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay?.style.top).toBe("0px");

    el1.remove();
    el2.remove();
  });
});

describe("destroyHighlight", () => {
  it("removes the overlay element from the DOM", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);
    expect(document.getElementById("a11y-debug-highlight")).not.toBeNull();

    destroyHighlight();
    expect(document.getElementById("a11y-debug-highlight")).toBeNull();

    el.remove();
  });

  it("is safe to call when no overlay exists", () => {
    expect(() => destroyHighlight()).not.toThrow();
  });

  it("allows re-creation after destroy", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    highlightElement(el);
    destroyHighlight();
    highlightElement(el);

    const overlay = document.getElementById("a11y-debug-highlight");
    expect(overlay).not.toBeNull();
    expect(overlay?.style.display).toBe("block");

    el.remove();
  });
});
