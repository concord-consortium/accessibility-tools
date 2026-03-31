import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as liveRegionObserver from "../utils/live-region-observer";
import { AnnouncementsLogPanel } from "./announcements-log";

let subscribers: Array<(event: liveRegionObserver.AnnouncementEvent) => void> =
  [];

beforeEach(() => {
  subscribers = [];
  vi.spyOn(liveRegionObserver, "subscribeAnnouncements").mockImplementation(
    (cb) => {
      subscribers.push(cb);
      return () => {
        subscribers = subscribers.filter((s) => s !== cb);
      };
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function dispatch(event: liveRegionObserver.AnnouncementEvent) {
  for (const sub of subscribers) {
    sub(event);
  }
}

function makeEvent(
  text: string,
  politeness: "polite" | "assertive" = "polite",
): liveRegionObserver.AnnouncementEvent {
  const el = document.createElement("div");
  el.setAttribute("aria-live", politeness);
  return {
    text,
    previousText: "",
    region: {
      element: el,
      description: `<div[aria-live="${politeness}"]>`,
      componentName: null,
      politeness,
    },
    timestamp: Date.now(),
  };
}

describe("AnnouncementsLogPanel", () => {
  it("shows empty state message", () => {
    render(<AnnouncementsLogPanel />);
    expect(screen.getByText(/no announcements captured/i)).toBeTruthy();
  });

  it("shows announcement text", () => {
    render(<AnnouncementsLogPanel />);

    act(() => {
      dispatch(makeEvent("Item selected"));
    });

    expect(screen.getByText("Item selected")).toBeTruthy();
    expect(screen.getByText(/1 announcement\b/)).toBeTruthy();
  });

  it("shows politeness badge P for polite", () => {
    render(<AnnouncementsLogPanel />);

    act(() => {
      dispatch(makeEvent("Hello", "polite"));
    });

    expect(screen.getByText("P")).toBeTruthy();
  });

  it("shows politeness badge A for assertive", () => {
    render(<AnnouncementsLogPanel />);

    act(() => {
      dispatch(makeEvent("Alert!", "assertive"));
    });

    expect(screen.getByText("A")).toBeTruthy();
  });

  it("shows (cleared) for empty text", () => {
    render(<AnnouncementsLogPanel />);

    act(() => {
      dispatch(makeEvent(""));
    });

    expect(screen.getByText("(cleared)")).toBeTruthy();
  });

  it("clears the log", () => {
    render(<AnnouncementsLogPanel />);

    act(() => {
      dispatch(makeEvent("Test"));
    });

    expect(screen.getByText(/1 announcement/)).toBeTruthy();

    act(() => {
      screen.getByText("Clear").click();
    });

    expect(screen.getByText(/no announcements captured/i)).toBeTruthy();
  });

  it("clear button is disabled when empty", () => {
    render(<AnnouncementsLogPanel />);
    expect(screen.getByText("Clear").hasAttribute("disabled")).toBe(true);
  });

  it("has role=log on the event list", () => {
    render(<AnnouncementsLogPanel />);

    act(() => {
      dispatch(makeEvent("Test"));
    });

    expect(screen.getByRole("log")).toBeTruthy();
  });

  it("logs multiple announcements in reverse order", () => {
    render(<AnnouncementsLogPanel />);

    act(() => {
      dispatch(makeEvent("First"));
      dispatch(makeEvent("Second"));
    });

    expect(screen.getByText(/2 announcements/)).toBeTruthy();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = render(<AnnouncementsLogPanel />);
    expect(subscribers).toHaveLength(1);
    unmount();
    expect(subscribers).toHaveLength(0);
  });
});
