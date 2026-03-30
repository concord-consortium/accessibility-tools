export function ImagesSection() {
  return (
    <section>
      <h2>Images</h2>

      <h3 className="good">Good: img with alt text</h3>
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60' fill='%2316a34a'%3E%3Crect width='80' height='60'/%3E%3Ctext x='10' y='35' fill='white' font-size='12'%3EPhoto%3C/text%3E%3C/svg%3E"
        alt="A green placeholder representing a photo"
      />

      <h3 className="good">Good: Decorative image (empty alt)</h3>
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='4' fill='%23ccc'%3E%3Crect width='40' height='4'/%3E%3C/svg%3E"
        alt=""
      />
      <span style={{ fontSize: 12, color: "#666" }}>
        {" "}
        decorative divider, alt=""
      </span>

      <h3 className="bad">Bad: img missing alt</h3>
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60' fill='%23dc2626'%3E%3Crect width='80' height='60'/%3E%3Ctext x='10' y='35' fill='white' font-size='12'%3ENo alt%3C/text%3E%3C/svg%3E" />

      <h3 className="bad">Bad: Generic alt text</h3>
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60' fill='%23f59e0b'%3E%3Crect width='80' height='60'/%3E%3C/svg%3E"
        alt="image"
      />

      <h3 className="good">Good: SVG with role="img" and aria-label</h3>
      <svg role="img" aria-label="Blue circle indicator" width="24" height="24">
        <circle cx="12" cy="12" r="10" fill="#2563eb" />
      </svg>

      <h3 className="bad">Bad: SVG without role or aria-label</h3>
      <svg width="24" height="24">
        <circle cx="12" cy="12" r="10" fill="#dc2626" />
      </svg>
    </section>
  );
}
