import { afterEach, describe, expect, it } from "vitest";
import { scanImages } from "./images";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("scanImages", () => {
  it("returns empty for no images", () => {
    const result = scanImages();
    expect(result.items).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  it("detects img with alt text", () => {
    document.body.innerHTML = '<img src="photo.jpg" alt="A cat">';
    const result = scanImages();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].status).toBe("has-alt");
    expect(result.issues).toHaveLength(0);
  });

  it("detects img with missing alt", () => {
    document.body.innerHTML = '<img src="photo.jpg">';
    const result = scanImages();
    expect(result.items[0].status).toBe("missing");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("img-no-alt");
  });

  it("detects decorative img (alt empty)", () => {
    document.body.innerHTML = '<img src="spacer.gif" alt="">';
    const result = scanImages();
    expect(result.items[0].status).toBe("decorative");
    expect(result.issues).toHaveLength(0);
  });

  it("detects decorative img (aria-hidden)", () => {
    document.body.innerHTML = '<img src="bg.jpg" aria-hidden="true">';
    const result = scanImages();
    expect(result.items[0].status).toBe("decorative");
  });

  it("detects generic alt text", () => {
    document.body.innerHTML = '<img src="photo.jpg" alt="image">';
    const result = scanImages();
    expect(result.items[0].status).toBe("generic");
    expect(result.issues[0].type).toBe("img-generic-alt");
  });

  it("detects long alt text", () => {
    const longAlt = "a".repeat(130);
    document.body.innerHTML = `<img src="photo.jpg" alt="${longAlt}">`;
    const result = scanImages();
    expect(result.items[0].status).toBe("long-alt");
    expect(result.issues[0].type).toBe("img-long-alt");
  });

  it("accepts aria-label as alt", () => {
    document.body.innerHTML =
      '<img src="photo.jpg" aria-label="A descriptive label">';
    const result = scanImages();
    expect(result.items[0].status).toBe("has-alt");
    expect(result.issues).toHaveLength(0);
  });

  it("detects svg role=img without accessible name", () => {
    document.body.innerHTML = '<svg role="img"></svg>';
    const result = scanImages();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].status).toBe("missing");
    expect(result.issues[0].type).toBe("svg-no-label");
  });

  it("accepts svg role=img with aria-label", () => {
    document.body.innerHTML = '<svg role="img" aria-label="Chart"></svg>';
    const result = scanImages();
    expect(result.items[0].status).toBe("has-alt");
    expect(result.issues).toHaveLength(0);
  });
});
