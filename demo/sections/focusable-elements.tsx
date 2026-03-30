export function FocusableElementsSection() {
  return (
    <section>
      <h2>Focusable Elements</h2>
      <h3 className="good">Good: Proper focusable elements</h3>
      <button type="button">Native button</button>{" "}
      <a href="#focusable">Native link</a>{" "}
      <input type="text" placeholder="Native input" />{" "}
      <select>
        <option>Option 1</option>
        <option>Option 2</option>
      </select>{" "}
      <textarea rows={2} placeholder="Native textarea" />{" "}
      <div
        tabIndex={0}
        style={{
          display: "inline-block",
          padding: "4px 8px",
          border: "1px solid #999",
        }}
      >
        div with tabIndex=0
      </div>
      <h3 className="bad">Bad: Non-focusable interactives</h3>
      {/* eslint-disable-next-line -- intentional a11y violation */}
      <div
        onClick={() => alert("clicked")}
        style={{
          cursor: "pointer",
          color: "blue",
          textDecoration: "underline",
        }}
      >
        Clickable div (no tabIndex, no role)
      </div>{" "}
      <span
        onClick={() => alert("clicked")}
        style={{ cursor: "pointer", color: "blue" }}
      >
        Clickable span (no tabIndex)
      </span>
      <h3 className="bad">Bad: Positive tabIndex (disrupts tab order)</h3>
      <input type="text" tabIndex={5} placeholder="tabIndex=5 (bad)" />{" "}
      <input type="text" tabIndex={10} placeholder="tabIndex=10 (bad)" />
      <h3 className="good">Good: Programmatically focusable (tabIndex=-1)</h3>
      <div
        tabIndex={-1}
        style={{
          padding: "4px 8px",
          border: "1px dashed #999",
          display: "inline-block",
        }}
      >
        div with tabIndex=-1 (not in tab order, focusable via JS)
      </div>
    </section>
  );
}
