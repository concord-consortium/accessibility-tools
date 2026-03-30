import { describe, expect, it } from "vitest";
import {
  attachMockFiber,
  describeElement,
  getReactComponentName,
  getReactFiberPath,
} from "./fiber";

describe("getReactComponentName", () => {
  it("returns null for element without fiber", () => {
    const el = document.createElement("div");
    expect(getReactComponentName(el)).toBeNull();
  });

  it("returns component name from attached fiber", () => {
    const el = document.createElement("button");
    attachMockFiber(el, "ToolbarButton");
    expect(getReactComponentName(el)).toBe("ToolbarButton");
  });

  it("walks up fiber tree to find nearest component", () => {
    const el = document.createElement("div");
    attachMockFiber(el, "InnerComponent", ["App", "Layout"]);
    expect(getReactComponentName(el)).toBe("InnerComponent");
  });
});

describe("getReactFiberPath", () => {
  it("returns empty array for element without fiber", () => {
    const el = document.createElement("div");
    expect(getReactFiberPath(el)).toEqual([]);
  });

  it("returns full path from root to component", () => {
    const el = document.createElement("button");
    attachMockFiber(el, "ToolbarButton", ["App", "Workspace"]);
    expect(getReactFiberPath(el)).toEqual([
      "App",
      "Workspace",
      "ToolbarButton",
    ]);
  });

  it("returns single-element array for component with no parents", () => {
    const el = document.createElement("div");
    attachMockFiber(el, "App");
    expect(getReactFiberPath(el)).toEqual(["App"]);
  });
});

describe("describeElement", () => {
  it("describes a plain element with tag name", () => {
    const el = document.createElement("button");
    expect(describeElement(el)).toBe("<button>");
  });

  it("includes id when present", () => {
    const el = document.createElement("div");
    el.id = "main";
    expect(describeElement(el)).toBe("<div#main>");
  });

  it("includes classes when present", () => {
    const el = document.createElement("span");
    el.className = "foo bar";
    expect(describeElement(el)).toBe("<span.foo.bar>");
  });

  it("includes role when present", () => {
    const el = document.createElement("div");
    el.setAttribute("role", "button");
    expect(describeElement(el)).toBe('<div[role="button"]>');
  });

  it("includes all parts together", () => {
    const el = document.createElement("div");
    el.id = "nav";
    el.className = "primary";
    el.setAttribute("role", "navigation");
    expect(describeElement(el)).toBe('<div#nav.primary[role="navigation"]>');
  });

  it("prepends component name when fiber is attached", () => {
    const el = document.createElement("button");
    el.className = "tool-btn";
    attachMockFiber(el, "ToolbarButton");
    expect(describeElement(el)).toBe("ToolbarButton <button.tool-btn>");
  });

  it("handles SVG elements (getAttribute for class)", () => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.setAttribute("class", "icon");
    el.setAttribute("role", "img");
    expect(describeElement(el)).toBe('<svg.icon[role="img"]>');
  });
});

describe("attachMockFiber", () => {
  it("attaches fiber accessible via getReactComponentName", () => {
    const el = document.createElement("div");
    attachMockFiber(el, "MyComponent");
    expect(getReactComponentName(el)).toBe("MyComponent");
  });

  it("creates parent chain accessible via getReactFiberPath", () => {
    const el = document.createElement("div");
    attachMockFiber(el, "Child", ["Root", "Middle"]);
    expect(getReactFiberPath(el)).toEqual(["Root", "Middle", "Child"]);
  });
});
