import { afterEach, describe, expect, it } from "vitest";
import { scanLinksButtons } from "./links-buttons";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanLinksButtons", () => {
  it("returns empty for no links or buttons", () => {
    document.body.innerHTML = "<p>Just text</p>";
    const result = scanLinksButtons();
    expect(result.items).toHaveLength(0);
  });

  it("finds links with href", () => {
    document.body.innerHTML = '<a href="/">Home</a>';
    const result = scanLinksButtons();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].tag).toBe("a");
  });

  it("finds buttons", () => {
    document.body.innerHTML = "<button>Save</button>";
    const result = scanLinksButtons();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].tag).toBe("button");
  });

  it("finds role=button elements", () => {
    document.body.innerHTML = '<div role="button">Click</div>';
    const result = scanLinksButtons();
    expect(result.items).toHaveLength(1);
  });

  it("finds role=link elements", () => {
    document.body.innerHTML = '<span role="link">Go</span>';
    const result = scanLinksButtons();
    expect(result.items).toHaveLength(1);
  });

  it("flags empty accessible name", () => {
    document.body.innerHTML = "<button></button>";
    const result = scanLinksButtons();
    expect(result.issues.some((i) => i.type === "empty-name")).toBe(true);
    expect(result.items[0].hasIssue).toBe(true);
  });

  it("flags generic name", () => {
    document.body.innerHTML = '<a href="/">click here</a>';
    const result = scanLinksButtons();
    expect(result.issues.some((i) => i.type === "generic-name")).toBe(true);
  });

  it("does not flag descriptive name", () => {
    document.body.innerHTML = '<a href="/about">About our company</a>';
    const result = scanLinksButtons();
    expect(result.issues).toHaveLength(0);
    expect(result.items[0].hasIssue).toBe(false);
  });

  it("skips aria-hidden elements", () => {
    document.body.innerHTML = '<button aria-hidden="true">Hidden</button>';
    const result = scanLinksButtons();
    expect(result.items).toHaveLength(0);
  });

  it("detects duplicate link text to different hrefs", () => {
    document.body.innerHTML = `
      <a href="/page1">Read more</a>
      <a href="/page2">Read more</a>
    `;
    const result = scanLinksButtons();
    expect(result.issues.some((i) => i.type === "duplicate-link-text")).toBe(
      true,
    );
  });

  it("does not flag duplicate link text to same href", () => {
    document.body.innerHTML = `
      <a href="/page1">Read more</a>
      <a href="/page1">Read more</a>
    `;
    const result = scanLinksButtons();
    expect(result.issues.some((i) => i.type === "duplicate-link-text")).toBe(
      false,
    );
  });
});
