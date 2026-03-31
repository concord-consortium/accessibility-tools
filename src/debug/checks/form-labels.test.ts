import { afterEach, describe, expect, it } from "vitest";
import { scanFormControls } from "./form-labels";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanFormControls", () => {
  it("finds form controls", () => {
    document.body.innerHTML =
      '<input type="text" /><select><option>A</option></select><textarea></textarea>';
    const result = scanFormControls(document.body);
    expect(result.items).toHaveLength(3);
  });

  it("detects label via for/id", () => {
    document.body.innerHTML =
      '<label for="email">Email</label><input id="email" type="email" />';
    const result = scanFormControls(document.body);
    expect(result.items[0].labelMethod).toBe("for-id");
    expect(result.items[0].label).toBe("Email");
    expect(result.items[0].hasIssue).toBe(false);
  });

  it("detects wrapping label", () => {
    document.body.innerHTML = '<label>Name <input type="text" /></label>';
    const result = scanFormControls(document.body);
    expect(result.items[0].labelMethod).toBe("wrapping");
    expect(result.items[0].label).toBe("Name");
  });

  it("detects aria-label", () => {
    document.body.innerHTML = '<input type="search" aria-label="Search" />';
    const result = scanFormControls(document.body);
    expect(result.items[0].labelMethod).toBe("aria-label");
    expect(result.items[0].label).toBe("Search");
  });

  it("detects aria-labelledby", () => {
    document.body.innerHTML =
      '<span id="lbl">Username</span><input aria-labelledby="lbl" />';
    const result = scanFormControls(document.body);
    expect(result.items[0].labelMethod).toBe("aria-labelledby");
    expect(result.items[0].label).toBe("Username");
  });

  it("flags placeholder-only as warning", () => {
    document.body.innerHTML = '<input type="text" placeholder="Enter name" />';
    const result = scanFormControls(document.body);
    expect(result.items[0].labelMethod).toBe("placeholder-only");
    expect(result.items[0].hasIssue).toBe(true);
    const issue = result.issues.find((i) => i.type === "placeholder-only");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
    expect(issue?.wcag).toBe("3.3.2");
  });

  it("flags no label as error", () => {
    document.body.innerHTML = '<input type="text" />';
    const result = scanFormControls(document.body);
    expect(result.items[0].labelMethod).toBe("none");
    expect(result.items[0].hasIssue).toBe(true);
    const issue = result.issues.find((i) => i.type === "no-label");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
    expect(issue?.wcag).toBe("3.3.2");
    expect(issue?.fix).toBeDefined();
  });

  it("reports correct type for input elements", () => {
    document.body.innerHTML =
      '<input type="email" /><input type="checkbox" /><input />';
    const result = scanFormControls(document.body);
    expect(result.items[0].type).toBe("email");
    expect(result.items[1].type).toBe("checkbox");
    expect(result.items[2].type).toBe("text");
  });

  it("reports tag name for select and textarea", () => {
    document.body.innerHTML =
      "<select><option>A</option></select><textarea></textarea>";
    const result = scanFormControls(document.body);
    expect(result.items[0].type).toBe("select");
    expect(result.items[1].type).toBe("textarea");
  });

  it("scopes to a root element", () => {
    document.body.innerHTML =
      '<div id="scope"><input type="text" /></div><input type="email" />';
    const scope = document.getElementById("scope") as Element;
    const result = scanFormControls(scope);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("text");
  });

  it("ignores hidden inputs", () => {
    document.body.innerHTML =
      '<input type="hidden" name="csrf" value="abc" /><input type="text" />';
    const result = scanFormControls(document.body);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("text");
  });

  it("ignores submit and button inputs", () => {
    document.body.innerHTML =
      '<input type="submit" value="Go" /><input type="button" value="Click" /><input type="text" />';
    const result = scanFormControls(document.body);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("text");
  });

  it("handles aria-labelledby with multiple IDs", () => {
    document.body.innerHTML =
      '<span id="first">First</span><span id="last">Last</span><input aria-labelledby="first last" />';
    const result = scanFormControls(document.body);
    expect(result.items[0].labelMethod).toBe("aria-labelledby");
    expect(result.items[0].label).toBe("First Last");
  });
});
