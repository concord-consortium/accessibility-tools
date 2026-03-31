import { describe, expect, it } from "vitest";
import { pluralize } from "./pluralize";

describe("pluralize", () => {
  it("returns singular for count 1", () => {
    expect(pluralize(1, "error")).toBe("1 error");
  });

  it("returns plural for count 0", () => {
    expect(pluralize(0, "error")).toBe("0 errors");
  });

  it("returns plural for count > 1", () => {
    expect(pluralize(5, "error")).toBe("5 errors");
  });

  it("uses custom plural form", () => {
    expect(pluralize(2, "entry", "entries")).toBe("2 entries");
  });

  it("uses singular with custom plural for count 1", () => {
    expect(pluralize(1, "entry", "entries")).toBe("1 entry");
  });
});
