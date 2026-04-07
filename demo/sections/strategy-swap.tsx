import { useCallback, useMemo, useRef, useState } from "react";
import type { FocusTrapStrategy } from "../../src/hooks";
import { useFocusTrap } from "../../src/hooks/use-focus-trap";

type StrategyPreset = "simple" | "full" | "custom-order" | "content-focus";

const presets: { id: StrategyPreset; label: string; description: string }[] = [
  {
    id: "simple",
    label: "Simple (content only)",
    description: "Single slot - Tab stays on one element.",
  },
  {
    id: "full",
    label: "Full (title + toolbar + content)",
    description: "Three slots - Tab cycles title, toolbar, content.",
  },
  {
    id: "custom-order",
    label: "Custom order (content + title)",
    description: "Reversed - content first, then title. No toolbar.",
  },
  {
    id: "content-focus",
    label: "Custom focusContent()",
    description: "Content slot uses focusContent() to select text on focus.",
  },
];

export function StrategySwapSection() {
  const [preset, setPreset] = useState<StrategyPreset>("full");
  const [log, setLog] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const addLog = useCallback(
    (msg: string) =>
      setLog((prev) =>
        [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev].slice(0, 10),
      ),
    [],
  );

  const strategy = useMemo<FocusTrapStrategy>(() => {
    switch (preset) {
      case "simple":
        return {
          getElements: () => ({
            content: contentRef.current ?? undefined,
          }),
          cycleOrder: ["content"],
          onEnter: () => addLog("Entered (simple)"),
          onExit: () => addLog("Exited (simple)"),
          announceEnter: "Simple trap: single content slot",
          announceExit: "Exited simple trap",
        };

      case "full":
        return {
          getElements: () => ({
            title: titleRef.current ?? undefined,
            toolbar: toolbarRef.current ?? undefined,
            content: contentRef.current ?? undefined,
          }),
          cycleOrder: ["title", "toolbar", "content"],
          onEnter: () => addLog("Entered (full: title, toolbar, content)"),
          onExit: () => addLog("Exited (full)"),
          announceEnter: "Full trap: Tab cycles title, toolbar, content",
          announceExit: "Exited full trap",
        };

      case "custom-order":
        return {
          getElements: () => ({
            content: contentRef.current ?? undefined,
            title: titleRef.current ?? undefined,
          }),
          cycleOrder: ["content", "title"],
          onEnter: () => addLog("Entered (custom order: content first)"),
          onExit: () => addLog("Exited (custom order)"),
          announceEnter: "Custom order trap: content first, then title",
          announceExit: "Exited custom order trap",
        };

      case "content-focus":
        return {
          getElements: () => ({
            title: titleRef.current ?? undefined,
            toolbar: toolbarRef.current ?? undefined,
            content: contentRef.current ?? undefined,
          }),
          cycleOrder: ["title", "toolbar", "content"],
          focusContent: () => {
            if (contentRef.current) {
              contentRef.current.focus();
              contentRef.current.select();
              addLog("focusContent() called - text selected");
              return true;
            }
            return false;
          },
          onEnter: () => addLog("Entered (with focusContent)"),
          onExit: () => addLog("Exited (with focusContent)"),
          announceEnter: "Trap with custom focus: content text auto-selects",
          announceExit: "Exited trap",
        };
    }
  }, [preset, addLog]);

  const trap = useFocusTrap({ containerRef, strategy });

  return (
    <section>
      <h2>Strategy Swap Demo</h2>

      <p>
        Switch between different <code>FocusTrapStrategy</code> implementations
        to see how the strategy pattern affects focus trap behavior. The same
        container and elements are reused - only the strategy changes.
      </p>

      {/* Strategy picker */}
      <h3>Choose a strategy</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPreset(p.id);
              addLog(`Switched to: ${p.label}`);
            }}
            style={{
              padding: "6px 12px",
              border: preset === p.id ? "2px solid #2563eb" : "1px solid #ccc",
              borderRadius: 4,
              background: preset === p.id ? "#eff6ff" : "white",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
        {presets.find((p) => p.id === preset)?.description}
      </p>

      {/* Focus trap container */}
      <h3>Container (Enter to trap, Escape to exit)</h3>
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label="Strategy swap demo"
        style={{
          border: trap?.isTrapped ? "2px solid #2563eb" : "1px solid #ccc",
          padding: 12,
          marginTop: 8,
          background: trap?.isTrapped ? "#eff6ff" : "transparent",
          borderRadius: 4,
          outline: "none",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: 13 }}>
          {trap?.isTrapped
            ? `Trapped (${preset}). Tab cycles through slots. Escape exits.`
            : "Focus this container and press Enter to enter the trap."}
        </p>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Title:{" "}
            <input
              ref={titleRef}
              type="text"
              placeholder="Title slot"
              style={{
                opacity: strategy.cycleOrder?.includes("title") ? 1 : 0.4,
              }}
            />
          </label>
          {!strategy.cycleOrder?.includes("title") && (
            <span style={{ fontSize: 10, color: "#999", marginLeft: 4 }}>
              (not in cycle)
            </span>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Toolbar: </span>
          <button
            ref={toolbarRef}
            type="button"
            style={{
              opacity: strategy.cycleOrder?.includes("toolbar") ? 1 : 0.4,
            }}
          >
            Action
          </button>
          {!strategy.cycleOrder?.includes("toolbar") && (
            <span style={{ fontSize: 10, color: "#999", marginLeft: 4 }}>
              (not in cycle)
            </span>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Content:
            <br />
            <textarea
              ref={contentRef}
              rows={2}
              defaultValue="Select me in focusContent mode"
              style={{
                width: "100%",
                boxSizing: "border-box",
                opacity: strategy.cycleOrder?.includes("content") ? 1 : 0.4,
              }}
            />
          </label>
        </div>
      </div>

      {/* Event log */}
      <h3>Event Log</h3>
      <div
        style={{
          marginTop: 4,
          padding: 8,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 4,
          fontSize: 11,
          fontFamily: "monospace",
          maxHeight: 120,
          overflow: "auto",
        }}
      >
        {log.length === 0 ? (
          <span style={{ color: "#999" }}>No events yet</span>
        ) : (
          log.map((entry, i) => (
            <div
              key={`${entry}-${log.length - i}`}
              style={{ padding: "1px 0" }}
            >
              {entry}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
