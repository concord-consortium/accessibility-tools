import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ImageAuditPanel } from "./image-audit";

beforeEach(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ImageAuditPanel", () => {
  it("renders with title", () => {
    render(<ImageAuditPanel />);
    expect(screen.getByText("Image Audit")).toBeTruthy();
  });

  it("has a Rescan button", () => {
    render(<ImageAuditPanel />);
    expect(screen.getByText("Rescan")).toBeTruthy();
  });

  it("shows image and issue counts", () => {
    render(<ImageAuditPanel />);
    expect(screen.getByText(/\d+ images, \d+ issues/)).toBeTruthy();
  });

  it("shows image with alt text", () => {
    const img = document.createElement("img");
    img.setAttribute("alt", "A cat photo");
    document.body.appendChild(img);

    render(<ImageAuditPanel />);
    expect(screen.getByText("A cat photo")).toBeTruthy();
    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("shows image missing alt", () => {
    const img = document.createElement("img");
    img.setAttribute("src", "test.jpg");
    document.body.appendChild(img);

    render(<ImageAuditPanel />);
    expect(screen.getByText("MISS")).toBeTruthy();
    expect(screen.getAllByText(/no alt text/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows decorative image", () => {
    const img = document.createElement("img");
    img.setAttribute("alt", "");
    document.body.appendChild(img);

    render(<ImageAuditPanel />);
    expect(screen.getByText("DEC")).toBeTruthy();
  });

  it("rescan button triggers toast", () => {
    render(<ImageAuditPanel />);
    const container = document.createElement("div");
    container.className = "a11y-debug-sidebar";
    document.body.appendChild(container);

    act(() => {
      screen.getByText("Rescan").click();
    });

    const toast = document.querySelector(".a11y-toast");
    expect(toast?.textContent).toContain("Rescan complete");
  });
});
