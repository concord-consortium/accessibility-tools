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

  it("shows image count", () => {
    const img = document.createElement("img");
    img.setAttribute("alt", "A photo");
    document.body.appendChild(img);

    render(<ImageAuditPanel />);
    expect(screen.getByText(/1 images/)).toBeTruthy();
  });

  it("shows issues for images without alt", () => {
    const img = document.createElement("img");
    img.setAttribute("src", "test.jpg");
    document.body.appendChild(img);

    render(<ImageAuditPanel />);
    expect(screen.getAllByText(/no alt text/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
