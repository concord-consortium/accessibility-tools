import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FocusTrapConfig, FocusTrapStrategy } from "./types";
import { useFocusTrap } from "./use-focus-trap";

function createContainer(): HTMLDivElement {
  const el = document.createElement("div");
  el.tabIndex = 0;
  document.body.appendChild(el);
  return el;
}

function createSlot(tag = "div"): HTMLElement {
  const el = document.createElement(tag);
  el.tabIndex = -1;
  document.body.appendChild(el);
  // jsdom doesn't implement focus by default for arbitrary elements
  vi.spyOn(el, "focus");
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

function makeStrategy(
  overrides: Partial<FocusTrapStrategy> = {},
): FocusTrapStrategy {
  const title = createSlot("input");
  const toolbar = createSlot();
  const content = createSlot("textarea");

  return {
    getElements: () => ({ title, toolbar, content }),
    cycleOrder: ["title", "toolbar", "content"],
    ...overrides,
  };
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

describe("useFocusTrap", () => {
  it("returns null when config is undefined", () => {
    const { result } = renderHook(() => useFocusTrap(undefined));
    expect(result.current).toBeNull();
  });

  it("returns trap state when config is provided", () => {
    const container = createContainer();
    const strategy = makeStrategy();
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.isTrapped).toBe(false);
  });

  it("enters trap on Enter key when container is focused", () => {
    const container = createContainer();
    const strategy = makeStrategy({
      onEnter: vi.fn(),
    });
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    // Simulate Enter on container
    Object.defineProperty(document, "activeElement", {
      value: container,
      configurable: true,
    });

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    expect(result.current?.isTrapped).toBe(true);
    expect(strategy.onEnter).toHaveBeenCalledOnce();
  });

  it("focuses first available slot on enter", () => {
    const container = createContainer();
    const title = createSlot("input");
    const content = createSlot("textarea");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    expect(title.focus).toHaveBeenCalled();
  });

  it("skips undefined slots on enter", () => {
    const container = createContainer();
    const content = createSlot("textarea");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title: undefined, content }),
      cycleOrder: ["title", "content"],
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    expect(content.focus).toHaveBeenCalled();
  });

  it("calls focusContent for content slot when provided", () => {
    const container = createContainer();
    const content = createSlot("textarea");
    const focusContent = vi.fn(() => true);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content }),
      cycleOrder: ["content"],
      focusContent,
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    expect(focusContent).toHaveBeenCalled();
    expect(content.focus).not.toHaveBeenCalled();
  });

  it("exits trap on Escape", () => {
    const container = createContainer();
    vi.spyOn(container, "focus");
    const onExit = vi.fn();
    const strategy = makeStrategy({ onExit });
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    // Enter the trap
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });
    expect(result.current?.isTrapped).toBe(true);

    // Make activeElement inside the container
    const title = strategy.getElements().title as HTMLElement;
    container.appendChild(title);

    Object.defineProperty(document, "activeElement", {
      value: title,
      configurable: true,
    });

    // Exit with Escape
    act(() => {
      pressKey("Escape");
    });

    expect(result.current?.isTrapped).toBe(false);
    expect(onExit).toHaveBeenCalledOnce();
    expect(container.focus).toHaveBeenCalled();
  });

  it("cycles through slots on Tab", () => {
    const container = createContainer();
    const title = createSlot("input");
    const toolbar = createSlot();
    const content = createSlot("textarea");

    // Put elements inside container for isInsideTrap check
    container.appendChild(title);
    container.appendChild(toolbar);
    container.appendChild(content);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, toolbar, content }),
      cycleOrder: ["title", "toolbar", "content"],
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    // Enter
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    // Title should be focused first
    expect(title.focus).toHaveBeenCalled();

    // Tab -> toolbar
    Object.defineProperty(document, "activeElement", {
      value: title,
      configurable: true,
    });

    act(() => pressKey("Tab"));
    expect(toolbar.focus).toHaveBeenCalled();

    // Tab -> content
    Object.defineProperty(document, "activeElement", {
      value: toolbar,
      configurable: true,
    });

    act(() => pressKey("Tab"));
    expect(content.focus).toHaveBeenCalled();

    // Tab -> wraps to title
    Object.defineProperty(document, "activeElement", {
      value: content,
      configurable: true,
    });

    act(() => pressKey("Tab"));
    // title.focus: 1 from enter + 1 from wrap = at least 2
    expect(
      (title.focus as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("cycles backward on Shift+Tab", () => {
    const container = createContainer();
    const title = createSlot("input");
    const content = createSlot("textarea");

    container.appendChild(title);
    container.appendChild(content);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    // Enter - focuses title
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    // Shift+Tab from title -> wraps to content
    Object.defineProperty(document, "activeElement", {
      value: title,
      configurable: true,
    });

    act(() => pressKey("Tab", { shiftKey: true }));
    expect(content.focus).toHaveBeenCalled();
  });

  it("enterTrap/exitTrap can be called programmatically", () => {
    const container = createContainer();
    const strategy = makeStrategy({
      onEnter: vi.fn(),
      onExit: vi.fn(),
    });
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    act(() => result.current?.enterTrap());
    expect(result.current?.isTrapped).toBe(true);
    expect(strategy.onEnter).toHaveBeenCalledOnce();

    act(() => result.current?.exitTrap());
    expect(result.current?.isTrapped).toBe(false);
    expect(strategy.onExit).toHaveBeenCalledOnce();
  });

  it("Tab navigates within slot when in tabWithinSlots", () => {
    const container = createContainer();
    const contentDiv = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.textContent = "Btn 1";
    vi.spyOn(btn1, "focus");
    const btn2 = document.createElement("button");
    btn2.textContent = "Btn 2";
    vi.spyOn(btn2, "focus");
    contentDiv.appendChild(btn1);
    contentDiv.appendChild(btn2);
    container.appendChild(contentDiv);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content: contentDiv }),
      cycleOrder: ["content"],
      tabWithinSlots: ["content"],
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    // Enter trap
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    // Focus first button
    Object.defineProperty(document, "activeElement", {
      value: btn1,
      configurable: true,
    });

    // Tab should move to btn2 within the slot
    act(() => pressKey("Tab"));
    expect(btn2.focus).toHaveBeenCalled();
  });

  it("Tab cycles to next slot at boundary of tabWithinSlots", () => {
    const container = createContainer();
    const titleInput = createSlot("input");
    const contentDiv = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.textContent = "Btn 1";
    contentDiv.appendChild(btn1);
    container.appendChild(titleInput);
    container.appendChild(contentDiv);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title: titleInput, content: contentDiv }),
      cycleOrder: ["title", "content"],
      tabWithinSlots: ["content"],
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    // Enter trap
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    // Navigate to content slot, then to btn1
    Object.defineProperty(document, "activeElement", {
      value: btn1,
      configurable: true,
    });

    // Tab at last focusable in content - should cycle to title
    act(() => pressKey("Tab"));
    expect(titleInput.focus).toHaveBeenCalled();
  });

  it("Shift+Tab navigates backward within tabWithinSlots", () => {
    const container = createContainer();
    const contentDiv = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.textContent = "Btn 1";
    vi.spyOn(btn1, "focus");
    const btn2 = document.createElement("button");
    btn2.textContent = "Btn 2";
    vi.spyOn(btn2, "focus");
    contentDiv.appendChild(btn1);
    contentDiv.appendChild(btn2);
    container.appendChild(contentDiv);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ content: contentDiv }),
      cycleOrder: ["content"],
      tabWithinSlots: ["content"],
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    // Enter trap
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    // Focus second button
    Object.defineProperty(document, "activeElement", {
      value: btn2,
      configurable: true,
    });

    // Shift+Tab should move to btn1
    act(() => pressKey("Tab", { shiftKey: true }));
    expect(btn1.focus).toHaveBeenCalled();
  });

  it("slots not in tabWithinSlots cycle immediately", () => {
    const container = createContainer();
    const titleInput = createSlot("input");
    const contentDiv = document.createElement("div");
    const btn1 = document.createElement("button");
    vi.spyOn(btn1, "focus");
    contentDiv.appendChild(btn1);
    container.appendChild(titleInput);
    container.appendChild(contentDiv);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title: titleInput, content: contentDiv }),
      cycleOrder: ["title", "content"],
      tabWithinSlots: ["content"], // title is NOT in the list
    };
    const ref = { current: container };

    renderHook(() => useFocusTrap({ containerRef: ref, strategy }));

    // Enter trap - focus lands on title
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", { value: container });
      document.dispatchEvent(event);
    });

    // On title, Tab should jump to content slot's first focusable (not tab within title)
    Object.defineProperty(document, "activeElement", {
      value: titleInput,
      configurable: true,
    });

    act(() => pressKey("Tab"));
    // Content is a tabWithinSlot, so first focusable child is focused
    expect(btn1.focus).toHaveBeenCalled();
  });

  it("invokes tabHandlers for the current slot and skips slot advance when it returns 'handled'", () => {
    const container = createContainer();
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
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    act(() => result.current?.enterTrap());
    expect(title.focus).toHaveBeenCalled();

    Object.defineProperty(document, "activeElement", {
      value: title,
      configurable: true,
    });

    const event = pressKey("Tab");

    expect(handler).toHaveBeenCalledWith(event, false);
    expect(content.focus).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("advances slot when tabHandlers returns 'exit'", () => {
    const container = createContainer();
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
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    act(() => result.current?.enterTrap());

    Object.defineProperty(document, "activeElement", {
      value: title,
      configurable: true,
    });

    const event = pressKey("Tab");

    expect(handler).toHaveBeenCalledWith(event, false);
    expect(content.focus).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("invokes escapeHandlers for the current slot and skips exit when it returns 'handled'", () => {
    const container = createContainer();
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
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    act(() => result.current?.enterTrap());

    Object.defineProperty(document, "activeElement", {
      value: content,
      configurable: true,
    });

    const event = pressKey("Escape");

    expect(handler).toHaveBeenCalledWith(event);
    expect(onExit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("exits trap when escapeHandlers returns 'exit'", () => {
    const container = createContainer();
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
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    act(() => result.current?.enterTrap());

    Object.defineProperty(document, "activeElement", {
      value: content,
      configurable: true,
    });

    let event: KeyboardEvent;
    act(() => {
      event = pressKey("Escape");
    });

    // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside act
    expect(handler).toHaveBeenCalledWith(event!);
    expect(onExit).toHaveBeenCalled();
    // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside act
    expect(event!.defaultPrevented).toBe(true);
  });

  it("re-derives slotIndex from current focus before dispatching tabHandlers", () => {
    // The trap enters at title (slotIndex=0). A click moves focus into content
    // (slotIndex remains stale at 0). On Tab, the content slot's tabHandler
    // should fire — not the title slot's handler.
    const container = createContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.appendChild(title);
    container.appendChild(content);

    const titleHandler = vi.fn().mockReturnValue("handled");
    const contentHandler = vi.fn().mockReturnValue("handled");
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { title: titleHandler, content: contentHandler },
    };
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    act(() => result.current?.enterTrap());

    // Click-style focus move into content while slotIndex stays at 0
    Object.defineProperty(document, "activeElement", {
      value: content,
      configurable: true,
    });

    pressKey("Tab");

    expect(contentHandler).toHaveBeenCalled();
    expect(titleHandler).not.toHaveBeenCalled();
  });

  it("re-derives slotIndex from current focus before dispatching escapeHandlers", () => {
    const container = createContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.appendChild(title);
    container.appendChild(content);

    const titleHandler = vi.fn().mockReturnValue("handled");
    const contentHandler = vi.fn().mockReturnValue("handled");
    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      escapeHandlers: { title: titleHandler, content: contentHandler },
    };
    const ref = { current: container };

    const { result } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    act(() => result.current?.enterTrap());

    Object.defineProperty(document, "activeElement", {
      value: content,
      configurable: true,
    });

    pressKey("Escape");

    expect(contentHandler).toHaveBeenCalled();
    expect(titleHandler).not.toHaveBeenCalled();
  });

  it("cleans up listener on unmount", () => {
    const container = createContainer();
    const strategy = makeStrategy();
    const ref = { current: container };

    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy }),
    );

    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      true,
    );
  });

  it("does not mutate tabindex on a managed slot's element when the trap mounts", () => {
    const container = createContainer();
    const title = createSlot("input");
    const content = createSlot("textarea");
    container.appendChild(title);
    container.appendChild(content);
    content.setAttribute("tabindex", "5");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { content: vi.fn().mockReturnValue("exit") },
    };
    const ref = { current: container };

    renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy, enabled: false }),
    );

    // The non-managed slot element gets tabindex=-1 from the mount-time
    // setChildrenNonTabbable call ...
    expect(title.getAttribute("tabindex")).toBe("-1");
    // ... but the managed slot element keeps its original tabindex.
    expect(content.getAttribute("tabindex")).toBe("5");
  });

  it("does not mutate tabindex on descendants of a managed slot (preserves a roving pattern)", () => {
    const container = createContainer();
    const title = createSlot("input");
    const content = createSlot();
    // Roving pattern inside the content slot.
    const cellA = document.createElement("button");
    const cellB = document.createElement("button");
    const cellC = document.createElement("button");
    cellA.setAttribute("tabindex", "0");
    cellB.setAttribute("tabindex", "-1");
    cellC.setAttribute("tabindex", "-1");
    content.append(cellA, cellB, cellC);
    // createSlot appends to document.body; re-parent into the trap container
    // so setChildrenNonTabbable's querySelectorAll actually visits these nodes.
    container.append(title, content);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { content: vi.fn().mockReturnValue("exit") },
    };
    const ref = { current: container };

    renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy, enabled: false }),
    );

    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(cellA.getAttribute("tabindex")).toBe("0");
    expect(cellB.getAttribute("tabindex")).toBe("-1");
    expect(cellC.getAttribute("tabindex")).toBe("-1");
  });

  it("still mutates tabindex on non-managed slots when other slots are managed", () => {
    const container = createContainer();
    const title = document.createElement("button");
    const content = createSlot("textarea");
    // Re-parent the managed slot into the container so the assertion below
    // (that its distinctive tabindex survives) is load-bearing -- otherwise
    // setChildrenNonTabbable's querySelectorAll never visits it.
    container.appendChild(title);
    container.appendChild(content);
    // Use a distinctive value (not -1) so we can tell the managed slot was
    // genuinely skipped, not just coincidentally already at -1.
    content.setAttribute("tabindex", "7");

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      tabHandlers: { content: vi.fn().mockReturnValue("exit") },
    };
    const ref = { current: container };

    renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy, enabled: false }),
    );

    // Non-managed slot is still mutated to -1.
    expect(title.getAttribute("tabindex")).toBe("-1");
    // Managed slot keeps its distinctive tabindex.
    expect(content.getAttribute("tabindex")).toBe("7");
  });

  it("mutates every focusable when the strategy has no tabHandlers (backwards compatibility)", () => {
    const container = createContainer();
    const title = document.createElement("input");
    const content = document.createElement("textarea");
    container.append(title, content);

    const strategy: FocusTrapStrategy = {
      getElements: () => ({ title, content }),
      cycleOrder: ["title", "content"],
      // No tabHandlers field at all.
    };
    const ref = { current: container };

    renderHook(() =>
      useFocusTrap({ containerRef: ref, strategy, enabled: false }),
    );

    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(content.getAttribute("tabindex")).toBe("-1");
  });

  it("respects a managed slot element that appears across re-renders", () => {
    const container = createContainer();
    const title = document.createElement("input");
    container.append(title);

    // The managed slot element starts as undefined and gets assigned later.
    let contentEl: HTMLElement | undefined = undefined;
    const getElements = () => ({
      title,
      ...(contentEl ? { content: contentEl } : {}),
    });
    const tabHandlers = { content: vi.fn().mockReturnValue("exit") };

    const buildStrategy = (): FocusTrapStrategy => ({
      getElements,
      cycleOrder: ["title", "content"],
      tabHandlers,
    });

    const ref = { current: container };

    const { rerender } = renderHook(
      ({ strategy }: { strategy: FocusTrapStrategy }) =>
        useFocusTrap({ containerRef: ref, strategy, enabled: false }),
      { initialProps: { strategy: buildStrategy() } },
    );

    expect(title.getAttribute("tabindex")).toBe("-1");

    // Mount the managed slot with a roving pattern child.
    const content = document.createElement("div");
    const cell = document.createElement("button");
    cell.setAttribute("tabindex", "0");
    content.append(cell);
    container.append(content);
    contentEl = content;

    // Pass a fresh strategy reference so the useEffect dep changes and the
    // hook re-runs setChildrenNonTabbable.
    rerender({ strategy: buildStrategy() });

    // The newly-mounted managed cell is NOT touched.
    expect(cell.getAttribute("tabindex")).toBe("0");
  });
});
