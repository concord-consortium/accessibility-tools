import { useEffect, useState } from "react";
import { type AnimationItem, scanAnimations } from "../checks";
import type { CheckIssue } from "../checks";

export function ReducedMotionPanel() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [animations, setAnimations] = useState<AnimationItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);

  const rescan = () => {
    const result = scanAnimations();
    setPrefersReduced(result.prefersReduced);
    setAnimations(result.items);
    setIssues(result.issues);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: rescan is stable
  useEffect(() => {
    rescan();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const withoutOverride = animations.filter((a) => !a.hasReducedMotionOverride);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Reduced Motion</h3>
      <div className="a11y-panel-toolbar">
        <button type="button" onClick={rescan} className="a11y-panel-btn">
          Rescan
        </button>
      </div>

      <div className="a11y-panel-status">
        <strong>prefers-reduced-motion:</strong>{" "}
        <span className={prefersReduced ? "a11y-panel-issue" : ""}>
          {prefersReduced ? "reduce (active)" : "no-preference"}
        </span>
      </div>

      <div className="a11y-panel-count" style={{ marginTop: 8 }}>
        {animations.length} animations/transitions found,{" "}
        {withoutOverride.length} without reduced-motion override
      </div>

      {withoutOverride.length > 0 && (
        <div className="a11y-panel-issues" style={{ marginTop: 8 }}>
          <strong>Missing prefers-reduced-motion override:</strong>
          {withoutOverride.map((a) => (
            <div
              key={`no-override-${a.selector}-${a.source}`}
              className="a11y-panel-issue"
            >
              {a.selector} - {a.source}: {a.name}
            </div>
          ))}
        </div>
      )}

      {animations.length > 0 && (
        <div className="a11y-panel-list" style={{ marginTop: 8 }}>
          <strong>All animations/transitions:</strong>
          {animations.map((a) => (
            <div
              key={`anim-${a.selector}-${a.source}`}
              className="a11y-panel-row"
            >
              <span className="a11y-panel-tag">{a.source}</span>
              <span className="a11y-panel-text">{a.selector}</span>
              {a.hasReducedMotionOverride ? (
                <span className="a11y-panel-pass">has override</span>
              ) : (
                <span className="a11y-panel-missing">no override</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
