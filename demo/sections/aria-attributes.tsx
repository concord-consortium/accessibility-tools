export function AriaAttributesSection() {
  return (
    <section>
      <h2>ARIA Attributes</h2>
      <h3 className="good">Good: Correct ARIA usage</h3>
      <button type="button" aria-label="Close dialog">
        X
      </button>{" "}
      <div role="alert" aria-live="assertive">
        Important notification area
      </div>
      <nav aria-label="Main navigation">
        <a href="#home">Home</a> | <a href="#about">About</a>
      </nav>
      <input
        type="search"
        aria-label="Search the site"
        placeholder="Search..."
      />
      <h3 className="bad">Bad: aria-label on non-interactive without role</h3>
      <p aria-label="This label is ignored by screen readers">
        Paragraph with aria-label but no role (browsers ignore it)
      </p>
      <h3 className="bad">Bad: Invalid role value</h3>
      <div role="clickable">
        div with role="clickable" (not a valid WAI-ARIA role)
      </div>
      <h3 className="bad">Bad: aria-labelledby pointing to non-existent ID</h3>
      <input
        type="text"
        aria-labelledby="does-not-exist"
        placeholder="Labelled by missing ID"
      />
      <h3 className="bad">Bad: aria-hidden on focusable element</h3>
      <button type="button" aria-hidden="true">
        Hidden button (still focusable - creates invisible trap)
      </button>
    </section>
  );
}
