import { describe, expect, it } from "vitest";
import { serializeIssue } from "./types";

describe("serializeIssue", () => {
  it("serializes an issue without element", () => {
    const result = serializeIssue({
      type: "missing-h1",
      severity: "error",
      wcag: "1.3.1",
      message: "No h1 found",
    });
    expect(result).toEqual({
      type: "missing-h1",
      severity: "error",
      wcag: "1.3.1",
      message: "No h1 found",
      element: undefined,
    });
  });

  it("serializes element to a descriptor string", () => {
    const el = document.createElement("input");
    el.id = "email";
    const result = serializeIssue({
      type: "no-label",
      severity: "error",
      message: "No label",
      element: el,
    });
    expect(result.element).toBe('<input id="email">');
  });

  it("serializes element without id", () => {
    const el = document.createElement("div");
    const result = serializeIssue({
      type: "test",
      severity: "warning",
      message: "Test",
      element: el,
    });
    expect(result.element).toBe("<div>");
  });

  it("preserves fix field", () => {
    const result = serializeIssue({
      type: "test",
      severity: "error",
      message: "Problem",
      fix: "Do this to fix it",
    });
    expect(result.fix).toBe("Do this to fix it");
  });
});
