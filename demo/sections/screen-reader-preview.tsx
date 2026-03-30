export function ScreenReaderPreviewSection() {
  return (
    <section>
      <h2>Screen Reader Preview</h2>
      <h3 className="good">Good: Elements with computed accessible names</h3>
      <button type="button">Submit form</button>{" "}
      <a href="#sr-preview">Learn more about accessibility</a>{" "}
      <input type="text" aria-label="Username" placeholder="username" />
      <h3 className="good">
        Good: Complex computed name (aria-labelledby chain)
      </h3>
      <span id="sr-label-prefix">Current</span>{" "}
      <span id="sr-label-value">Temperature</span>
      <div aria-labelledby="sr-label-prefix sr-label-value" role="status">
        72°F
      </div>
      <h3 className="bad">Bad: Empty accessible name</h3>
      <button type="button">{/* empty button */}</button>{" "}
      <a href="#nowhere">{/* empty link */}</a> <input type="text" />
      <h3 className="bad">Bad: Icon-only without aria-label</h3>
      <button type="button" style={{ fontSize: 20 }}>
        ✕
      </button>{" "}
      <button type="button" style={{ fontSize: 20 }}>
        ☰
      </button>
    </section>
  );
}
