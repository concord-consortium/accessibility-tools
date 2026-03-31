export function HeadingHierarchySection() {
  return (
    <section>
      <h2>Heading Hierarchy</h2>

      <p className="good">
        <strong>Good: Correct hierarchy</strong>
      </p>
      <div style={{ paddingLeft: 16, borderLeft: "2px solid #15803d" }}>
        <h3>Level 3 heading</h3>
        <p>Content under h3</p>
        <h4>Level 4 heading</h4>
        <p>Content under h4</p>
      </div>

      <p className="bad">
        <strong>Bad: Skipped level (h2 → h4, no h3)</strong>
      </p>
      <div style={{ paddingLeft: 16, borderLeft: "2px solid #dc2626" }}>
        <h4>This h4 follows an h2 - skipped h3</h4>
        <p>Screen readers announce the skip, confusing the document outline.</p>
      </div>

      <p className="bad">
        <strong>Bad: Multiple h1 elements</strong>
      </p>
      <div style={{ paddingLeft: 16, borderLeft: "2px solid #dc2626" }}>
        <h1 style={{ fontSize: 18 }}>First h1 (maybe OK)</h1>
        <h1 style={{ fontSize: 18 }}>
          Second h1 (should be only one per page)
        </h1>
      </div>

      <p className="bad">
        <strong>Bad: Section without heading</strong>
      </p>
      <div style={{ paddingLeft: 16, borderLeft: "2px solid #dc2626" }}>
        <div role="region" aria-label="Unnamed section">
          <p>
            This region has no heading - screen readers can't identify it by
            heading navigation.
          </p>
        </div>
      </div>
    </section>
  );
}
