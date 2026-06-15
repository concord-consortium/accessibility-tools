import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusTrapController } from "./focus-trap-controller";
import type { FocusTrapStrategy } from "./types";

function makeContainer(): HTMLDivElement {
  const el = document.createElement("div");
  el.tabIndex = 0;
  document.body.appendChild(el);
  return el;
}

let activeElementOverridden = false;

function setActiveElement(el: Element) {
  // Override the native `document.activeElement` getter with a fixed value so a
  // test can simulate "focus is on element X" without driving real focus. This
  // installs an own, configurable property on `document`; afterEach deletes it
  // to restore jsdom's native getter (otherwise later tests that assert against
  // *real* focus would still see this stale value).
  Object.defineProperty(document, "activeElement", {
    value: el,
    configurable: true,
  });
  activeElementOverridden = true;
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
  if (activeElementOverridden) {
    // Delete the own property installed by setActiveElement to restore jsdom's
    // native activeElement getter for the next test. Reflect.deleteProperty
    // (rather than `delete`) keeps Biome's noDelete rule happy; assigning
    // `undefined` would NOT work — it leaves a static own property shadowing
    // the prototype getter.
    Reflect.deleteProperty(document, "activeElement");
    activeElementOverridden = false;
  }
});

describe("FocusTrapController pre-attach safety", () => {
  it("constructs without a container; all public methods are safe before attach", () => {
    const strategy: FocusTrapStrategy = {
      getElements: () => ({}),
      cycleOrder: ["content"],
    };
    const ctrl = new FocusTrapController(strategy);
    expect(ctrl.isTrapped).toBe(false);
    expect(() => ctrl.enterTrap()).not.toThrow();
    expect(ctrl.isTrapped).toBe(false); // no-op, no state change
    expect(() => ctrl.exitTrap()).not.toThrow();
    expect(() => ctrl.cycleToAdjacentSlot(1)).not.toThrow();
    expect(() => ctrl.setEnabled(true)).not.toThrow();
    expect(() => ctrl.setStrategy(strategy)).not.toThrow();
    expect(() => ctrl.destroy()).not.toThrow(); // destroy works pre-attach
  });
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
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
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
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
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
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
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
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
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
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();

    // First slot in cycleOrder is the toolbar (tabWithinSlots), which has
    // only tabindex=-1 buttons. Should still focus btn1 via the fallback.
    expect(btn1.focus).toHaveBeenCalled();
  });

  it("Tab from a portaled external element advances from externalElementsSlot", () => {
    // External (portaled) toolbar: the trap reaches into a DOM region outside
    // the container via getExternalElements. The strategy declares which slot
    // those externals belong to via externalElementsSlot, so Tab from a button
    // inside the portal advances from that slot, not from the first defined
    // slot in cycleOrder (the previous broken behavior).
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.append(title, content);
    const portalToolbar = document.createElement("div");
    const portalBtn = document.createElement("button");
    portalToolbar.appendChild(portalBtn);
    document.body.appendChild(portalToolbar);
    vi.spyOn(title, "focus");
    vi.spyOn(content, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, toolbar: undefined, content }),
      cycleOrder: ["title", "toolbar", "content"],
      getExternalElements: () => [portalToolbar],
      externalElementsSlot: "toolbar",
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();
    expect(title.focus).toHaveBeenCalled();

    // Focus is in the portal toolbar; Tab should advance toolbar -> content.
    setActiveElement(portalBtn);
    pressKey("Tab");
    expect(content.focus).toHaveBeenCalled();
  });

  it("Tab from a portaled external leaves slotIndex unchanged when externalElementsSlot is omitted", () => {
    // No externalElementsSlot declared: the trap has no information to map the
    // external to a slot, so it shouldn't guess. Tab continues to advance from
    // whatever slot the trap was last on.
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.append(title, content);
    const portal = document.createElement("div");
    const portalBtn = document.createElement("button");
    portal.appendChild(portalBtn);
    document.body.appendChild(portal);
    vi.spyOn(title, "focus");
    vi.spyOn(content, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      getExternalElements: () => [portal],
      // externalElementsSlot intentionally omitted
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();
    // Trap entered at title (slotIndex=0). Without externalElementsSlot, Tab
    // from the portal should treat the slot as still "title" and advance to
    // content, not jump back to title.
    expect(title.focus).toHaveBeenCalled();

    setActiveElement(portalBtn);
    pressKey("Tab");
    expect(content.focus).toHaveBeenCalled();
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
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();
    expect(controller.isTrapped).toBe(true);

    setActiveElement(title);
    pressKey("Escape");

    expect(controller.isTrapped).toBe(false);
    expect(onExit).toHaveBeenCalledOnce();
    expect(container.focus).toHaveBeenCalled();
  });

  it("exitTrap({ refocus: false }) releases without refocusing the container", () => {
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
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();
    expect(controller.isTrapped).toBe(true);

    // The host releases the trap because focus has legitimately left the
    // container (e.g. user clicked outside) — stealing focus back would be wrong.
    controller.exitTrap({ refocus: false });

    expect(controller.isTrapped).toBe(false);
    expect(onExit).toHaveBeenCalledOnce();
    expect(container.focus).not.toHaveBeenCalled();
  });

  it("exitTrap() still refocuses the container by default", () => {
    const container = makeContainer();
    vi.spyOn(container, "focus");
    const title = document.createElement("input");
    container.appendChild(title);
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title }),
      cycleOrder: ["title"],
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();
    controller.exitTrap();
    expect(container.focus).toHaveBeenCalled();
  });

  it("destroy removes listeners and cleans up", () => {
    const container = makeContainer();
    const strategy: FocusTrapStrategy = {
      getElements: () => ({}),
      cycleOrder: [],
    };
    const removeSpy = vi.spyOn(document, "removeEventListener");
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
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

  it("invokes tabHandlers for the current slot and skips slot advance when it returns 'handled'", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.appendChild(title);
    container.appendChild(content);
    vi.spyOn(title, "focus");
    vi.spyOn(content, "focus");

    const handler = vi.fn().mockReturnValue("handled");
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { title: handler },
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();
    expect(title.focus).toHaveBeenCalled();

    setActiveElement(title);
    const event = pressKey("Tab");

    expect(handler).toHaveBeenCalledWith(event, false);
    expect(content.focus).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("advances slot when tabHandlers returns 'exit'", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.appendChild(title);
    container.appendChild(content);
    vi.spyOn(content, "focus");

    const handler = vi.fn().mockReturnValue("exit");
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { title: handler },
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();

    setActiveElement(title);
    const event = pressKey("Tab");

    expect(handler).toHaveBeenCalledWith(event, false);
    expect(content.focus).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("falls back to tabWithinSlots when tabHandlers has no entry for the current slot", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.appendChild(title);
    container.appendChild(content);
    vi.spyOn(content, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: {
        /* none for title */
      },
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();

    setActiveElement(title);
    pressKey("Tab");

    expect(content.focus).toHaveBeenCalled();
  });

  it("invokes escapeHandlers for the current slot and skips exit when it returns 'handled'", () => {
    const container = makeContainer();
    const content = document.createElement("textarea");
    container.appendChild(content);
    const onExit = vi.fn();

    const handler = vi.fn().mockReturnValue("handled");
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content }),
      cycleOrder: ["content"],
      escapeHandlers: { content: handler },
      onExit,
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();

    setActiveElement(content);
    const event = pressKey("Escape");

    expect(handler).toHaveBeenCalledWith(event);
    expect(onExit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("exits trap when escapeHandlers returns 'exit'", () => {
    const container = makeContainer();
    const content = document.createElement("textarea");
    container.appendChild(content);
    const onExit = vi.fn();

    const handler = vi.fn().mockReturnValue("exit");
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content }),
      cycleOrder: ["content"],
      escapeHandlers: { content: handler },
      onExit,
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();

    setActiveElement(content);
    const event = pressKey("Escape");

    expect(handler).toHaveBeenCalledWith(event);
    expect(onExit).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("passes { entryMode } context to focusContent", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    const toolbar = document.createElement("button");
    container.appendChild(title);
    container.appendChild(content);
    container.appendChild(toolbar);
    vi.spyOn(title, "focus");
    vi.spyOn(toolbar, "focus");

    const focusContent = vi.fn().mockReturnValue(true);
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content, toolbar }),
      cycleOrder: ["title", "content", "toolbar"],
      focusContent,
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();
    // Forward entry into content from title:
    setActiveElement(title);
    pressKey("Tab");
    expect(focusContent).toHaveBeenLastCalledWith({
      entryMode: "forward",
      trigger: "sequentialNavigation",
      suppressHint: false,
    });

    // Reverse entry into content from toolbar:
    setActiveElement(toolbar);
    pressKey("Tab", { shiftKey: true });
    expect(focusContent).toHaveBeenLastCalledWith({
      entryMode: "reverse",
      trigger: "sequentialNavigation",
      suppressHint: false,
    });
  });

  it("does not mutate tabindex on a managed slot's element when setChildrenNonTabbable runs", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    content.setAttribute("tabindex", "5");
    container.appendChild(title);
    container.appendChild(content);

    const handler = vi.fn().mockReturnValue("exit");
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { content: handler },
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    // setEnabled(false) when not previously enabled triggers setChildrenNonTabbable
    controller.setEnabled(false);

    // The non-managed slot element gets tabindex=-1 ...
    expect(title.getAttribute("tabindex")).toBe("-1");
    // ... but the managed slot element keeps its original tabindex.
    expect(content.getAttribute("tabindex")).toBe("5");
  });

  it("does not mutate tabindex on descendants of a managed slot (preserves a roving pattern)", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("div");
    // Roving pattern inside the content slot: one cell tabbable, others not.
    const cellA = document.createElement("button");
    const cellB = document.createElement("button");
    const cellC = document.createElement("button");
    cellA.setAttribute("tabindex", "0");
    cellB.setAttribute("tabindex", "-1");
    cellC.setAttribute("tabindex", "-1");
    content.append(cellA, cellB, cellC);
    container.append(title, content);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { content: vi.fn().mockReturnValue("exit") },
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(false);

    expect(title.getAttribute("tabindex")).toBe("-1");
    // The roving pattern survives intact — none of the cells were touched.
    expect(cellA.getAttribute("tabindex")).toBe("0");
    expect(cellB.getAttribute("tabindex")).toBe("-1");
    expect(cellC.getAttribute("tabindex")).toBe("-1");
  });

  it("still mutates tabindex on non-managed slots when other slots are managed", () => {
    const container = makeContainer();
    const titleBtn = document.createElement("button");
    const content = document.createElement("textarea");
    container.append(titleBtn, content);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title: titleBtn, content }),
      cycleOrder: ["title", "content"],
      // Only `content` is managed; `title` should still be set non-tabbable.
      tabHandlers: { content: vi.fn().mockReturnValue("exit") },
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(false);

    expect(titleBtn.getAttribute("tabindex")).toBe("-1");
    // content is managed, so it should NOT have been touched (default no tabindex)
    expect(content.getAttribute("tabindex")).toBeNull();
  });

  it("mutates every focusable when the strategy has no tabHandlers (backwards compatibility)", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.append(title, content);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      // No tabHandlers field at all.
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(false);

    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(content.getAttribute("tabindex")).toBe("-1");
  });

  it("respects a managed slot element that appears between setChildrenNonTabbable calls", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    container.append(title);

    // The managed slot element is initially undefined (e.g. ref not yet attached
    // because the slot hasn't mounted). It will be assigned later.
    let contentEl: HTMLElement | undefined = undefined;

    const strategy: FocusTrapStrategy = {
      getElements: () => ({
        title,
        ...(contentEl ? { content: contentEl } : {}),
      }),
      cycleOrder: ["title", "content"],
      tabHandlers: { content: vi.fn().mockReturnValue("exit") },
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);

    // First call: content slot doesn't exist, so its descendants — none yet —
    // can't be skipped. (No assertion needed here; this just exercises the path.)
    controller.setEnabled(false);
    expect(title.getAttribute("tabindex")).toBe("-1");

    // Now mount the managed slot with a roving pattern child.
    const content = document.createElement("div");
    const cell = document.createElement("button");
    cell.setAttribute("tabindex", "0");
    content.append(cell);
    container.append(content);
    contentEl = content;

    // Second call: now content is registered, so its descendants are skipped.
    // Re-trigger setChildrenNonTabbable by toggling enabled state.
    controller.setEnabled(true);
    controller.setEnabled(false);

    // The previously-mutated `title` stays at -1 (already saved & set).
    expect(title.getAttribute("tabindex")).toBe("-1");
    // The newly-mounted managed cell is NOT touched.
    expect(cell.getAttribute("tabindex")).toBe("0");
  });
});

describe("FocusTrapController nativeTabSlots / cycleToAdjacentSlot", () => {
  it("skips preventDefault cycling INTO a nativeTabSlot", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const wrap = document.createElement("div");
    const before = document.createElement("div");
    const after = document.createElement("div");
    wrap.append(before, after);
    container.append(title, wrap);
    vi.spyOn(title, "focus");

    const focusContent = vi.fn().mockReturnValue(true);
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content: wrap }),
      cycleOrder: ["title", "content"],
      contentSlot: "content",
      nativeTabSlots: ["content"],
      focusContent,
      getNativeTabSlotSentinels: () => ({ before, after }),
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap(); // focus title

    setActiveElement(title);
    const e = pressKey("Tab");
    expect(focusContent).toHaveBeenCalledWith({
      entryMode: "forward",
      trigger: "sequentialNavigation",
      suppressHint: false,
    });
    expect(e.defaultPrevented).toBe(false);
  });

  it("enters a content slot in LANDING mode on enterTrap (programmatic, not positioner)", () => {
    const container = makeContainer();
    const wrap = document.createElement("div");
    const before = document.createElement("div");
    const after = document.createElement("div");
    wrap.append(before, after);
    container.append(wrap);

    const focusContent = vi.fn().mockReturnValue(true);
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content: wrap }),
      cycleOrder: ["content"],
      contentSlot: "content",
      nativeTabSlots: ["content"],
      focusContent,
      getNativeTabSlotSentinels: () => ({ before, after }),
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();

    // enterTrap is a programmatic entry (no pending Tab default), so entering a
    // content slot must use landing mode (trigger: "programmatic"), not positioner —
    // otherwise focus rests silently on the invisible sentinel with no hint.
    expect(focusContent).toHaveBeenCalledWith({
      entryMode: "forward",
      trigger: "programmatic",
      suppressHint: false,
    });
  });

  it("enterTrap({ suppressHint: true }) threads suppressHint to focusContent", () => {
    const container = makeContainer();
    const wrap = document.createElement("div");
    const before = document.createElement("div");
    const after = document.createElement("div");
    wrap.append(before, after);
    container.append(wrap);

    const focusContent = vi.fn().mockReturnValue(true);
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content: wrap }),
      cycleOrder: ["content"],
      contentSlot: "content",
      nativeTabSlots: ["content"],
      focusContent,
      getNativeTabSlotSentinels: () => ({ before, after }),
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap({ suppressHint: true });

    expect(focusContent).toHaveBeenCalledWith({
      entryMode: "forward",
      trigger: "programmatic",
      suppressHint: true,
    });
  });

  it("resting-sentinel: forward Tab on after-sentinel cycles", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const wrap = document.createElement("div");
    const before = document.createElement("div");
    const after = document.createElement("div");
    wrap.append(before, after);
    container.append(wrap, title);
    vi.spyOn(title, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content: wrap, title }),
      cycleOrder: ["content", "title"],
      contentSlot: "content",
      nativeTabSlots: ["content"],
      focusContent: () => true,
      getNativeTabSlotSentinels: () => ({ before, after }),
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap();

    setActiveElement(after);
    const e = pressKey("Tab");
    expect(e.defaultPrevented).toBe(true);
    expect(title.focus).toHaveBeenCalled();
  });

  it("cycleToAdjacentSlot advances and wraps like a Tab cycle", () => {
    const container = makeContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.append(title, content);
    vi.spyOn(title, "focus");
    vi.spyOn(content, "focus");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
    };
    controller = new FocusTrapController(strategy);
    controller.containerRef(container);
    controller.setEnabled(true);
    controller.enterTrap(); // title, index 0

    controller.cycleToAdjacentSlot(1);
    expect(content.focus).toHaveBeenCalled();

    (title.focus as ReturnType<typeof vi.fn>).mockClear();
    controller.cycleToAdjacentSlot(1); // wrap to title
    expect(title.focus).toHaveBeenCalled();
  });
});

describe("FocusTrapController containerRef lifecycle", () => {
  it("engages when the container arrives after construction", () => {
    const container = document.createElement("div");
    container.tabIndex = -1;
    const slot = document.createElement("button");
    container.appendChild(slot);
    controller = new FocusTrapController({
      getElements: () => ({ content: slot }),
      cycleOrder: ["content"],
    });
    controller.setEnabled(true);
    controller.enterTrap(); // pre-attach: no-op
    expect(controller.isTrapped).toBe(false);
    document.body.appendChild(container);
    controller.containerRef(container); // container mounts
    controller.enterTrap();
    expect(controller.isTrapped).toBe(true);
    expect(document.activeElement).toBe(slot);
  });

  it("containerRef(null) tears down silently — no onExit", () => {
    const container = document.createElement("div");
    container.tabIndex = -1;
    const slot = document.createElement("button");
    container.appendChild(slot);
    document.body.appendChild(container);
    const onExit = vi.fn();
    controller = new FocusTrapController({
      getElements: () => ({ content: slot }),
      cycleOrder: ["content"],
      onExit,
    });
    controller.setEnabled(true);
    controller.containerRef(container);
    controller.enterTrap();
    expect(controller.isTrapped).toBe(true);
    controller.containerRef(null); // unmount
    expect(controller.isTrapped).toBe(false); // state accurate
    expect(onExit).not.toHaveBeenCalled(); // but NO onExit on unmount
  });

  it("swaps cleanly from one container to another", () => {
    const a = document.createElement("div");
    a.tabIndex = -1;
    const b = document.createElement("div");
    b.tabIndex = -1;
    const slotA = document.createElement("button");
    a.appendChild(slotA);
    const slotB = document.createElement("button");
    b.appendChild(slotB);
    document.body.append(a, b);
    controller = new FocusTrapController({
      getElements: () => ({ content: slotA }),
      cycleOrder: ["content"],
    });
    controller.setEnabled(true);
    controller.containerRef(a);
    controller.enterTrap();
    expect(document.activeElement).toBe(slotA);
    controller.containerRef(b); // detach A, attach B
    controller.setStrategy({
      getElements: () => ({ content: slotB }),
      cycleOrder: ["content"],
    });
    controller.enterTrap();
    expect(document.activeElement).toBe(slotB);
  });

  it("methods survive destructuring (bound)", () => {
    const container = document.createElement("div");
    container.tabIndex = -1;
    const slot = document.createElement("button");
    container.appendChild(slot);
    document.body.appendChild(container);
    controller = new FocusTrapController({
      getElements: () => ({ content: slot }),
      cycleOrder: ["content"],
    });
    controller.setEnabled(true);
    controller.containerRef(container);
    const { enterTrap } = controller; // destructured
    expect(() => enterTrap()).not.toThrow();
    expect(controller.isTrapped).toBe(true);
  });
});
