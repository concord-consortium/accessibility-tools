import { useRef } from "react";
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

export function KeyboardNavSection() {
  // --- Horizontal nav ---
  const hRef = useRef<HTMLDivElement>(null);
  const hNav = useKeyboardNav({
    containerRef: hRef,
    itemSelector: "[data-nav-item]",
    orientation: "horizontal",
    wrap: true,
    onSelect: (el) => alert(`Selected: ${el.textContent}`),
  });

  // --- Vertical nav ---
  const vRef = useRef<HTMLDivElement>(null);
  const vNav = useKeyboardNav({
    containerRef: vRef,
    itemSelector: "[role='option']",
    orientation: "vertical",
    wrap: true,
    focusRing: true,
    onSelect: (el) => alert(`Selected: ${el.textContent}`),
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
    </section>
  );
}
