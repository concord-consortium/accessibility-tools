import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusTrapController } from "./focus-trap-controller";
import type { FocusTrapStrategy } from "./types";

function makeContainer(): HTMLDivElement {
  const el = document.createElement("div");
  el.tabIndex = 0;
  document.body.appendChild(el);
  return el;
}

function setActiveElement(el: Element) {
  Object.defineProperty(document, "activeElement", {
    value: el,
    configurable: true,
  });
}

function pressKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

let controller: FocusTrapController | null = null;

afterEach(() => {
  controller?.destroy();
  controller = null;
  document.body.innerHTML = "";
});

describe("FocusTrapController", () => {
  it("cycles Tab through slots in order", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.appendChild(title);
    container.appendChild(content);
    vi.spyOn(title, "focus");
    vi.spyOn(content, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
    };
    controller = new FocusTrapController(container, strategy);
    controller.setEnabled(true);
    controller.enterTrap();

    expect(title.focus).toHaveBeenCalled();

    setActiveElement(title);
    pressKey("Tab");
    expect(content.focus).toHaveBeenCalled();
  });

  it("re-derives slotIndex from current focus before Tab cycles", () => {
    // Simulates a click moving focus into the toolbar slot while the trap
    // remains active in the title slot. A subsequent Tab should advance from
    // the toolbar — where focus actually is — not from the stale title slot.
    const container = makeContainer();
    const title = document.createElement("input");
    const toolbar = document.createElement("div");
    const toolbarBtn = document.createElement("button");
    toolbar.appendChild(toolbarBtn);
    const content = document.createElement("textarea");
    container.appendChild(title);
    container.appendChild(toolbar);
    container.appendChild(content);
    vi.spyOn(title, "focus");
    vi.spyOn(content, "focus");
    vi.spyOn(toolbarBtn, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, toolbar, content }),
      cycleOrder: ["title", "toolbar", "content"],
    };
    controller = new FocusTrapController(container, strategy);
    controller.setEnabled(true);
    controller.enterTrap();
    // Trap entered at title (slotIndex=0). Without the re-derivation fix, a
    // Tab from a click-focused toolbar button would advance to "toolbar" again
    // (slotIndex 0 -> 1) rather than continuing to "content" (1 -> 2).
    expect(title.focus).toHaveBeenCalled();

    setActiveElement(toolbarBtn);
    pressKey("Tab");

    expect(content.focus).toHaveBeenCalled();
  });

  it("treats a tabindex=-1 descendant of a focusable as that focusable for Tab purposes", () => {
    // Composite widget: an outer tabindex=0 wrapper containing tabindex=-1
    // controls. When a control is focused (e.g. via arrow keys or click),
    // pressing Tab should advance from the wrapper, not skip the rest of the
    // slot.
    const container = makeContainer();
    const content = document.createElement("div");
    const widget1 = document.createElement("div");
    widget1.setAttribute("tabindex", "0");
    const widget1Inner = document.createElement("button");
    widget1Inner.setAttribute("tabindex", "-1");
    widget1.appendChild(widget1Inner);
    const widget2 = document.createElement("div");
    widget2.setAttribute("tabindex", "0");
    content.appendChild(widget1);
    content.appendChild(widget2);
    container.appendChild(content);
    vi.spyOn(widget2, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content }),
      cycleOrder: ["content"],
      tabWithinSlots: ["content"],
    };
    controller = new FocusTrapController(container, strategy);
    controller.setEnabled(true);
    controller.enterTrap();

    setActiveElement(widget1Inner);
    pressKey("Tab");

    expect(widget2.focus).toHaveBeenCalled();
  });

  it("focuses the roving tabindex=0 element when entering a slot", () => {
    // Roving tabindex pattern (e.g. a palette): one element has tabindex="0",
    // the rest have tabindex="-1". On (re-)entry, focus the active item, not
    // the first or last.
    const container = makeContainer();
    const title = document.createElement("input");
    const palette = document.createElement("div");
    const item1 = document.createElement("button");
    item1.setAttribute("tabindex", "-1");
    const item2 = document.createElement("button");
    item2.setAttribute("tabindex", "0");
    const item3 = document.createElement("button");
    item3.setAttribute("tabindex", "-1");
    palette.append(item1, item2, item3);
    container.append(title, palette);
    vi.spyOn(item1, "focus");
    vi.spyOn(item2, "focus");
    vi.spyOn(item3, "focus");
    vi.spyOn(title, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content: palette }),
      cycleOrder: ["title", "content"],
      tabWithinSlots: ["content"],
    };
    controller = new FocusTrapController(container, strategy);
    controller.setEnabled(true);
    controller.enterTrap();

    // Enter focuses title first
    expect(title.focus).toHaveBeenCalled();

    // Tab from title -> palette: should land on the roving target (item2),
    // not item1.
    setActiveElement(title);
    pressKey("Tab");
    expect(item2.focus).toHaveBeenCalled();
    expect(item1.focus).not.toHaveBeenCalled();
  });

  it("falls back to an interactive descendant when a tabWithin slot has no tabbable children", () => {
    // Toolbar mid-cycle: all buttons transiently have tabindex=-1 (because the
    // trap's setChildrenNonTabbable ran). Programmatic entry should still find
    // *something* to focus rather than failing silently on the slot div.
    const container = makeContainer();
    const toolbar = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.setAttribute("tabindex", "-1");
    const btn2 = document.createElement("button");
    btn2.setAttribute("tabindex", "-1");
    toolbar.append(btn1, btn2);
    const content = document.createElement("textarea");
    container.append(toolbar, content);
    vi.spyOn(btn1, "focus");
    vi.spyOn(content, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ toolbar, content }),
      cycleOrder: ["toolbar", "content"],
      tabWithinSlots: ["toolbar"],
    };
    controller = new FocusTrapController(container, strategy);
    controller.setEnabled(true);
    controller.enterTrap();

    // First slot in cycleOrder is the toolbar (tabWithinSlots), which has
    // only tabindex=-1 buttons. Should still focus btn1 via the fallback.
    expect(btn1.focus).toHaveBeenCalled();
  });

  it("exits trap on Escape", () => {
    const container = makeContainer();
    vi.spyOn(container, "focus");
    const onExit = vi.fn();
    const title = document.createElement("input");
    container.appendChild(title);
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title }),
      cycleOrder: ["title"],
      onExit,
    };
    controller = new FocusTrapController(container, strategy);
    controller.setEnabled(true);
    controller.enterTrap();
    expect(controller.isTrapped).toBe(true);

    setActiveElement(title);
    pressKey("Escape");

    expect(controller.isTrapped).toBe(false);
    expect(onExit).toHaveBeenCalledOnce();
    expect(container.focus).toHaveBeenCalled();
  });

  it("destroy removes listeners and cleans up", () => {
    const container = makeContainer();
    const strategy: FocusTrapStrategy = {
      getElements: () => ({}),
      cycleOrder: [],
    };
    const removeSpy = vi.spyOn(document, "removeEventListener");
    controller = new FocusTrapController(container, strategy);
    controller.destroy();

    expect(removeSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      true,
    );
    expect(removeSpy).toHaveBeenCalledWith(
      "focusin",
      expect.any(Function),
      true,
    );
  });
});
