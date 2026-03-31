import { afterEach, describe, expect, it } from "vitest";
import { scanLandmarks } from "./landmarks";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanLandmarks", () => {
  it("finds landmark elements", () => {
    document.body.innerHTML =
      '<main>Content</main><nav aria-label="Main">Links</nav><footer>Footer</footer>';
    const result = scanLandmarks(document.body);
    expect(result.items).toHaveLength(3);
    expect(result.items[0].tag).toBe("main");
    expect(result.items[1].tag).toBe("nav");
    expect(result.items[2].tag).toBe("footer");
  });

  it("reports no issues for correct landmarks", () => {
    document.body.innerHTML =
      '<main>Content</main><nav aria-label="Primary">Links</nav>';
    const result = scanLandmarks(document.body);
    expect(result.issues).toHaveLength(0);
  });

  it("flags missing main", () => {
    document.body.innerHTML = '<nav aria-label="Main">Links</nav>';
    const result = scanLandmarks(document.body);
    const mainIssue = result.issues.find((i) => i.type === "missing-main");
    expect(mainIssue).toBeDefined();
    expect(mainIssue?.wcag).toBe("1.3.1");
  });

  it("flags multiple main elements", () => {
    document.body.innerHTML = "<main>One</main><main>Two</main>";
    const result = scanLandmarks(document.body);
    const mainIssue = result.issues.find((i) => i.type === "multiple-main");
    expect(mainIssue).toBeDefined();
    expect(result.items[0].hasIssue).toBe(true);
    expect(result.items[1].hasIssue).toBe(true);
  });

  it("flags nav without label", () => {
    document.body.innerHTML = "<main>Content</main><nav>Links</nav>";
    const result = scanLandmarks(document.body);
    const navIssue = result.issues.find((i) => i.type === "no-label");
    expect(navIssue).toBeDefined();
    expect(navIssue?.severity).toBe("warning");
  });

  it("does not flag nav with aria-label", () => {
    document.body.innerHTML =
      '<main>Content</main><nav aria-label="Primary">Links</nav>';
    const result = scanLandmarks(document.body);
    expect(result.issues.filter((i) => i.type === "no-label")).toHaveLength(0);
  });

  it("flags section without heading or label", () => {
    document.body.innerHTML =
      "<main>Content</main><section>No heading</section>";
    const result = scanLandmarks(document.body);
    const sectionIssue = result.issues.find(
      (i) => i.type === "section-no-heading",
    );
    expect(sectionIssue).toBeDefined();
  });

  it("does not flag section with heading", () => {
    document.body.innerHTML =
      "<main>Content</main><section><h2>Title</h2>Content</section>";
    const result = scanLandmarks(document.body);
    expect(
      result.issues.filter((i) => i.type === "section-no-heading"),
    ).toHaveLength(0);
  });

  it("reads aria-label for label field", () => {
    document.body.innerHTML =
      '<main>Content</main><nav aria-label="Sidebar nav">Links</nav>';
    const result = scanLandmarks(document.body);
    const nav = result.items.find((i) => i.tag === "nav");
    expect(nav?.label).toBe("Sidebar nav");
  });

  it("handles aria-labelledby with multiple IDs", () => {
    document.body.innerHTML =
      '<main>Content</main><span id="prefix">Site</span><span id="name">Navigation</span><nav aria-labelledby="prefix name">Links</nav>';
    const result = scanLandmarks(document.body);
    const nav = result.items.find((i) => i.tag === "nav");
    expect(nav?.label).toBe("Site Navigation");
  });

  it("scopes to a root element", () => {
    document.body.innerHTML =
      '<div id="scope"><nav aria-label="Inner">Links</nav></div><main>Outside</main>';
    const scope = document.getElementById("scope") as Element;
    const result = scanLandmarks(scope);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].tag).toBe("nav");
  });
});
