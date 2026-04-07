import { useRef, useState } from "react";
import { useSelectionAnnouncer } from "../../src/hooks/use-selection-announcer";

const fruits = [
  { id: "apple", label: "Apple", emoji: "🍎" },
  { id: "banana", label: "Banana", emoji: "🍌" },
  { id: "cherry", label: "Cherry", emoji: "🍒" },
  { id: "grape", label: "Grape", emoji: "🍇" },
  { id: "orange", label: "Orange", emoji: "🍊" },
  { id: "peach", label: "Peach", emoji: "🍑" },
];

export function SelectionAnnouncerSection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const announceRef = useRef<HTMLDivElement>(null);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Hook announces selection changes to screen readers
  useSelectionAnnouncer({
    selectedItems: selected,
    getLabel: (id) => {
      const fruit = fruits.find((f) => f.id === id);
      return fruit ? `${fruit.label} selected` : `${id} selected`;
    },
    multiSelectMessage: "{count} fruits selected",
    announceRef,
    debounceMs: 200,
  });

  return (
    <section>
      <h2>Selection Announcer</h2>

      <p>
        Uses <code>useSelectionAnnouncer</code> hook. Click items to
        select/deselect. Selection changes are announced to screen readers via
        an aria-live region. Multi-select is debounced to avoid rapid-fire
        announcements.
      </p>

      <h3>Click to select (multi-select)</h3>
      <div
        role="listbox"
        aria-label="Fruit picker"
        aria-multiselectable="true"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
      >
        {fruits.map((fruit) => {
          const isSelected = selected.has(fruit.id);
          return (
            <button
              key={fruit.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => toggleItem(fruit.id)}
              style={{
                padding: "8px 16px",
                border: isSelected ? "2px solid #2563eb" : "1px solid #ccc",
                borderRadius: 8,
                background: isSelected ? "#eff6ff" : "white",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{fruit.emoji}</span>
              <span>{fruit.label}</span>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "#666", marginTop: 8 }}>
        Selected:{" "}
        {selected.size === 0 ? "none" : Array.from(selected).join(", ")}
      </p>

      {/* Visible live region so you can see announcements */}
      <div
        style={{
          marginTop: 8,
          padding: 8,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 4,
          fontSize: 12,
          minHeight: 24,
        }}
      >
        <span style={{ color: "#666", marginRight: 4 }}>
          Last announcement:
        </span>
        <span
          ref={announceRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{ fontWeight: 500 }}
        />
      </div>
    </section>
  );
}
