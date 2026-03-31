import { afterEach, describe, expect, it } from "vitest";
import { scanDuplicateIds } from "./duplicate-ids";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanDuplicateIds", () => {
  it("finds no issues when IDs are unique", () => {
    document.body.innerHTML =
      '<div id="a">A</div><div id="b">B</div><div id="c">C</div>';
    const result = scanDuplicateIds(document.body);
    expect(result.items).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  it("detects duplicate IDs", () => {
    document.body.innerHTML =
      '<div id="dupe">First</div><div id="dupe">Second</div>';
    const result = scanDuplicateIds(document.body);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("dupe");
    expect(result.items[0].elements).toHaveLength(2);
  });

  it("returns issue with WCAG criterion", () => {
    document.body.innerHTML =
      '<div id="dupe">First</div><div id="dupe">Second</div>';
    const result = scanDuplicateIds(document.body);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("duplicate-id");
    expect(result.issues[0].wcag).toBe("1.3.1");
    expect(result.issues[0].severity).toBe("error");
    expect(result.issues[0].fix).toContain("unique");
  });

  it("detects ARIA references to duplicated IDs", () => {
    document.body.innerHTML = `
      <span id="label">Label</span>
      <span id="label">Duplicate</span>
      <input aria-labelledby="label" />
    `;
    const result = scanDuplicateIds(document.body);
    expect(result.items[0].ariaRefs.length).toBeGreaterThan(0);
  });

  it("handles multiple duplicate groups", () => {
    document.body.innerHTML = `
      <div id="a">1</div><div id="a">2</div>
      <div id="b">3</div><div id="b">4</div>
    `;
    const result = scanDuplicateIds(document.body);
    expect(result.items).toHaveLength(2);
    expect(result.issues).toHaveLength(2);
  });

  it("ignores elements without id", () => {
    document.body.innerHTML = "<div>No id</div><span>Also no id</span>";
    const result = scanDuplicateIds(document.body);
    expect(result.items).toHaveLength(0);
  });

  it("scopes to a root element", () => {
    document.body.innerHTML = `
      <div id="scope"><div id="x">In</div><div id="x">In</div></div>
      <div id="y">Out</div><div id="y">Out</div>
    `;
    const scope = document.getElementById("scope") as Element;
    const result = scanDuplicateIds(scope);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("x");
  });
});
