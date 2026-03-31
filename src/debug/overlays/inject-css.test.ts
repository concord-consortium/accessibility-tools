import { afterEach, describe, expect, it } from "vitest";
import {
  injectOverlayCSS,
  isOverlayActive,
  removeOverlayCSS,
  toggleOverlayCSS,
} from "./inject-css";

afterEach(() => {
  removeOverlayCSS("test");
});

describe("injectOverlayCSS", () => {
  it("creates a style element in the document head", () => {
    injectOverlayCSS("test", "body { color: red; }");

    const style = document.getElementById("a11y-overlay-test");
    expect(style).not.toBeNull();
    expect(style?.textContent).toBe("body { color: red; }");
  });

  it("sets data-a11y-debug attribute", () => {
    injectOverlayCSS("test", "body {}");

    const style = document.getElementById("a11y-overlay-test");
    expect(style?.getAttribute("data-a11y-debug")).toBe("overlay-test");
  });

  it("is idempotent - second call does not duplicate", () => {
    injectOverlayCSS("test", "body {}");
    injectOverlayCSS("test", "body { color: blue; }");

    const styles = document.querySelectorAll("#a11y-overlay-test");
    expect(styles.length).toBe(1);
  });
});

describe("removeOverlayCSS", () => {
  it("removes the injected style element", () => {
    injectOverlayCSS("test", "body {}");
    expect(document.getElementById("a11y-overlay-test")).not.toBeNull();

    removeOverlayCSS("test");
    expect(document.getElementById("a11y-overlay-test")).toBeNull();
  });

  it("is safe to call when nothing is injected", () => {
    expect(() => removeOverlayCSS("nonexistent")).not.toThrow();
  });
});

describe("isOverlayActive", () => {
  it("returns false when not injected", () => {
    expect(isOverlayActive("test")).toBe(false);
  });

  it("returns true when injected", () => {
    injectOverlayCSS("test", "body {}");
    expect(isOverlayActive("test")).toBe(true);
  });

  it("returns false after removal", () => {
    injectOverlayCSS("test", "body {}");
    removeOverlayCSS("test");
    expect(isOverlayActive("test")).toBe(false);
  });
});

describe("toggleOverlayCSS", () => {
  it("injects on first call and returns true", () => {
    const result = toggleOverlayCSS("test", "body {}");
    expect(result).toBe(true);
    expect(isOverlayActive("test")).toBe(true);
  });

  it("removes on second call and returns false", () => {
    toggleOverlayCSS("test", "body {}");
    const result = toggleOverlayCSS("test", "body {}");
    expect(result).toBe(false);
    expect(isOverlayActive("test")).toBe(false);
  });

  it("can be toggled multiple times", () => {
    toggleOverlayCSS("test", "body {}");
    toggleOverlayCSS("test", "body {}");
    toggleOverlayCSS("test", "body {}");
    expect(isOverlayActive("test")).toBe(true);
  });
});
