export function KeyboardHandlingSection() {
  return (
    <section>
      <h2>Keyboard Handling</h2>
      <h3 className="good">Good: Proper keyboard-operable controls</h3>
      <button type="button" onClick={() => alert("Button clicked")}>
        Native button (keyboard works)
      </button>{" "}
      <a
        href="#keyboard"
        onClick={(e) => {
          e.preventDefault();
          alert("Link activated");
        }}
      >
        Native link (keyboard works)
      </a>
      <h3 className="bad">Bad: onClick without onKeyDown</h3>
      <div
        role="button"
        tabIndex={0}
        onClick={() => alert("Clicked!")}
        style={{
          display: "inline-block",
          padding: "4px 8px",
          border: "1px solid #999",
          cursor: "pointer",
        }}
      >
        div role="button" with onClick but no onKeyDown
      </div>
      <h3 className="bad">Bad: div-button without keyboard activation</h3>
      <div
        onClick={() => alert("Clicked!")}
        style={{
          display: "inline-block",
          padding: "4px 8px",
          background: "#007bff",
          color: "white",
          cursor: "pointer",
          borderRadius: 4,
        }}
      >
        Styled div (looks like button, no keyboard support)
      </div>
      <h3 className="good">Good: Custom element with full keyboard support</h3>
      <div
        role="button"
        tabIndex={0}
        onClick={() => alert("Activated!")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            alert("Activated!");
          }
        }}
        style={{
          display: "inline-block",
          padding: "4px 8px",
          border: "1px solid #007bff",
          cursor: "pointer",
          borderRadius: 4,
        }}
      >
        Custom div-button with Enter/Space support
      </div>
    </section>
  );
}
