import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as liveRegionObserver from "../utils/live-region-observer";
import { LiveRegionsPanel } from "./live-regions";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
  vi.spyOn(liveRegionObserver, "subscribeAnnouncements").mockImplementation(
    () => () => {},
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function mockGetLiveRegions(regions: liveRegionObserver.LiveRegionInfo[]) {
  vi.spyOn(liveRegionObserver, "getLiveRegions").mockReturnValue(regions);
}

function makeRegion(
  politeness: "polite" | "assertive" | "off" = "polite",
  text = "Hello",
): liveRegionObserver.LiveRegionInfo {
  const el = document.createElement("div");
  el.setAttribute("aria-live", politeness);
  el.textContent = text;
  document.body.appendChild(el);
  return {
    element: el,
    description: `<div[aria-live="${politeness}"]>`,
    componentName: null,
    politeness,
  };
}

describe("LiveRegionsPanel", () => {
  it("shows empty state when no regions found", () => {
    mockGetLiveRegions([]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText(/no aria-live regions found/i)).toBeTruthy();
  });

  it("shows region count", () => {
    mockGetLiveRegions([makeRegion("polite"), makeRegion("assertive")]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText(/2 regions/)).toBeTruthy();
  });

  it("shows politeness badge for polite region", () => {
    mockGetLiveRegions([makeRegion("polite")]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText("polite")).toBeTruthy();
  });

  it("shows politeness badge for assertive region", () => {
    mockGetLiveRegions([makeRegion("assertive")]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText("assertive")).toBeTruthy();
  });

  it("shows (empty) for regions with no text", () => {
    mockGetLiveRegions([makeRegion("polite", "")]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText("(empty)")).toBeTruthy();
  });

  it("flags competing assertive regions", () => {
    mockGetLiveRegions([makeRegion("assertive"), makeRegion("assertive")]);
    render(<LiveRegionsPanel />);
    expect(
      screen.getAllByText(/competing assertive/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("flags aria-live=off", () => {
    mockGetLiveRegions([makeRegion("off")]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText(/may suppress/i)).toBeTruthy();
  });

  it("has a Rescan button", () => {
    mockGetLiveRegions([]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
  });

  it("rescan updates the list", () => {
    const spy = vi
      .spyOn(liveRegionObserver, "getLiveRegions")
      .mockReturnValue([]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText(/0 regions/)).toBeTruthy();

    spy.mockReturnValue([makeRegion("polite")]);

    act(() => {
      screen.getByText("Rescan").click();
    });

    expect(screen.getByText(/1 region\b/)).toBeTruthy();
  });

  it("shows issue count", () => {
    mockGetLiveRegions([makeRegion("off")]);
    render(<LiveRegionsPanel />);
    expect(screen.getByText(/1 issue/)).toBeTruthy();
  });
});
