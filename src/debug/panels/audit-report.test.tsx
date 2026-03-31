import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditReportPanel } from "./audit-report";

let rafCallbacks: Array<() => void> = [];

beforeEach(() => {
  rafCallbacks = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb as () => void);
    return rafCallbacks.length;
  });
  Element.prototype.scrollIntoView = () => {};
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function flushRaf() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  for (const cb of cbs) cb();
}

describe("AuditReportPanel", () => {
  it("renders with title", () => {
    render(<AuditReportPanel />);
    expect(screen.getByText("WCAG Audit Report")).toBeTruthy();
  });

  it("has a Run Audit button", () => {
    render(<AuditReportPanel />);
    expect(screen.getByText("Run Audit")).toBeTruthy();
  });

  it("shows empty state before audit", () => {
    render(<AuditReportPanel />);
    expect(screen.getByText(/click.*run audit/i)).toBeTruthy();
  });

  it("Export button is disabled before audit", () => {
    render(<AuditReportPanel />);
    const exportBtn = screen.getByLabelText(
      "Export audit report as markdown to clipboard",
    );
    expect(exportBtn.hasAttribute("disabled")).toBe(true);
  });

  it("runs audit and shows results", () => {
    render(<AuditReportPanel />);

    act(() => {
      screen.getByText("Run Audit").click();
      flushRaf();
    });

    // Should show passing/failing counts
    expect(screen.getAllByText(/passing/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows scope in results", () => {
    render(<AuditReportPanel />);

    act(() => {
      screen.getByText("Run Audit").click();
      flushRaf();
    });

    expect(screen.getByText(/Scope:/)).toBeTruthy();
  });

  it("shows PASS/FAIL badges on criteria", () => {
    render(<AuditReportPanel />);

    act(() => {
      screen.getByText("Run Audit").click();
      flushRaf();
    });

    // Should have at least one PASS badge
    expect(screen.getAllByText("PASS").length).toBeGreaterThanOrEqual(1);
  });

  it("shows toast after audit completes", () => {
    render(<AuditReportPanel />);
    const container = document.createElement("div");
    container.className = "a11y-debug-sidebar";
    document.body.appendChild(container);

    act(() => {
      screen.getByText("Run Audit").click();
      flushRaf();
    });

    const toast = document.querySelector(".a11y-toast");
    expect(toast?.textContent).toContain("Audit complete");
  });

  it("enables Export button after audit", () => {
    render(<AuditReportPanel />);

    act(() => {
      screen.getByText("Run Audit").click();
      flushRaf();
    });

    const exportBtn = screen.getByLabelText(
      "Export audit report as markdown to clipboard",
    );
    expect(exportBtn.hasAttribute("disabled")).toBe(false);
  });

  it("exports markdown to clipboard", async () => {
    render(<AuditReportPanel />);

    act(() => {
      screen.getByText("Run Audit").click();
      flushRaf();
    });

    await act(async () => {
      screen
        .getByLabelText("Export audit report as markdown to clipboard")
        .click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    const md = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(md).toContain("# WCAG Audit Report");
  });
});
