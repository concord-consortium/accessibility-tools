import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckIssue } from "../checks/types";
import {
  CheckPanelIssues,
  type ItemFilter,
  buildSeverityMap,
  getItemSeverity,
  issueRowClass,
} from "./check-panel-issues";

afterEach(() => {
  document.body.innerHTML = "";
});

function makeIssue(
  overrides: Partial<CheckIssue> & { message: string },
): CheckIssue {
  return {
    type: "test",
    severity: "error",
    ...overrides,
  };
}

describe("CheckPanelIssues", () => {
  it("renders nothing when no issues", () => {
    const { container } = render(<CheckPanelIssues issues={[]} />);
    expect(container.querySelector(".a11y-panel-issues")).toBeNull();
  });

  it("renders issues list", () => {
    const issues = [
      makeIssue({ message: "Problem one" }),
      makeIssue({ message: "Problem two" }),
    ];
    render(<CheckPanelIssues issues={issues} />);
    expect(screen.getByText("Problem one")).toBeTruthy();
    expect(screen.getByText("Problem two")).toBeTruthy();
  });

  it("collapses issues beyond 3 with toggle", () => {
    const issues = Array.from({ length: 5 }, (_, i) =>
      makeIssue({ message: `Issue ${i + 1}` }),
    );
    render(<CheckPanelIssues issues={issues} />);

    expect(screen.getByText("Issue 1")).toBeTruthy();
    expect(screen.getByText("Issue 3")).toBeTruthy();
    expect(screen.queryByText("Issue 4")).toBeNull();
    expect(screen.getByText("Show 2 more")).toBeTruthy();
  });

  it("expands all issues on toggle click", () => {
    const issues = Array.from({ length: 5 }, (_, i) =>
      makeIssue({ message: `Issue ${i + 1}` }),
    );
    render(<CheckPanelIssues issues={issues} />);

    act(() => {
      screen.getByText("Show 2 more").click();
    });

    expect(screen.getByText("Issue 4")).toBeTruthy();
    expect(screen.getByText("Issue 5")).toBeTruthy();
    expect(screen.getByText("Show less")).toBeTruthy();
  });

  it("collapses back on second toggle click", () => {
    const issues = Array.from({ length: 5 }, (_, i) =>
      makeIssue({ message: `Issue ${i + 1}` }),
    );
    render(<CheckPanelIssues issues={issues} />);

    act(() => screen.getByText("Show 2 more").click());
    act(() => screen.getByText("Show less").click());

    expect(screen.queryByText("Issue 4")).toBeNull();
  });

  it("applies warning class to warning issues", () => {
    const issues = [
      makeIssue({ message: "An error", severity: "error" }),
      makeIssue({ message: "A warning", severity: "warning" }),
    ];
    render(<CheckPanelIssues issues={issues} />);

    const warningEl = screen.getByText("A warning");
    expect(warningEl.className).toContain("a11y-panel-issue-warning");

    const errorEl = screen.getByText("An error");
    expect(errorEl.className).not.toContain("a11y-panel-issue-warning");
  });

  it("does not show filter buttons in issues-only mode", () => {
    const issues = [
      makeIssue({ message: "err", severity: "error" }),
      makeIssue({ message: "warn", severity: "warning" }),
    ];
    render(<CheckPanelIssues issues={issues} />);

    expect(screen.queryByText(/All \(/)).toBeNull();
    expect(screen.queryByText(/Errors \(/)).toBeNull();
  });

  it("shows filter buttons when filter props provided", () => {
    const issues = [
      makeIssue({ message: "err", severity: "error" }),
      makeIssue({ message: "warn", severity: "warning" }),
    ];
    const onFilterChange = vi.fn();
    render(
      <CheckPanelIssues
        issues={issues}
        filter="all"
        onFilterChange={onFilterChange}
        itemCount={10}
        errorItemCount={3}
        warningItemCount={2}
      />,
    );

    expect(screen.getByText("All (10)")).toBeTruthy();
    expect(screen.getByText("Errors (3)")).toBeTruthy();
    expect(screen.getByText("Warnings (2)")).toBeTruthy();
  });

  it("calls onFilterChange when filter button clicked", () => {
    const issues = [
      makeIssue({ message: "err", severity: "error" }),
      makeIssue({ message: "warn", severity: "warning" }),
    ];
    const onFilterChange = vi.fn();
    render(
      <CheckPanelIssues
        issues={issues}
        filter="all"
        onFilterChange={onFilterChange}
        itemCount={10}
        errorItemCount={3}
        warningItemCount={2}
      />,
    );

    act(() => screen.getByText("Errors (3)").click());
    expect(onFilterChange).toHaveBeenCalledWith("errors");
  });

  it("uses item counts over issue counts for filter buttons", () => {
    const issues = [
      makeIssue({ message: "summary error", severity: "error" }),
      makeIssue({ message: "warn", severity: "warning" }),
    ];
    render(
      <CheckPanelIssues
        issues={issues}
        filter="all"
        onFilterChange={vi.fn()}
        itemCount={10}
        errorItemCount={5}
        warningItemCount={4}
      />,
    );

    expect(screen.getByText("Errors (5)")).toBeTruthy();
    expect(screen.getByText("Warnings (4)")).toBeTruthy();
  });

  it("hides filter buttons when no errors or warnings", () => {
    const onFilterChange = vi.fn();
    render(
      <CheckPanelIssues
        issues={[]}
        filter="all"
        onFilterChange={onFilterChange}
        itemCount={10}
        errorItemCount={0}
        warningItemCount={0}
      />,
    );

    expect(screen.queryByText(/All \(/)).toBeNull();
  });
});

describe("buildSeverityMap", () => {
  it("maps elements to their worst severity", () => {
    const el = document.createElement("div");
    const issues: CheckIssue[] = [
      makeIssue({ message: "w", severity: "warning", element: el }),
      makeIssue({ message: "e", severity: "error", element: el }),
    ];
    const map = buildSeverityMap(issues);
    expect(map.get(el)).toBe("error");
  });

  it("skips issues without elements", () => {
    const issues: CheckIssue[] = [
      makeIssue({ message: "no el", severity: "error" }),
    ];
    const map = buildSeverityMap(issues);
    expect(map.size).toBe(0);
  });
});

describe("getItemSeverity", () => {
  it("returns null for non-issue items", () => {
    const map = new Map<Element, "error" | "warning">();
    const el = document.createElement("div");
    expect(getItemSeverity(map, el, false)).toBeNull();
  });

  it("returns severity from map", () => {
    const el = document.createElement("div");
    const map = new Map<Element, "error" | "warning">([[el, "warning"]]);
    expect(getItemSeverity(map, el, true)).toBe("warning");
  });

  it("falls back to error when item has issue but no map entry", () => {
    const map = new Map<Element, "error" | "warning">();
    const el = document.createElement("div");
    expect(getItemSeverity(map, el, true)).toBe("error");
  });
});

describe("issueRowClass", () => {
  it("returns empty string for non-issue items", () => {
    const map = new Map<Element, "error" | "warning">();
    const el = document.createElement("div");
    expect(issueRowClass(map, el, false)).toBe("");
  });

  it("returns error class for error items", () => {
    const el = document.createElement("div");
    const map = new Map<Element, "error" | "warning">([[el, "error"]]);
    expect(issueRowClass(map, el, true)).toBe("a11y-panel-row-error");
  });

  it("returns warning class for warning items", () => {
    const el = document.createElement("div");
    const map = new Map<Element, "error" | "warning">([[el, "warning"]]);
    expect(issueRowClass(map, el, true)).toBe("a11y-panel-row-warning");
  });

  it("falls back to error class when no map entry", () => {
    const map = new Map<Element, "error" | "warning">();
    const el = document.createElement("div");
    expect(issueRowClass(map, el, true)).toBe("a11y-panel-row-error");
  });
});
