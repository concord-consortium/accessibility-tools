import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLiveRegions, subscribeAnnouncements } from "./live-region-observer";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getLiveRegions", () => {
  it("returns empty array when no live regions exist", () => {
    expect(getLiveRegions()).toHaveLength(0);
  });

  it("finds aria-live elements", () => {
    const div = document.createElement("div");
    div.setAttribute("aria-live", "polite");
    div.textContent = "Hello";
    document.body.appendChild(div);

    const regions = getLiveRegions();
    expect(regions).toHaveLength(1);
    expect(regions[0].politeness).toBe("polite");
  });

  it("identifies assertive regions", () => {
    const div = document.createElement("div");
    div.setAttribute("aria-live", "assertive");
    document.body.appendChild(div);

    const regions = getLiveRegions();
    expect(regions[0].politeness).toBe("assertive");
  });

  it("identifies off regions", () => {
    const div = document.createElement("div");
    div.setAttribute("aria-live", "off");
    document.body.appendChild(div);

    const regions = getLiveRegions();
    expect(regions[0].politeness).toBe("off");
  });

  it("excludes sidebar elements", () => {
    const sidebar = document.createElement("div");
    sidebar.setAttribute("data-a11y-debug", "sidebar");
    const live = document.createElement("div");
    live.setAttribute("aria-live", "polite");
    sidebar.appendChild(live);
    document.body.appendChild(sidebar);

    expect(getLiveRegions()).toHaveLength(0);
  });
});

describe("subscribeAnnouncements", () => {
  it("returns an unsubscribe function", () => {
    const unsub = subscribeAnnouncements(() => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("notifies on text content change in live region", async () => {
    const div = document.createElement("div");
    div.setAttribute("aria-live", "polite");
    document.body.appendChild(div);

    const events: Array<{ text: string; previousText: string }> = [];
    const unsub = subscribeAnnouncements((event) => {
      events.push({ text: event.text, previousText: event.previousText });
    });

    // Trigger mutation
    div.textContent = "New announcement";

    // MutationObserver is async - wait for it
    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(1);
    expect(events[0].text).toBe("New announcement");
    expect(events[0].previousText).toBe("");

    unsub();
  });

  it("does not fire for same text", async () => {
    const div = document.createElement("div");
    div.setAttribute("aria-live", "polite");
    div.textContent = "Static text";
    document.body.appendChild(div);

    const events: unknown[] = [];
    const unsub = subscribeAnnouncements((event) => {
      events.push(event);
    });

    // Set same text
    div.textContent = "Static text";

    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(0);

    unsub();
  });

  it("detects text cleared", async () => {
    const div = document.createElement("div");
    div.setAttribute("aria-live", "polite");
    div.textContent = "Initial";
    document.body.appendChild(div);

    const events: Array<{ text: string }> = [];
    const unsub = subscribeAnnouncements((event) => {
      events.push({ text: event.text });
    });

    // Clear text
    div.textContent = "";

    await new Promise((r) => setTimeout(r, 50));

    expect(events).toHaveLength(1);
    expect(events[0].text).toBe("");

    unsub();
  });

  it("includes politeness level", async () => {
    const div = document.createElement("div");
    div.setAttribute("aria-live", "assertive");
    document.body.appendChild(div);

    let politeness = "";
    const unsub = subscribeAnnouncements((event) => {
      politeness = event.region.politeness;
    });

    div.textContent = "Alert!";

    await new Promise((r) => setTimeout(r, 50));

    expect(politeness).toBe("assertive");

    unsub();
  });
});
