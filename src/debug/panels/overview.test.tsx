import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OverviewPanel } from "./overview";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
  // scanAnimations uses matchMedia which jsdom doesn't provide
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("OverviewPanel", () => {
  it("renders with title and score", () => {
    render(<OverviewPanel />);
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Accessibility Score")).toBeTruthy();
  });

  it("shows Rescan and Export buttons", () => {
    render(<OverviewPanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
    expect(screen.getByText("Export")).toBeTruthy();
  });

  it("renders check cards on mount", () => {
    render(<OverviewPanel />);
    expect(screen.getByText("Heading Hierarchy")).toBeTruthy();
    expect(screen.getByText("Form Label Checker")).toBeTruthy();
    expect(screen.getByText("Color Contrast")).toBeTruthy();
  });

  it("check cards have aria-expanded attribute", () => {
    render(<OverviewPanel />);
    const toggles = document.querySelectorAll(".a11y-overview-check-toggle");
    expect(toggles.length).toBeGreaterThan(0);
    expect(toggles[0].getAttribute("aria-expanded")).toBe("false");
  });

  it("toggles card expansion on click", () => {
    render(<OverviewPanel />);
    const toggle = document.querySelector(".a11y-overview-check-toggle");
    expect(toggle).toBeTruthy();
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      (toggle as HTMLElement).click();
    });

    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(
      document.querySelector(".a11y-overview-check-expanded"),
    ).toBeTruthy();
  });

  it("collapses card on second click", () => {
    render(<OverviewPanel />);
    const toggle = document.querySelector(
      ".a11y-overview-check-toggle",
    ) as HTMLElement;

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".a11y-overview-check-expanded")).toBeNull();
  });

  it("expanded area is clickable and calls onNavigateToPanel", () => {
    const onNavigate = vi.fn();
    render(<OverviewPanel onNavigateToPanel={onNavigate} />);

    // Expand the first card
    const toggle = document.querySelector(
      ".a11y-overview-check-toggle",
    ) as HTMLElement;
    act(() => toggle.click());

    // Click the expanded area
    const expanded = document.querySelector(
      ".a11y-overview-check-expanded",
    ) as HTMLElement;
    expect(expanded).toBeTruthy();

    act(() => expanded.click());
    expect(onNavigate).toHaveBeenCalledWith("headings");
  });

  it("open panel icon button calls onNavigateToPanel", () => {
    const onNavigate = vi.fn();
    render(<OverviewPanel onNavigateToPanel={onNavigate} />);

    const iconBtn = document.querySelector(
      ".a11y-overview-open-panel-btn",
    ) as HTMLElement;
    expect(iconBtn).toBeTruthy();

    act(() => iconBtn.click());
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("open panel icon button does not toggle card expansion", () => {
    render(<OverviewPanel />);
    const toggle = document.querySelector(".a11y-overview-check-toggle");
    const iconBtn = document.querySelector(
      ".a11y-overview-open-panel-btn",
    ) as HTMLElement;

    act(() => iconBtn.click());
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("expanded area shows score explanation", () => {
    render(<OverviewPanel />);
    const toggle = document.querySelector(
      ".a11y-overview-check-toggle",
    ) as HTMLElement;

    act(() => toggle.click());

    const explain = document.querySelector(".a11y-overview-explain");
    expect(explain).toBeTruthy();
    expect(explain?.textContent).toContain("Score:");
  });

  it("rescan button triggers toast", () => {
    const container = document.createElement("div");
    container.className = "a11y-debug-sidebar";
    document.body.appendChild(container);

    render(<OverviewPanel />);

    act(() => {
      screen.getByText("Rescan").click();
    });

    const toast = document.querySelector(".a11y-toast");
    expect(toast?.textContent).toContain("Rescan complete");
  });
});
