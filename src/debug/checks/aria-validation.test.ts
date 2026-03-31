import { afterEach, describe, expect, it } from "vitest";
import { scanAriaValidation } from "./aria-validation";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanAriaValidation", () => {
  it("returns empty for clean DOM", () => {
    document.body.innerHTML = '<button aria-label="Save">Save</button>';
    const result = scanAriaValidation();
    expect(result.issues).toHaveLength(0);
  });

  it("flags invalid role", () => {
    document.body.innerHTML = '<div role="banana">Text</div>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "invalid-role")).toBe(true);
  });

  it("accepts valid roles", () => {
    document.body.innerHTML = '<div role="button">Click</div>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "invalid-role")).toBe(false);
  });

  it("flags aria-labelledby pointing to non-existent id", () => {
    document.body.innerHTML =
      '<button aria-labelledby="nonexistent">Click</button>';
    const result = scanAriaValidation();
    expect(
      result.issues.some((i) => i.type === "aria-labelledby-missing-id"),
    ).toBe(true);
  });

  it("does not flag aria-labelledby pointing to existing id", () => {
    document.body.innerHTML =
      '<span id="label">Save</span><button aria-labelledby="label">Save</button>';
    const result = scanAriaValidation();
    expect(
      result.issues.some((i) => i.type === "aria-labelledby-missing-id"),
    ).toBe(false);
  });

  it("flags aria-hidden on focusable button", () => {
    document.body.innerHTML =
      '<button aria-hidden="true">Hidden but focusable</button>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "aria-hidden-focusable")).toBe(
      true,
    );
  });

  it("flags aria-checked on non-checkable role", () => {
    document.body.innerHTML = '<div aria-checked="true">Not checkable</div>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "aria-checked-invalid")).toBe(
      true,
    );
  });

  it("accepts aria-checked on checkbox", () => {
    document.body.innerHTML =
      '<div role="checkbox" aria-checked="true">Check</div>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "aria-checked-invalid")).toBe(
      false,
    );
  });

  it("flags nested interactive elements", () => {
    document.body.innerHTML = '<a href="/"><button>Nested</button></a>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "nested-interactive")).toBe(
      true,
    );
  });

  it("flags aria-label on non-interactive element without role", () => {
    document.body.innerHTML = '<div aria-label="Random label">Text</div>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "aria-label-no-role")).toBe(
      true,
    );
  });

  it("accepts aria-label on nav landmark", () => {
    document.body.innerHTML =
      '<nav aria-label="Main navigation"><a href="/">Home</a></nav>';
    const result = scanAriaValidation();
    expect(result.issues.some((i) => i.type === "aria-label-no-role")).toBe(
      false,
    );
  });
});
