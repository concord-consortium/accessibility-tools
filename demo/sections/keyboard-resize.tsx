import { useState } from "react";
import { useKeyboardResize } from "../../src/hooks/use-keyboard-resize";

export function KeyboardResizeSection() {
  // --- Horizontal resize ---
  const [hWidth, setHWidth] = useState(200);
  const hResize = useKeyboardResize({
    orientation: "horizontal",
    value: hWidth,
    min: 100,
    max: 400,
    step: 10,
    largeStep: 50,
    onResize: setHWidth,
    label: "Resize panel width",
    role: "separator",
  });

  // --- Vertical resize ---
  const [vHeight, setVHeight] = useState(100);
  const vResize = useKeyboardResize({
    orientation: "vertical",
    value: vHeight,
    min: 50,
    max: 200,
    step: 5,
    largeStep: 25,
    onResize: setVHeight,
    label: "Resize panel height",
    role: "separator",
  });

  return (
    <section>
      <h2>Keyboard Resize</h2>

      <p>
        Uses <code>useKeyboardResize</code> hook. Focus the handle and use arrow
        keys to resize. Hold Shift for larger steps. Home/End jump to min/max.
        These demos use <code>role="separator"</code> since the handles divide
        two panels. For standalone resize handles (e.g., tile resize), use a
        button element and omit the role.
      </p>

      {/* Horizontal */}
      <h3>Horizontal (Left/Right arrows)</h3>
      <div style={{ display: "flex", alignItems: "stretch", marginTop: 8 }}>
        <div
          style={{
            width: hWidth,
            minHeight: 80,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "4px 0 0 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          {hWidth}px
        </div>
        <div
          {...hResize?.resizeHandleProps}
          style={{
            width: 8,
            background: "#2563eb",
            cursor: "col-resize",
            flexShrink: 0,
            outline: "none",
            borderRadius: 0,
            transition: "background 0.1s",
          }}
          onFocus={(e) => {
            (e.target as HTMLElement).style.background = "#1d4ed8";
            (e.target as HTMLElement).style.boxShadow =
              "0 0 0 2px rgba(37, 99, 235, 0.4)";
          }}
          onBlur={(e) => {
            (e.target as HTMLElement).style.background = "#2563eb";
            (e.target as HTMLElement).style.boxShadow = "none";
          }}
        />
        <div
          style={{
            flex: 1,
            minHeight: 80,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "0 4px 4px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#666",
          }}
        >
          remaining space
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
        Width: {hWidth}px (min: 100, max: 400, step: 10, Shift+step: 50)
      </p>

      {/* Vertical */}
      <h3>Vertical (Up/Down arrows)</h3>
      <div style={{ marginTop: 8 }}>
        <div
          style={{
            height: vHeight,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "4px 4px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          {vHeight}px
        </div>
        <div
          {...vResize?.resizeHandleProps}
          style={{
            height: 8,
            background: "#2563eb",
            cursor: "row-resize",
            outline: "none",
            transition: "background 0.1s",
          }}
          onFocus={(e) => {
            (e.target as HTMLElement).style.background = "#1d4ed8";
            (e.target as HTMLElement).style.boxShadow =
              "0 0 0 2px rgba(37, 99, 235, 0.4)";
          }}
          onBlur={(e) => {
            (e.target as HTMLElement).style.background = "#2563eb";
            (e.target as HTMLElement).style.boxShadow = "none";
          }}
        />
        <div
          style={{
            height: 60,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "0 0 4px 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#666",
          }}
        >
          fixed content below
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
        Height: {vHeight}px (min: 50, max: 200, step: 5, Shift+step: 25)
      </p>
    </section>
  );
}
