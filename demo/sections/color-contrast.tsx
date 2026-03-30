export function ColorContrastSection() {
  return (
    <section>
      <h2>Color Contrast</h2>

      <h3 className="good">Good: Passes AA (4.5:1+)</h3>
      <p style={{ color: "#1a1a1a", background: "#ffffff" }}>
        Dark text on white - ratio ~17:1 (passes AA + AAA)
      </p>
      <p style={{ color: "#ffffff", background: "#2563eb" }}>
        White text on blue - ratio ~5.1:1 (passes AA)
      </p>

      <h3 className="bad">Bad: Fails AA (below 4.5:1)</h3>
      <p style={{ color: "#999999", background: "#ffffff" }}>
        Light gray text on white - ratio ~2.8:1 (fails AA)
      </p>
      <p style={{ color: "#aaaaaa", background: "#eeeeee" }}>
        Gray on light gray - ratio ~1.8:1 (fails AA)
      </p>

      <h3 className="good">Good: Large text at AA threshold (3:1)</h3>
      <p
        style={{
          color: "#767676",
          background: "#ffffff",
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        Large bold text at 4.5:1 - passes AA for large text
      </p>

      <h3>Borderline cases</h3>
      <p style={{ color: "#757575", background: "#ffffff" }}>
        #757575 on white - ratio ~4.6:1 (barely passes AA normal, fails AAA)
      </p>
      <p style={{ color: "#888888", background: "#ffffff", fontSize: 24 }}>
        Large #888 on white - ratio ~3.5:1 (passes AA large, fails AAA)
      </p>
    </section>
  );
}
