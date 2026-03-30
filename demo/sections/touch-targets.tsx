export function TouchTargetsSection() {
  return (
    <section>
      <h2>Touch Target Size</h2>
      <h3 className="good">Good: Meets AAA (44x44px)</h3>
      <button type="button" style={{ width: 44, height: 44, fontSize: 16 }}>
        OK
      </button>{" "}
      <button
        type="button"
        style={{ minWidth: 44, minHeight: 44, padding: "10px 16px" }}
      >
        Large target
      </button>
      <h3 className="bad">Bad: Below AA (less than 24x24px)</h3>
      <button
        type="button"
        style={{ width: 16, height: 16, fontSize: 10, padding: 0 }}
      >
        x
      </button>{" "}
      <button
        type="button"
        style={{ width: 20, height: 20, fontSize: 10, padding: 0 }}
      >
        ×
      </button>
      <h3 className="bad">Bad: Borderline targets</h3>
      <button
        type="button"
        style={{ width: 24, height: 24, fontSize: 12, padding: 0 }}
      >
        24
      </button>{" "}
      <span style={{ fontSize: 12, color: "#666" }}>
        Exactly 24x24 - meets AA minimum but fails AAA
      </span>
    </section>
  );
}
