export function DuplicateIdsSection() {
  return (
    <section>
      <h2>Duplicate IDs</h2>

      <h3 className="bad">Bad: Multiple elements sharing the same ID</h3>
      <label htmlFor="dupe-name">Name</label>
      <br />
      <input type="text" id="dupe-name" placeholder="First instance" />
      <br />
      <input
        type="text"
        id="dupe-name"
        placeholder="Second instance (same ID!)"
      />
      <p style={{ fontSize: 12, color: "#666" }}>
        The label points to "dupe-name" but only the first element receives the
        association.
      </p>

      <h3 className="bad">Bad: aria-labelledby pointing to duplicated ID</h3>
      <span id="dupe-label">Shared label</span>
      <br />
      <input
        type="text"
        aria-labelledby="dupe-label"
        placeholder="Uses aria-labelledby"
      />
      <br />
      <span id="dupe-label">
        Another element with same ID (silently ignored)
      </span>

      <h3 className="good">Good: Unique IDs</h3>
      <label htmlFor="unique-email">Email</label>
      <br />
      <input
        type="email"
        id="unique-email"
        placeholder="Unique ID - no conflicts"
      />
    </section>
  );
}
