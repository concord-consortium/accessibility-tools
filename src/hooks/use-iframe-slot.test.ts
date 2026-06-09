import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FocusTransport } from "./focus-messages";
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

  it("sentinel props expose a ref + stable key, never tabIndex/data-landing", () => {
    const { result } = renderSlot();
    const props = result.current.beforeSentinelProps;
    expect(props).toHaveProperty("ref");
    expect(props).toHaveProperty("key");
    expect(props).not.toHaveProperty("tabIndex");
    expect(props).not.toHaveProperty("data-landing");
  });

  it("focusContent via the fragment drives the underlying IframeSlot", () => {
    const { result, before } = renderSlot();
    vi.spyOn(before, "focus");
    act(() => {
      result.current.strategyFragment.focusContent?.({
        entryMode: "forward",
        viaKeydown: true,
      });
    });
    expect(before.focus).toHaveBeenCalled();
  });

  it("requestRestore is exposed", () => {
    const { result } = renderSlot();
    expect(typeof result.current.requestRestore).toBe("function");
  });
});
