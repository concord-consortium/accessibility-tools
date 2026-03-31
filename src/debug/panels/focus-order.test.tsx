import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as focusStream from "../utils/focus-stream";
import { FocusOrderPanel } from "./focus-order";

let subscribers: Array<(event: focusStream.A11yFocusEvent) => void> = [];

beforeEach(() => {
  subscribers = [];
  vi.spyOn(focusStream, "subscribeFocus").mockImplementation((cb) => {
    subscribers.push(cb);
    return () => {
      subscribers = subscribers.filter((s) => s !== cb);
    };
  });
  Element.prototype.scrollIntoView = () => {};
  // Mock clipboard
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function dispatch(element: Element, timestamp: number) {
  for (const sub of subscribers) {
    sub({ element, previousElement: null, timestamp });
  }
}

describe("FocusOrderPanel", () => {
  it("shows empty state with Record button", () => {
    render(<FocusOrderPanel />);
    expect(screen.getByText("Record")).toBeTruthy();
    expect(screen.getByText(/click.*record/i)).toBeTruthy();
  });

  it("subscribes to focus events when recording starts", () => {
    render(<FocusOrderPanel />);
    expect(subscribers).toHaveLength(0);

    const recordBtn = screen.getByText("Record");
    act(() => {
      recordBtn.click();
    });

    expect(subscribers).toHaveLength(1);
  });

  it("shows Stop button while recording", () => {
    render(<FocusOrderPanel />);

    act(() => {
      screen.getByText("Record").click();
    });

    expect(screen.getByText("Stop")).toBeTruthy();
    expect(screen.getByText(/recording/i)).toBeTruthy();
  });

  it("records focus events", () => {
    render(<FocusOrderPanel />);
    const btn1 = document.createElement("button");
    btn1.id = "first";
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      screen.getByText("Record").click();
    });

    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
    });

    expect(screen.getByText(/2 event/)).toBeTruthy();
  });

  it("stops recording and keeps entries", () => {
    render(<FocusOrderPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      screen.getByText("Record").click();
    });
    act(() => {
      dispatch(btn, 1000);
    });
    act(() => {
      screen.getByText("Stop").click();
    });

    expect(screen.getByText("Record")).toBeTruthy();
    expect(screen.getByText(/1 step recorded/)).toBeTruthy();
    expect(subscribers).toHaveLength(0);
  });

  it("clear button removes entries and stops recording", () => {
    render(<FocusOrderPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      screen.getByText("Record").click();
    });
    act(() => {
      dispatch(btn, 1000);
    });
    act(() => {
      screen.getByText("Clear").click();
    });

    expect(screen.getByText("Record")).toBeTruthy();
    expect(screen.getByText(/click.*record/i)).toBeTruthy();
  });

  it("shows step numbers in the list", () => {
    render(<FocusOrderPanel />);
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("input");
    document.body.appendChild(btn1);
    document.body.appendChild(btn2);

    act(() => {
      screen.getByText("Record").click();
    });
    act(() => {
      dispatch(btn1, 1000);
      dispatch(btn2, 1100);
    });
    act(() => {
      screen.getByText("Stop").click();
    });

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("export button is disabled when no entries", () => {
    render(<FocusOrderPanel />);
    const exportBtn = screen.getByLabelText("Export as markdown to clipboard");
    expect(exportBtn.hasAttribute("disabled")).toBe(true);
  });

  it("export copies markdown to clipboard", async () => {
    render(<FocusOrderPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      screen.getByText("Record").click();
    });
    act(() => {
      dispatch(btn, 1000);
    });
    act(() => {
      screen.getByText("Stop").click();
    });

    await act(async () => {
      screen.getByLabelText("Export as markdown to clipboard").click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    const md = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(md).toContain("## Focus Order Recording");
    expect(md).toContain("| # | Element | Component | Time |");
  });

  it("JSON export copies JSON to clipboard", async () => {
    render(<FocusOrderPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    act(() => {
      screen.getByText("Record").click();
    });
    act(() => {
      dispatch(btn, 1000);
    });
    act(() => {
      screen.getByText("Stop").click();
    });

    await act(async () => {
      screen.getByLabelText("Export as JSON to clipboard").click();
    });

    const calls = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>)
      .mock.calls;
    const json = calls[calls.length - 1][0] as string;
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("focus-order-recording");
    expect(parsed.events).toHaveLength(1);
  });

  it("clears previous entries when starting a new recording", () => {
    render(<FocusOrderPanel />);
    const btn = document.createElement("button");
    document.body.appendChild(btn);

    // First recording
    act(() => {
      screen.getByText("Record").click();
    });
    act(() => {
      dispatch(btn, 1000);
      dispatch(btn, 1100);
    });
    act(() => {
      screen.getByText("Stop").click();
    });

    expect(screen.getByText(/2 steps recorded/)).toBeTruthy();

    // Start new recording - should clear
    act(() => {
      screen.getByText("Record").click();
    });

    // Before any new events, should show 0
    expect(screen.getByText(/0 events/)).toBeTruthy();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = render(<FocusOrderPanel />);

    act(() => {
      screen.getByText("Record").click();
    });
    expect(subscribers).toHaveLength(1);

    unmount();
    expect(subscribers).toHaveLength(0);
  });
});
