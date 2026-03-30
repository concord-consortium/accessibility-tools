export function LinksAndButtonsSection() {
  return (
    <section>
      <h2>Links &amp; Buttons</h2>
      <h3 className="good">Good: Descriptive accessible names</h3>
      <a href="#links-good">Read the accessibility guidelines</a>{" "}
      <button type="button">Save changes</button>{" "}
      <a href="#links-download">Download the 2024 annual report (PDF, 2.3MB)</a>
      <h3 className="bad">Bad: Empty accessible name</h3>
      <a href="#empty-link">{/* empty */}</a>{" "}
      <button type="button">{/* empty */}</button>
      <h3 className="bad">Bad: Generic text</h3>
      <p>
        For more information, <a href="#generic-1">click here</a>. To learn
        more, <a href="#generic-2">read more</a>. <a href="#generic-3">link</a>{" "}
        <button type="button">submit</button>
      </p>
      <h3 className="bad">Bad: Duplicate link text, different destinations</h3>
      <a href="#product-a">View details</a>{" "}
      <a href="#product-b">View details</a>{" "}
      <a href="#product-c">View details</a>
      <p style={{ fontSize: 12, color: "#666" }}>
        Three "View details" links going to different pages
      </p>
      <h3 className="bad">Bad: Icon-only buttons without aria-label</h3>
      <button type="button">🗑</button> <button type="button">✏️</button>{" "}
      <button type="button">⬇</button>
      <h3 className="good">Good: Icon button with aria-label</h3>
      <button type="button" aria-label="Delete item">
        🗑
      </button>{" "}
      <button type="button" aria-label="Edit item">
        ✏️
      </button>
    </section>
  );
}
