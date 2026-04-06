import { useRef, useState } from "react";
import { useDropdown } from "../../src/hooks/use-dropdown";
import { useKeyboardNav } from "../../src/hooks/use-keyboard-nav";

const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];
const colors = [
  { name: "Red", hex: "#ef4444" },
  { name: "Orange", hex: "#f97316" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Green", hex: "#22c55e" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Violet", hex: "#8b5cf6" },
];

const sizes = ["Small", "Medium", "Large", "Extra Large"];

export function KeyboardNavSection() {
  // --- Dropdown ---
  const [selectedSize, setSelectedSize] = useState("Medium");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdown = useDropdown({
    triggerRef,
    listRef,
    itemSelector: "[role='option']",
    label: "Size picker",
    onSelect: (el) => setSelectedSize(el.textContent ?? ""),
  });
  // --- Horizontal nav ---
  const hRef = useRef<HTMLDivElement>(null);
  const hNav = useKeyboardNav({
    containerRef: hRef,
    itemSelector: "[data-nav-item]",
    orientation: "horizontal",
    wrap: true,
    focusRing: true,
    onSelect: () => {},
  });

  // --- Vertical nav ---
  const vRef = useRef<HTMLDivElement>(null);
  const vNav = useKeyboardNav({
    containerRef: vRef,
    itemSelector: "[role='option']",
    orientation: "vertical",
    wrap: true,
    focusRing: true,
    onSelect: () => {},
  });

  return (
    <section>
      <h2>Keyboard Navigation</h2>

      <p>
        Uses <code>useKeyboardNav</code> hook. Arrow keys navigate, Home/End
        jump to first/last, Enter/Space activates.
      </p>

      {/* Horizontal */}
      <h3>Horizontal (Left/Right arrows, wrap enabled)</h3>
      <div
        ref={hRef}
        onKeyDown={hNav?.handleKeyDown}
        style={{ display: "flex", gap: 4, marginTop: 8 }}
      >
        {colors.map((color, i) => (
          <button
            key={color.name}
            type="button"
            data-nav-item
            {...hNav?.getItemProps(i)}
            style={{
              padding: "6px 12px",
              border:
                hNav?.activeIndex === i
                  ? "2px solid #2563eb"
                  : "1px solid #ccc",
              borderRadius: 4,
              background: hNav?.activeIndex === i ? color.hex : "transparent",
              color: hNav?.activeIndex === i ? "white" : "inherit",
              cursor: "pointer",
            }}
          >
            {color.name}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
        Active: {hNav ? (colors[hNav.activeIndex]?.name ?? "none") : "none"}
      </p>

      {/* Vertical */}
      <h3>Vertical (Up/Down arrows, focusRing enabled)</h3>
      <div
        ref={vRef}
        role="listbox"
        aria-label="Fruit list"
        onKeyDown={vNav?.handleKeyDown}
        style={{ listStyle: "none", padding: 0, marginTop: 8 }}
      >
        {items.map((item, i) => (
          <div
            key={item}
            role="option"
            aria-selected={vNav?.activeIndex === i}
            {...vNav?.getItemProps(i)}
            style={{
              padding: "6px 12px",
              borderLeft:
                vNav?.activeIndex === i
                  ? "3px solid #2563eb"
                  : "3px solid transparent",
              background: vNav?.activeIndex === i ? "#eff6ff" : "transparent",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
        Active: {vNav ? (items[vNav.activeIndex] ?? "none") : "none"}
      </p>

      {/* Dropdown */}
      <h3>Dropdown (useDropdown hook)</h3>
      <p style={{ fontSize: 13 }}>
        Uses <code>useDropdown</code> hook. Enter/Space toggles, arrow keys
        navigate, Escape closes, click outside closes.
      </p>
      <div
        style={{ position: "relative", display: "inline-block", marginTop: 8 }}
      >
        <button
          ref={triggerRef}
          type="button"
          {...dropdown?.triggerProps}
          style={{
            padding: "6px 16px",
            border: "1px solid #ccc",
            borderRadius: 4,
            background: "white",
            cursor: "pointer",
            minWidth: 140,
            textAlign: "left",
          }}
        >
          {selectedSize} &#9662;
        </button>
        {dropdown?.isOpen && (
          <div
            ref={listRef}
            {...dropdown.listProps}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 2,
              border: "1px solid #ccc",
              borderRadius: 4,
              background: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              minWidth: 140,
              zIndex: 10,
              outline: "none",
            }}
          >
            {sizes.map((size, i) => (
              <div
                key={size}
                {...dropdown.getItemProps(i)}
                style={{
                  padding: "6px 12px",
                  cursor: "pointer",
                  background:
                    dropdown.activeIndex === i ? "#eff6ff" : "transparent",
                  fontWeight: size === selectedSize ? 600 : 400,
                  outline: "none",
                }}
              >
                {size}
              </div>
            ))}
          </div>
        )}
      </div>
      <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
        Selected: {selectedSize}
      </p>
    </section>
  );
}
