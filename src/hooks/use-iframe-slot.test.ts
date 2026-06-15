import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FocusTransport } from "./focus-messages";
import { createIframeSlotRegistry } from "./iframe-slot-registry";
import { useIframeSlot } from "./use-iframe-slot";

afterEach(() => {
  document.body.innerHTML = "";
});

function renderSlot(transport?: FocusTransport) {
  const iframe = document.createElement("iframe");
  const before = document.createElement("div");
  const after = document.createElement("div");
  document.body.append(before, iframe, after);

  const onExit = vi.fn();
  const hookResult = renderHook(() => {
    const iframeRef = useRef<HTMLIFrameElement | null>(iframe);
    const beforeRef = useRef<HTMLElement | null>(before);
    const afterRef = useRef<HTMLElement | null>(after);
    return useIframeSlot({
      slotName: "content",
      iframeRef,
      beforeSentinelRef: beforeRef,
      afterSentinelRef: afterRef,
      cycleOrder: ["content"],
      getElements: () => ({ content: iframe }),
      onExit,
      transport,
      enterLabel: "Press Tab to enter Sim",
    });
  });
  return { result: hookResult.result, iframe, before, after, onExit };
}

describe("useIframeSlot", () => {
  it("strategyFragment declares nativeTabSlots, contentSlot, focusContent", () => {
    const { result } = renderSlot();
    const frag = result.current.strategyFragment;
    expect(frag.nativeTabSlots).toEqual(["content"]);
    expect(frag.contentSlot).toBe("content");
    expect(typeof frag.focusContent).toBe("function");
    expect(typeof frag.getNativeTabSlotSentinels).toBe("function");
  });

  it("getNativeTabSlotSentinels returns the rendered sentinels", () => {
    const { result, before, after } = renderSlot();
    const sentinels =
      result.current.strategyFragment.getNativeTabSlotSentinels?.("content");
    expect(sentinels).toEqual({ before, after });
  });

  it("sentinel props expose a ref + stable key, never tabIndex/data-show-hint", () => {
    const { result } = renderSlot();
    const props = result.current.beforeSentinelProps;
    expect(props).toHaveProperty("ref");
    expect(props).toHaveProperty("key");
    expect(props).not.toHaveProperty("tabIndex");
    expect(props).not.toHaveProperty("data-show-hint");
  });

  it("focusContent via the fragment drives the underlying IframeSlot", () => {
    const { result, before } = renderSlot();
    vi.spyOn(before, "focus");
    act(() => {
      result.current.strategyFragment.focusContent?.({
        entryMode: "forward",
        trigger: "sequentialNavigation",
      });
    });
    expect(before.focus).toHaveBeenCalled();
  });

  it("requestRestore is exposed", () => {
    const { result } = renderSlot();
    expect(typeof result.current.requestRestore).toBe("function");
  });

  it("binds the sentinel exit when the sentinels mount after the slot (deferred)", () => {
    const iframe = document.createElement("iframe");
    const before = document.createElement("div");
    const after = document.createElement("div");
    document.body.append(before, iframe, after);
    const onExit = vi.fn();

    const { result } = renderHook(() => {
      const iframeRef = useRef<HTMLIFrameElement | null>(iframe);
      const beforeRef = useRef<HTMLElement | null>(null); // deferred
      const afterRef = useRef<HTMLElement | null>(null); // deferred
      return useIframeSlot({
        slotName: "content",
        iframeRef,
        beforeSentinelRef: beforeRef,
        afterSentinelRef: afterRef,
        cycleOrder: ["content"],
        getElements: () => ({ content: iframe }),
        onExit,
      });
    });

    // React attaches the deferred sentinel nodes — drive the returned callback refs.
    act(() => {
      result.current.beforeSentinelProps.ref(before);
      result.current.afterSentinelProps.ref(after);
    });

    act(() => iframe.dispatchEvent(new FocusEvent("focus"))); // inside = true
    act(() =>
      after.dispatchEvent(new FocusEvent("focusin", { bubbles: true })),
    );
    expect(onExit).toHaveBeenCalledWith(1);
  });

  it("re-binds when a sentinel node is replaced (unmount → remount)", () => {
    const iframe = document.createElement("iframe");
    const before1 = document.createElement("div");
    const after = document.createElement("div");
    document.body.append(before1, iframe, after);
    const onExit = vi.fn();

    const { result } = renderHook(() => {
      const iframeRef = useRef<HTMLIFrameElement | null>(iframe);
      const beforeRef = useRef<HTMLElement | null>(before1);
      const afterRef = useRef<HTMLElement | null>(after);
      return useIframeSlot({
        slotName: "content",
        iframeRef,
        beforeSentinelRef: beforeRef,
        afterSentinelRef: afterRef,
        cycleOrder: ["content"],
        getElements: () => ({ content: iframe }),
        onExit,
      });
    });
    const setBefore = result.current.beforeSentinelProps.ref;

    act(() => iframe.dispatchEvent(new FocusEvent("focus"))); // inside = true

    // The sentinel unmounts and a fresh node mounts in its place.
    const before2 = document.createElement("div");
    document.body.append(before2);
    act(() => {
      setBefore(null);
      setBefore(before2);
    });

    act(() =>
      before2.dispatchEvent(new FocusEvent("focusin", { bubbles: true })),
    );
    expect(onExit).toHaveBeenCalledWith(-1); // listener followed to the new node

    onExit.mockClear();
    act(() =>
      before1.dispatchEvent(new FocusEvent("focusin", { bubbles: true })),
    );
    expect(onExit).not.toHaveBeenCalled(); // old node is unwired
  });
});

describe("useIframeSlot multi-iframe (registry)", () => {
  function makeWrapper() {
    const wrapper = document.createElement("div");
    const before = document.createElement("div");
    const iframe = document.createElement("iframe");
    const after = document.createElement("div");
    wrapper.append(before, iframe, after);
    return { wrapper, before, iframe, after };
  }

  function renderOne(
    name: string,
    parts: ReturnType<typeof makeWrapper>,
    shared: {
      cycleOrder: string[];
      getElements: () => Record<string, HTMLElement | undefined>;
      registry: ReturnType<typeof createIframeSlotRegistry>;
    },
  ) {
    return renderHook(() => {
      const iframeRef = useRef<HTMLIFrameElement | null>(parts.iframe);
      const beforeRef = useRef<HTMLElement | null>(parts.before);
      const afterRef = useRef<HTMLElement | null>(parts.after);
      return useIframeSlot({
        slotName: name,
        iframeRef,
        beforeSentinelRef: beforeRef,
        afterSentinelRef: afterRef,
        cycleOrder: shared.cycleOrder,
        getElements: shared.getElements,
        onExit: vi.fn(),
        registry: shared.registry,
      });
    });
  }

  it("two adjacent enterable iframes do not intercept toward each other", () => {
    const a = makeWrapper();
    const b = makeWrapper();
    document.body.append(a.wrapper, b.wrapper); // a precedes b in DOM
    const shared = {
      cycleOrder: ["a", "b"],
      getElements: () => ({ a: a.wrapper, b: b.wrapper }),
      registry: createIframeSlotRegistry(),
    };
    renderOne("a", a, shared);
    renderOne("b", b, shared);

    act(() => a.iframe.dispatchEvent(new FocusEvent("focus")));
    expect(a.after.getAttribute("tabindex")).toBe("-1");
    expect(a.before.getAttribute("tabindex")).toBe("0");

    act(() => b.iframe.dispatchEvent(new FocusEvent("focus")));
    expect(b.before.getAttribute("tabindex")).toBe("-1");
    expect(b.after.getAttribute("tabindex")).toBe("0");
  });

  it("intercepts toward a locked (tabindex=-1) neighbor iframe", () => {
    const a = makeWrapper();
    const b = makeWrapper();
    b.iframe.setAttribute("tabindex", "-1"); // content-only / locked
    document.body.append(a.wrapper, b.wrapper);
    const shared = {
      cycleOrder: ["a", "b"],
      getElements: () => ({ a: a.wrapper, b: b.wrapper }),
      registry: createIframeSlotRegistry(),
    };
    renderOne("a", a, shared);
    renderOne("b", b, shared);

    act(() => a.iframe.dispatchEvent(new FocusEvent("focus")));
    expect(a.after.getAttribute("tabindex")).toBe("0"); // B not enterable
  });

  it("re-derives intercept when a neighbor iframe-slot unmounts", () => {
    const a = makeWrapper();
    const b = makeWrapper();
    document.body.append(a.wrapper, b.wrapper);
    const shared = {
      cycleOrder: ["a", "b"],
      getElements: () => ({ a: a.wrapper, b: b.wrapper }),
      registry: createIframeSlotRegistry(),
    };
    renderOne("a", a, shared);
    const bHook = renderOne("b", b, shared);

    act(() => a.iframe.dispatchEvent(new FocusEvent("focus")));
    expect(a.after.getAttribute("tabindex")).toBe("-1"); // native flow to B

    act(() => bHook.unmount()); // B leaves the registry
    expect(a.after.getAttribute("tabindex")).toBe("0"); // now intercept
  });
});
