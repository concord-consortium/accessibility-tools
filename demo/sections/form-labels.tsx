export function FormLabelsSection() {
  return (
    <section>
      <h2>Form Labels</h2>

      <h3 className="good">Good: Label via for/id</h3>
      <div>
        <label htmlFor="email-input">Email address</label>
        <br />
        <input type="email" id="email-input" />
      </div>

      <h3 className="good">Good: Wrapping label</h3>
      <label>
        Full name
        <br />
        <input type="text" />
      </label>

      <h3 className="good">Good: aria-label fallback</h3>
      <input
        type="search"
        aria-label="Search products"
        placeholder="Search..."
      />

      <h3 className="bad">Bad: No label at all</h3>
      <input type="text" />

      <h3 className="bad">Bad: Placeholder-only (no real label)</h3>
      <input type="text" placeholder="Enter your name" />
      <p style={{ fontSize: 12, color: "#666" }}>
        Placeholder disappears on focus - not a substitute for a label.
      </p>

      <h3 className="bad">Bad: Unlabeled select</h3>
      <select>
        <option>Choose one...</option>
        <option>Red</option>
        <option>Blue</option>
      </select>

      <h3 className="bad">Bad: Unlabeled textarea</h3>
      <textarea rows={2} />
    </section>
  );
}
