import { useEffect, useState } from "react";
import { type ImageItem, scanImages } from "../checks/images";
import type { CheckIssue } from "../checks/types";
import {
  isHighlighted,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";

export function ImageAuditPanel() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [issues, setIssues] = useState<CheckIssue[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = (notify = true) => {
    const result = scanImages();
    setImages(result.items);
    setIssues(result.issues);
    if (notify) {
      const n = result.issues.length;
      showToast(
        `Rescan complete: ${n ? `${pluralize(n, "issue")} found` : "no issues found"}`,
      );
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: rescan is stable
  useEffect(() => {
    rescan(false);
  }, []);

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Image Audit</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <span className="a11y-panel-count">
          {images.length} images, {issues.length} issues
        </span>
      </div>

      {issues.length > 0 && (
        <div className="a11y-panel-issues">
          {issues.map((issue, i) => (
            <div key={`issue-${issue.type}-${i}`} className="a11y-panel-issue">
              {issue.message}
            </div>
          ))}
        </div>
      )}

      <div className="a11y-panel-list">
        {images.map((img, i) => (
          <button
            type="button"
            key={`img-${i}`}
            className={`a11y-panel-row a11y-panel-row-clickable ${img.status === "missing" ? "a11y-panel-row-error" : ""} ${isHighlighted(img.element) ? "a11y-panel-row-active" : ""}`}
            aria-label={`${img.status}: ${img.alt || "no alt"} - ${img.src}`}
            title={`${img.status}: ${img.alt || "(no alt)"}\n${img.src}${img.component ? `\n${img.component}` : ""}`}
            onClick={() => {
              scrollToAndHighlight(img.element);
              forceUpdate((n) => n + 1);
            }}
          >
            <span className={`a11y-img-status a11y-img-status-${img.status}`}>
              {img.status === "has-alt"
                ? "OK"
                : img.status === "decorative"
                  ? "DEC"
                  : img.status === "generic"
                    ? "GEN"
                    : img.status === "long-alt"
                      ? "LONG"
                      : "MISS"}
            </span>
            <span className="a11y-panel-text">
              {img.alt || "(no alt text)"}
            </span>
            {img.component && (
              <span className="a11y-panel-component">{img.component}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
