export function AuditReportSection() {
  return (
    <section>
      <h2>Audit Report</h2>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
        Self-contained section with passing and failing elements across multiple
        WCAG criteria, suitable for demonstrating the audit report generator.
      </p>
      {/* 1. Color contrast - pass + fail */}
      <h3>Color Contrast</h3>
      <p className="good" style={{ color: "#1a1a1a", background: "#ffffff" }}>
        Good: high contrast text
      </p>
      <p className="bad" style={{ color: "#bbbbbb", background: "#ffffff" }}>
        Bad: low contrast text
      </p>
      {/* 2. Missing alt text - pass + fail */}
      <h3>Image Alt Text</h3>
      <p className="good">Good: img with alt</p>
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='30' fill='%2316a34a'%3E%3Crect width='40' height='30'/%3E%3C/svg%3E"
        alt="Green placeholder"
      />
      <p className="bad">Bad: img missing alt</p>
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='30' fill='%23dc2626'%3E%3Crect width='40' height='30'/%3E%3C/svg%3E" />
      {/* 3. Unlabeled form input - pass + fail */}
      <h3>Form Labels</h3>
      <p className="good">Good: labeled input</p>
      <label htmlFor="audit-input">Labeled input</label>
      <input type="text" id="audit-input" />
      <br />
      <p className="bad">Bad: unlabeled input</p>
      <input type="text" placeholder="Unlabeled input" />
      {/* 4. Heading skip - pass + fail */}
      <h3>Heading Hierarchy</h3>
      <h4>Proper h4 under h3 (pass)</h4>
      <h6>Skipped to h6 (fail - missing h5)</h6>
      {/* 5. Missing landmark - pass + fail */}
      <h3>Landmarks</h3>
      <p className="good">Good: nav with label</p>
      <nav aria-label="Audit demo nav">
        <a href="#audit-1">Link</a>
      </nav>
      <p className="bad">Bad: nav without label</p>
      <nav>
        <a href="#audit-2">Link</a>
      </nav>
      {/* 6. ARIA misuse - pass + fail */}
      <h3>ARIA Usage</h3>
      <p className="good">Good: correct ARIA</p>
      <button type="button" aria-label="Close dialog">
        X
      </button>{" "}
      <p className="bad">Bad: incorrect ARIA</p>
      <p aria-label="Ignored label">Paragraph with aria-label, no role</p>
    </section>
  );
}
