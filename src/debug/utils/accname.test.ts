import { afterEach, describe, expect, it } from "vitest";
import {
  computeAccessibleInfo,
  formatAnnouncement,
  getEffectiveRole,
} from "./accname";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getEffectiveRole", () => {
  it("returns explicit role", () => {
    const el = document.createElement("div");
    el.setAttribute("role", "button");
    expect(getEffectiveRole(el)).toBe("button");
  });

  it("returns implicit role for button", () => {
    const el = document.createElement("button");
    expect(getEffectiveRole(el)).toBe("button");
  });

  it("returns link for anchor with href", () => {
    const el = document.createElement("a");
    el.setAttribute("href", "/");
    expect(getEffectiveRole(el)).toBe("link");
  });

  it("returns null for anchor without href", () => {
    const el = document.createElement("a");
    expect(getEffectiveRole(el)).toBeNull();
  });

  it("returns heading for h1-h6", () => {
    for (let i = 1; i <= 6; i++) {
      const el = document.createElement(`h${i}`);
      expect(getEffectiveRole(el)).toBe("heading");
    }
  });

  it("returns textbox for input type=text", () => {
    const el = document.createElement("input");
    el.setAttribute("type", "text");
    expect(getEffectiveRole(el)).toBe("textbox");
  });

  it("returns checkbox for input type=checkbox", () => {
    const el = document.createElement("input");
    el.setAttribute("type", "checkbox");
    expect(getEffectiveRole(el)).toBe("checkbox");
  });

  it("returns null for div without role", () => {
    const el = document.createElement("div");
    expect(getEffectiveRole(el)).toBeNull();
  });
});

describe("computeAccessibleInfo", () => {
  it("computes name from aria-label", () => {
    const el = document.createElement("button");
    el.setAttribute("aria-label", "Save document");
    document.body.appendChild(el);
    const info = computeAccessibleInfo(el);
    expect(info.name).toBe("Save document");
  });

  it("computes name from text content", () => {
    const el = document.createElement("button");
    el.textContent = "Click me";
    document.body.appendChild(el);
    const info = computeAccessibleInfo(el);
    expect(info.name).toBe("Click me");
  });

  it("returns empty name for unlabeled div", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const info = computeAccessibleInfo(el);
    expect(info.name).toBe("");
  });

  it("detects disabled state", () => {
    const el = document.createElement("button");
    el.setAttribute("disabled", "");
    el.textContent = "Save";
    document.body.appendChild(el);
    const info = computeAccessibleInfo(el);
    expect(info.states).toContain("disabled");
  });

  it("detects expanded state", () => {
    const el = document.createElement("button");
    el.setAttribute("aria-expanded", "true");
    el.textContent = "Menu";
    document.body.appendChild(el);
    const info = computeAccessibleInfo(el);
    expect(info.states).toContain("expanded");
  });

  it("detects collapsed state", () => {
    const el = document.createElement("button");
    el.setAttribute("aria-expanded", "false");
    el.textContent = "Menu";
    document.body.appendChild(el);
    const info = computeAccessibleInfo(el);
    expect(info.states).toContain("collapsed");
  });
});

describe("formatAnnouncement", () => {
  it("formats name + role", () => {
    const result = formatAnnouncement({
      name: "Save",
      description: "",
      role: "button",
      states: [],
    });
    expect(result).toBe('"Save", button');
  });

  it("formats name + role + states", () => {
    const result = formatAnnouncement({
      name: "Menu",
      description: "",
      role: "button",
      states: ["expanded"],
    });
    expect(result).toBe('"Menu", button, expanded');
  });

  it("formats role only when no name", () => {
    const result = formatAnnouncement({
      name: "",
      description: "",
      role: "button",
      states: [],
    });
    expect(result).toBe("button");
  });

  it("returns empty string for no info", () => {
    const result = formatAnnouncement({
      name: "",
      description: "",
      role: null,
      states: [],
    });
    expect(result).toBe("");
  });
});
