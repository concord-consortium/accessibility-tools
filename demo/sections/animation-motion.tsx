export function AnimationMotionSection() {
  return (
    <section>
      <h2>Animation / Motion</h2>

      <style>{`
        @keyframes spin-demo {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-demo {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .anim-spin { animation: spin-demo 2s linear infinite; display: inline-block; }
        .anim-pulse { animation: pulse-demo 2s ease-in-out infinite; }
        .anim-reduced {
          animation: pulse-demo 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-reduced { animation: none; }
        }
      `}</style>

      <h3 className="bad">
        Bad: Animation without prefers-reduced-motion override
      </h3>
      <div
        className="anim-spin"
        style={{ width: 30, height: 30, background: "#dc2626" }}
      />
      <span style={{ marginLeft: 8 }}>
        Spinning box - no reduced motion override
      </span>
      <br />
      <div
        className="anim-pulse"
        style={{
          padding: "4px 8px",
          background: "#f59e0b",
          display: "inline-block",
          marginTop: 4,
        }}
      >
        Pulsing element - no reduced motion override
      </div>

      <h3 className="good">
        Good: Animation with prefers-reduced-motion override
      </h3>
      <div
        className="anim-reduced"
        style={{
          padding: "4px 8px",
          background: "#15803d",
          color: "white",
          display: "inline-block",
        }}
      >
        Pulsing element - stops when prefers-reduced-motion is active
      </div>

      <h3 className="good">Good: CSS transition (generally acceptable)</h3>
      <button
        type="button"
        style={{ transition: "background-color 0.2s ease" }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.backgroundColor = "#e0e0e0";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.backgroundColor = "";
        }}
      >
        Hover me (subtle transition)
      </button>
    </section>
  );
}
