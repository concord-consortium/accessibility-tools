import { useState } from "react";

export function LandmarksSection() {
  const [showMain, setShowMain] = useState(true);

  return (
    <section>
      <h2>Landmarks</h2>

      <h3 className="good">Good: Proper landmark structure</h3>
      <nav aria-label="Demo navigation">
        <a href="#home">Home</a> | <a href="#products">Products</a> |{" "}
        <a href="#contact">Contact</a>
      </nav>

      <header style={{ background: "#f5f5f5", padding: 8, marginTop: 8 }}>
        <p>Demo header landmark</p>
      </header>

      {showMain ? (
        <main style={{ border: "1px solid #dc2626", padding: 8, marginTop: 8 }}>
          <p>
            Bad: Second &lt;main&gt; element - creates a duplicate main landmark
            (page already has one in the demo chrome)
          </p>
        </main>
      ) : (
        <div style={{ border: "1px dashed #999", padding: 8, marginTop: 8 }}>
          <p>Duplicate &lt;main&gt; removed</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMain((v) => !v)}
        style={{ marginTop: 8 }}
      >
        {showMain ? "Remove duplicate <main>" : "Add duplicate <main>"}
      </button>

      <aside
        aria-label="Related links"
        style={{ background: "#f9fafb", padding: 8, marginTop: 8 }}
      >
        <p>Aside landmark with accessible label</p>
      </aside>

      <footer style={{ background: "#f5f5f5", padding: 8, marginTop: 8 }}>
        <p>Demo footer landmark</p>
      </footer>

      <h3 className="bad">Bad: section without heading</h3>
      <section style={{ border: "1px solid #dc2626", padding: 8 }}>
        <p>
          This section element has no heading - screen readers can't identify
          it.
        </p>
      </section>

      <h3 className="good">Good: section with heading</h3>
      <section style={{ border: "1px solid #15803d", padding: 8 }}>
        <h4>Section with proper heading</h4>
        <p>This section can be identified by its heading.</p>
      </section>

      <h3 className="bad">Bad: Landmarks without accessible labels</h3>
      <nav>
        <a href="#unlabeled-1">Link 1</a> | <a href="#unlabeled-2">Link 2</a>
      </nav>
      <p style={{ fontSize: 12, color: "#666" }}>
        nav without aria-label - can't distinguish from other navs
      </p>
    </section>
  );
}
