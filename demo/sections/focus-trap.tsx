import { useMemo, useRef, useState } from "react";
import type { FocusTrapStrategy } from "../../src/hooks";
import { useFocusTrap } from "../../src/hooks/use-focus-trap";

const containerStyle = (trapped: boolean, focused: boolean) => ({
  border: trapped
    ? "2px solid #2563eb"
    : focused
      ? "2px solid #60a5fa"
      : "1px solid #ccc",
  padding: 12,
  marginTop: 8,
  background: trapped ? "#eff6ff" : "transparent",
  borderRadius: 4,
  outline: "none",
  boxShadow: focused && !trapped ? "0 0 0 2px rgba(96, 165, 250, 0.3)" : "none",
});

export function FocusTrapSection() {
  const [simpleFocused, setSimpleFocused] = useState(false);
  const [multiFocused, setMultiFocused] = useState(false);

  // --- Simple trap: three focusable elements as slots ---
  const simpleRef = useRef<HTMLDivElement>(null);
  const simpleInputRef = useRef<HTMLInputElement>(null);
  const simpleBtn1Ref = useRef<HTMLButtonElement>(null);
  const simpleBtn2Ref = useRef<HTMLButtonElement>(null);

  const simpleStrategy = useMemo<FocusTrapStrategy>(
    () => ({
      getElements: () => ({
        input: simpleInputRef.current ?? undefined,
        action1: simpleBtn1Ref.current ?? undefined,
        action2: simpleBtn2Ref.current ?? undefined,
      }),
      cycleOrder: ["input", "action1", "action2"],
      announceEnter:
        "Entered simple focus trap. Tab to cycle between elements.",
      announceExit: "Exited simple focus trap",
    }),
    [],
  );

  const simpleTrap = useFocusTrap({
    containerRef: simpleRef,
    strategy: simpleStrategy,
  });

  // --- Multi-slot trap: title + toolbar buttons + content ---
  const multiRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const boldRef = useRef<HTMLButtonElement>(null);
  const italicRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const multiStrategy = useMemo<FocusTrapStrategy>(
    () => ({
      getElements: () => ({
        title: titleRef.current ?? undefined,
        bold: boldRef.current ?? undefined,
        italic: italicRef.current ?? undefined,
        link: linkRef.current ?? undefined,
        content: contentRef.current ?? undefined,
      }),
      cycleOrder: ["title", "bold", "italic", "link", "content"],
      announceEnter:
        "Entered multi-slot trap. Tab to cycle between title, toolbar buttons, and content.",
      announceExit: "Exited multi-slot trap",
    }),
    [],
  );

  const multiTrap = useFocusTrap({
    containerRef: multiRef,
    strategy: multiStrategy,
  });

  return (
    <section>
      <h2>Focus Trap</h2>

      <p>
        Uses <code>useFocusTrap</code> hook with the{" "}
        <code>FocusTrapStrategy</code> interface. Press Enter on a container to
        enter the trap, Tab/Shift+Tab to cycle through slots, Escape to exit.
        You can also click directly into any element to activate the trap.
      </p>

      {/* Simple trap */}
      <h3>Simple (three elements)</h3>
      <div
        ref={simpleRef}
        tabIndex={0}
        role="group"
        aria-label="Simple focus trap demo"
        onFocus={(e) => {
          if (e.target === simpleRef.current) setSimpleFocused(true);
        }}
        onBlur={(e) => {
          if (e.target === simpleRef.current) setSimpleFocused(false);
        }}
        style={containerStyle(simpleTrap?.isTrapped ?? false, simpleFocused)}
      >
        <p style={{ margin: "0 0 8px", fontSize: 13 }}>
          {simpleTrap?.isTrapped
            ? "Trapped. Tab cycles: input -> Action 1 -> Action 2. Escape exits."
            : "Focus this container and press Enter to enter the trap."}
        </p>
        <input
          ref={simpleInputRef}
          type="text"
          placeholder="Input inside trap"
        />{" "}
        <button
          ref={simpleBtn1Ref}
          type="button"
          onClick={() => alert("Action 1")}
        >
          Action 1
        </button>{" "}
        <button
          ref={simpleBtn2Ref}
          type="button"
          onClick={() => alert("Action 2")}
        >
          Action 2
        </button>
      </div>

      {/* Multi-slot trap */}
      <h3>Multi-slot (title + toolbar + content)</h3>
      <div
        ref={multiRef}
        tabIndex={0}
        role="group"
        aria-label="Multi-slot focus trap demo"
        onFocus={(e) => {
          if (e.target === multiRef.current) setMultiFocused(true);
        }}
        onBlur={(e) => {
          if (e.target === multiRef.current) setMultiFocused(false);
        }}
        style={containerStyle(multiTrap?.isTrapped ?? false, multiFocused)}
      >
        <p style={{ margin: "0 0 8px", fontSize: 13 }}>
          {multiTrap?.isTrapped
            ? "Trapped. Tab cycles: title -> toolbar -> content. Escape exits."
            : "Focus this container and press Enter to enter the trap."}
        </p>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Title slot:{" "}
            <input ref={titleRef} type="text" placeholder="Tile title" />
          </label>
        </div>

        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Toolbar slot: </span>
          <button ref={boldRef} type="button">
            Bold
          </button>{" "}
          <button ref={italicRef} type="button">
            Italic
          </button>{" "}
          <button ref={linkRef} type="button">
            Link
          </button>
        </div>

        <div style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Content slot:
            <br />
            <textarea
              ref={contentRef}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="Type content here..."
            />
          </label>
        </div>
      </div>
    </section>
  );
}
