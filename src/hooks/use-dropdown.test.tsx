import { act, fireEvent, render, screen } from "@testing-library/react";
import React, { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDropdown } from "./use-dropdown";

function TestDropdown({
  onSelect,
  disabled,
  label,
}: {
  onSelect?: (el: HTMLElement, index: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dropdown = useDropdown({
    triggerRef,
    listRef,
    itemSelector: ".item",
    onSelect,
    disabled,
    label,
  });

  if (!dropdown) return null;

  return (
    <div>
      <div ref={triggerRef} data-testid="trigger" {...dropdown.triggerProps}>
        Select
      </div>
      {dropdown.isOpen && (
        <div ref={listRef} data-testid="list" {...dropdown.listProps}>
          <div
            className="item"
            data-testid="item-0"
            {...dropdown.getItemProps(0)}
          >
            Alpha
          </div>
          <div
            className="item"
            data-testid="item-1"
            {...dropdown.getItemProps(1)}
          >
            Beta
          </div>
          <div
            className="item"
            data-testid="item-2"
            {...dropdown.getItemProps(2)}
          >
            Gamma
          </div>
        </div>
      )}
    </div>
  );
}

describe("useDropdown", () => {
  it("renders trigger with correct ARIA props", () => {
    render(<TestDropdown label="Pick one" />);
    const trigger = screen.getByTestId("trigger");

    expect(trigger.getAttribute("role")).toBe("button");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("tabindex")).toBe("0");
  });

  it("opens on Enter key", () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    expect(screen.queryByTestId("list")).toBeNull();
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getByTestId("list")).toBeTruthy();
  });

  it("opens on Space key", () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.keyDown(trigger, { key: " " });
    expect(screen.getByTestId("list")).toBeTruthy();
  });

  it("opens on click", () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    expect(screen.getByTestId("list")).toBeTruthy();
  });

  it("opens on ArrowDown and does not close again", () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByTestId("list")).toBeTruthy();
  });

  it("closes on Escape and returns focus to trigger", () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    expect(screen.getByTestId("list")).toBeTruthy();

    const list = screen.getByTestId("list");
    fireEvent.keyDown(list, { key: "Escape" });
    expect(screen.queryByTestId("list")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape from trigger when open", () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    expect(screen.getByTestId("list")).toBeTruthy();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("navigates items with ArrowDown/ArrowUp", async () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    const list = screen.getByTestId("list");

    // Wait for requestAnimationFrame to focus first item
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // ArrowDown moves to next item
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(screen.getByTestId("item-1").getAttribute("aria-selected")).toBe(
      "true",
    );

    // ArrowDown again
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(screen.getByTestId("item-2").getAttribute("aria-selected")).toBe(
      "true",
    );

    // ArrowDown wraps to first
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(screen.getByTestId("item-0").getAttribute("aria-selected")).toBe(
      "true",
    );

    // ArrowUp wraps to last
    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(screen.getByTestId("item-2").getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("Home/End jump to first/last item", async () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    const list = screen.getByTestId("list");

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.keyDown(list, { key: "End" });
    expect(screen.getByTestId("item-2").getAttribute("aria-selected")).toBe(
      "true",
    );

    fireEvent.keyDown(list, { key: "Home" });
    expect(screen.getByTestId("item-0").getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("Enter on item calls onSelect and closes", async () => {
    const onSelect = vi.fn();
    render(<TestDropdown onSelect={onSelect} />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    const list = screen.getByTestId("list");

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // Move to second item and select
    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][1]).toBe(1); // index 1
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("clicking an item calls onSelect and closes", async () => {
    const onSelect = vi.fn();
    render(<TestDropdown onSelect={onSelect} />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.click(screen.getByTestId("item-1"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][1]).toBe(1);
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("does not open when disabled", () => {
    render(<TestDropdown disabled />);
    const trigger = screen.getByTestId("trigger");

    expect(trigger.getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.queryByTestId("list")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("list has listbox role and aria-label", () => {
    render(<TestDropdown label="Pick a letter" />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    const list = screen.getByTestId("list");

    expect(list.getAttribute("role")).toBe("listbox");
    expect(list.getAttribute("aria-label")).toBe("Pick a letter");
  });

  it("items have option role", () => {
    render(<TestDropdown />);
    fireEvent.click(screen.getByTestId("trigger"));

    expect(screen.getByTestId("item-0").getAttribute("role")).toBe("option");
    expect(screen.getByTestId("item-1").getAttribute("role")).toBe("option");
    expect(screen.getByTestId("item-2").getAttribute("role")).toBe("option");
  });

  it("Tab closes the list without preventing default", async () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    const list = screen.getByTestId("list");

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.keyDown(list, { key: "Tab" });
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("aria-selected only appears on active item", async () => {
    render(<TestDropdown />);
    fireEvent.click(screen.getByTestId("trigger"));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // First item is active
    expect(screen.getByTestId("item-0").getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByTestId("item-1").hasAttribute("aria-selected")).toBe(
      false,
    );
    expect(screen.getByTestId("item-2").hasAttribute("aria-selected")).toBe(
      false,
    );
  });

  it("toggle closes when already open", () => {
    render(<TestDropdown />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    expect(screen.getByTestId("list")).toBeTruthy();

    fireEvent.click(trigger);
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("returns null when config is undefined", () => {
    function NullHarness() {
      const result = useDropdown(undefined);
      return (
        <div data-testid="result">{result === null ? "null" : "not null"}</div>
      );
    }
    render(<NullHarness />);
    expect(screen.getByTestId("result").textContent).toBe("null");
  });
});
