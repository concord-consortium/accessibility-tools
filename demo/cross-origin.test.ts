import { describe, expect, it } from "vitest";
import { crossOriginInnerSrc, siblingOrigin } from "./cross-origin";

describe("siblingOrigin", () => {
  it("swaps localhost -> 127.0.0.1 keeping the port", () => {
    expect(siblingOrigin("localhost:5173")).toBe("127.0.0.1:5173");
  });
  it("swaps 127.0.0.1 -> localhost keeping the port", () => {
    expect(siblingOrigin("127.0.0.1:5173")).toBe("localhost:5173");
  });
  it("maps the concord.org host to the S3 host", () => {
    expect(siblingOrigin("models-resources.concord.org")).toBe(
      "models-resources.s3.amazonaws.com",
    );
  });
  it("maps the S3 host to the concord.org host", () => {
    expect(siblingOrigin("models-resources.s3.amazonaws.com")).toBe(
      "models-resources.concord.org",
    );
  });
  it("returns null for an unknown host", () => {
    expect(siblingOrigin("example.com")).toBeNull();
  });
});

describe("crossOriginInnerSrc", () => {
  it("builds the inner URL on the sibling origin, same directory (dev)", () => {
    expect(
      crossOriginInnerSrc(
        "http://localhost:5173/iframe-trap.html",
        "iframe-inner.html",
      ),
    ).toBe("http://127.0.0.1:5173/iframe-inner.html");
  });
  it("preserves a nested deploy directory (prod)", () => {
    expect(
      crossOriginInnerSrc(
        "https://models-resources.concord.org/accessibility-tools/iframe-trap.html",
        "iframe-inner.html",
      ),
    ).toBe(
      "https://models-resources.s3.amazonaws.com/accessibility-tools/iframe-inner.html",
    );
  });
  it("falls back to same origin for an unknown host", () => {
    expect(
      crossOriginInnerSrc(
        "http://example.com/demo/iframe-trap.html",
        "iframe-inner.html",
      ),
    ).toBe("http://example.com/demo/iframe-inner.html");
  });
});
