import { useCallback, useEffect, useRef, useState } from "react";

export function FocusTrapSection() {
  const [trapped, setTrapped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!trapped || !containerRef.current) return;

      if (e.key === "Escape") {
        setTrapped(false);
        return;
      }

      if (e.key === "Tab") {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          "button, input, [tabindex]:not([tabindex='-1'])",
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [trapped],
  );

  useEffect(() => {
    if (trapped) {
      document.addEventListener("keydown", handleKeyDown, true);
      const first = containerRef.current?.querySelector<HTMLElement>(
        "button, input, [tabindex]:not([tabindex='-1'])",
      );
      first?.focus();
    }
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [trapped, handleKeyDown]);

  return (
    <section>
      <h2>Focus Trap</h2>

      <p>
        Manual focus trap implementation (no hooks). Click "Enter Trap" to
        activate, Escape to exit.
      </p>

      <button type="button" onClick={() => setTrapped(true)}>
        Enter Trap
      </button>

      <div
        ref={containerRef}
        style={{
          border: trapped ? "2px solid #2563eb" : "1px solid #ccc",
          padding: 12,
          marginTop: 8,
          background: trapped ? "#eff6ff" : "transparent",
        }}
      >
        <p>
          {trapped
            ? "Focus is trapped. Press Escape to exit."
            : "Trap inactive."}
        </p>
        <input type="text" placeholder="Input inside trap" />{" "}
        <button type="button" onClick={() => alert("Action 1")}>
          Action 1
        </button>{" "}
        <button type="button" onClick={() => alert("Action 2")}>
          Action 2
        </button>{" "}
        <button type="button" onClick={() => setTrapped(false)}>
          Exit Trap
        </button>
      </div>
    </section>
  );
}
