import { afterEach, describe, expect, it } from "vitest";
import {
  findFocusableIndex,
  findNextFocusableOutside,
  getVisibleFocusables,
  pickSlotEntryTarget,
} from "./dom-utils";

afterEach(() => {
  document.body.innerHTML = "";
});

function makeContainer(html: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe("getVisibleFocusables", () => {
  it("returns native focusables in DOM order", () => {
    const container = makeContainer(
      '<a href="#x">a</a><button>b</button><input />',
    );
    const tags = getVisibleFocusables(container).map((el) =>
      el.tagName.toLowerCase(),
    );
    expect(tags).toEqual(["a", "button", "input"]);
  });

  it('excludes native focusables with tabindex="-1"', () => {
    const container = makeContainer(
      '<button>keep</button><button tabindex="-1">skip</button>',
    );
    const result = getVisibleFocusables(container).map((el) => el.textContent);
    expect(result).toEqual(["keep"]);
  });

  it("excludes any element with negative tabindex", () => {
    const container = makeContainer(
      '<button tabindex="-2">a</button><button tabindex="-1">b</button>' +
        '<button tabindex="0">c</button>',
    );
    const result = getVisibleFocusables(container).map((el) => el.textContent);
    expect(result).toEqual(["c"]);
  });

  it("excludes aria-hidden elements", () => {
    const container = makeContainer(
      '<button>a</button><button aria-hidden="true">b</button>',
    );
    const result = getVisibleFocusables(container).map((el) => el.textContent);
    expect(result).toEqual(["a"]);
  });

  it("excludes disabled controls", () => {
    const container = makeContainer(
      "<button disabled>a</button><button>b</button>",
    );
    const result = getVisibleFocusables(container).map((el) => el.textContent);
    expect(result).toEqual(["b"]);
  });
});

describe("findFocusableIndex", () => {
  it("returns -1 when activeEl is null", () => {
    const container = makeContainer("<button>a</button>");
    const focusables = getVisibleFocusables(container);
    expect(findFocusableIndex(focusables, null)).toBe(-1);
  });

  it("returns the direct index when activeEl is in the list", () => {
    const container = makeContainer("<button>a</button><button>b</button>");
    const focusables = getVisibleFocusables(container);
    expect(findFocusableIndex(focusables, focusables[1])).toBe(1);
  });

  it("returns the ancestor index when activeEl is a tabindex=-1 descendant of a focusable", () => {
    const container = makeContainer(
      '<div tabindex="0" id="composite"><span tabindex="-1" id="inner">x</span></div>',
    );
    const focusables = getVisibleFocusables(container);
    expect(focusables).toHaveLength(1);
    const inner = container.querySelector("#inner");
    expect(findFocusableIndex(focusables, inner)).toBe(0);
  });

  it("returns -1 when activeEl is unrelated to any focusable", () => {
    const container = makeContainer("<button>a</button>");
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    const focusables = getVisibleFocusables(container);
    expect(findFocusableIndex(focusables, outside)).toBe(-1);
  });
});

describe("pickSlotEntryTarget", () => {
  it('returns the first focusable when none have tabindex="0"', () => {
    const slot = makeContainer("<button>a</button><button>b</button>");
    const target = pickSlotEntryTarget(slot, false);
    expect(target?.textContent).toBe("a");
  });

  it('returns the last focusable when reverse=true and none have tabindex="0"', () => {
    const slot = makeContainer("<button>a</button><button>b</button>");
    const target = pickSlotEntryTarget(slot, true);
    expect(target?.textContent).toBe("b");
  });

  it('prefers the tabindex="0" element over first/last when present', () => {
    const slot = makeContainer(
      '<button tabindex="-1">a</button>' +
        '<button tabindex="0">b</button>' +
        '<button tabindex="-1">c</button>',
    );
    expect(pickSlotEntryTarget(slot, false)?.textContent).toBe("b");
    expect(pickSlotEntryTarget(slot, true)?.textContent).toBe("b");
  });

  it("falls back to the first interactive descendant when no tabbable focusables exist", () => {
    const slot = makeContainer(
      '<button tabindex="-1">a</button><button tabindex="-1">b</button>',
    );
    expect(pickSlotEntryTarget(slot, false)?.textContent).toBe("a");
  });

  it("falls back to the last interactive descendant when reverse=true", () => {
    const slot = makeContainer(
      '<button tabindex="-1">a</button><button tabindex="-1">b</button>',
    );
    expect(pickSlotEntryTarget(slot, true)?.textContent).toBe("b");
  });

  it("includes contenteditable elements in the fallback", () => {
    const slot = makeContainer(
      '<div contenteditable="true" tabindex="-1">edit me</div>',
    );
    expect(pickSlotEntryTarget(slot, false)?.textContent).toBe("edit me");
  });

  it("returns null when no interactive descendants exist", () => {
    const slot = makeContainer("<span>just text</span>");
    expect(pickSlotEntryTarget(slot, false)).toBeNull();
  });
});

describe("findNextFocusableOutside", () => {
  function makeFixture(): {
    before: HTMLElement;
    container: HTMLElement;
    after: HTMLElement;
  } {
    const before = document.createElement("button");
    before.textContent = "before";
    const container = document.createElement("div");
    container.tabIndex = 0;
    container.id = "trap";
    const inside = document.createElement("button");
    inside.textContent = "inside";
    container.appendChild(inside);
    const after = document.createElement("button");
    after.textContent = "after";
    document.body.append(before, container, after);
    return { before, container, after };
  }

  it("returns the next focusable in document order, skipping container descendants", () => {
    const { container, after } = makeFixture();
    expect(findNextFocusableOutside(container, false)).toBe(after);
  });

  it("returns the previous focusable when reverse=true", () => {
    const { before, container } = makeFixture();
    expect(findNextFocusableOutside(container, true)).toBe(before);
  });

  it("skips elements with negative tabindex outside the container", () => {
    const { before, container, after } = makeFixture();
    after.setAttribute("tabindex", "-1");
    const after2 = document.createElement("button");
    after2.textContent = "after2";
    document.body.appendChild(after2);
    expect(findNextFocusableOutside(container, false)).toBe(after2);
    expect(findNextFocusableOutside(container, true)).toBe(before);
  });
});
