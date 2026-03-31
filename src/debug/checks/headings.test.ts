import { afterEach, describe, expect, it } from "vitest";
import { scanHeadings } from "./headings";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanHeadings", () => {
  it("finds all heading elements", () => {
    document.body.innerHTML = "<h1>Title</h1><h2>Sub</h2><h3>Deep</h3>";
    const result = scanHeadings(document.body);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].level).toBe(1);
    expect(result.items[0].text).toBe("Title");
    expect(result.items[1].level).toBe(2);
    expect(result.items[2].level).toBe(3);
  });

  it("reports no issues for correct hierarchy", () => {
    document.body.innerHTML = "<h1>Title</h1><h2>Sub</h2><h3>Deep</h3>";
    const result = scanHeadings(document.body);
    expect(result.issues).toHaveLength(0);
    expect(result.items.every((h) => !h.hasIssue)).toBe(true);
  });

  it("flags skipped heading levels", () => {
    document.body.innerHTML = "<h1>Title</h1><h3>Skipped h2</h3>";
    const result = scanHeadings(document.body);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("skipped-level");
    expect(result.issues[0].wcag).toBe("1.3.1");
    expect(result.issues[0].severity).toBe("error");
    expect(result.items[1].hasIssue).toBe(true);
  });

  it("flags multiple h1 elements", () => {
    document.body.innerHTML = "<h1>First</h1><h1>Second</h1>";
    const result = scanHeadings(document.body);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("multiple-h1");
    expect(result.items[0].hasIssue).toBe(true);
    expect(result.items[1].hasIssue).toBe(true);
  });

  it("flags missing h1", () => {
    document.body.innerHTML = "<h2>No h1</h2>";
    const result = scanHeadings(document.body);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("missing-h1");
  });

  it("handles empty page", () => {
    document.body.innerHTML = "<p>No headings</p>";
    const result = scanHeadings(document.body);
    expect(result.items).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("missing-h1");
  });

  it("scopes to a root element", () => {
    document.body.innerHTML =
      '<div id="scope"><h2>Inside</h2></div><h1>Outside</h1>';
    const scope = document.getElementById("scope") as Element;
    const result = scanHeadings(scope);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toBe("Inside");
  });

  it("handles empty heading text", () => {
    document.body.innerHTML = "<h1></h1>";
    const result = scanHeadings(document.body);
    expect(result.items[0].text).toBe("(empty)");
  });
});
