/**
 * Element Inspector panel.
 *
 * Shows a full ARIA attribute dump, tabIndex info, React component name,
 * and fiber path for a selected element. Other panels navigate here by
 * passing an element via onNavigateToPanel("inspector", element).
 */

import { useEffect, useState } from "react";
import { generateAuditMarkdown, runAudit } from "../checks/audit";
import {
  describeElement,
  getReactComponentName,
  getReactFiberPath,
  highlightElement,
  pluralize,
  removeHighlight,
  scrollToAndHighlight,
  showToast,
} from "../utils";

const ARIA_ATTRIBUTES = [
  "role",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-expanded",
  "aria-pressed",
  "aria-disabled",
  "aria-live",
  "aria-selected",
  "aria-checked",
  "aria-haspopup",
  "aria-controls",
  "aria-owns",
  "aria-hidden",
  "aria-required",
  "aria-invalid",
  "aria-current",
  "aria-busy",
  "aria-atomic",
  "aria-relevant",
  "aria-roledescription",
  "aria-valuemin",
  "aria-valuemax",
  "aria-valuenow",
  "aria-valuetext",
] as const;

const NATURAL_TAB_TAGS = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
]);

interface ElementInspectorProps {
  inspectTarget?: Element;
}

function isNaturallyTabbable(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (NATURAL_TAB_TAGS.has(tag)) {
    if (tag === "a" && !el.hasAttribute("href")) return false;
    if (el.hasAttribute("disabled")) return false;
    return true;
  }
  return false;
}

export function ElementInspectorPanel({
  inspectTarget,
}: ElementInspectorProps) {
  const [element, setElement] = useState<Element | null>(inspectTarget ?? null);
  const [pickMode, setPickMode] = useState(false);

  // Update when navigated to with a new target
  useEffect(() => {
    if (inspectTarget) {
      setElement(inspectTarget);
      setPickMode(false);
    }
  }, [inspectTarget]);

  // Click-to-pick mode
  useEffect(() => {
    if (!pickMode) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-a11y-debug]")) return;
      e.preventDefault();
      e.stopPropagation();
      setElement(target);
      setPickMode(false);
      highlightElement(target);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-a11y-debug]")) return;
      highlightElement(target, { color: "#f59e0b" });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPickMode(false);
        removeHighlight();
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      removeHighlight();
    };
  }, [pickMode]);

  // Clean up highlight on unmount
  useEffect(() => {
    return () => {
      removeHighlight();
    };
  }, []);

  if (!element) {
    return (
      <div className="a11y-panel-content">
        <h3 className="a11y-panel-title">Element Inspector</h3>
        <div className="a11y-panel-toolbar">
          <button
            type="button"
            className={`a11y-panel-btn ${pickMode ? "a11y-panel-btn-active" : ""}`}
            aria-pressed={pickMode}
            onClick={() => setPickMode((v) => !v)}
          >
            Pick Element
          </button>
        </div>
        <div className="a11y-focus-empty">
          Click "Pick Element" then click any element on the page, or navigate
          here from another panel.
        </div>
      </div>
    );
  }

  const componentName = getReactComponentName(element);
  const fiberPath = getReactFiberPath(element);
  const tag = element.tagName?.toLowerCase() ?? "unknown";
  const tabIndexAttr = element.getAttribute("tabindex");
  const tabIndexValue = tabIndexAttr !== null ? Number(tabIndexAttr) : null;
  const naturallyTabbable = isNaturallyTabbable(element);

  // Gather ARIA attributes that are present
  const ariaAttrs: Array<{ name: string; value: string; missing?: boolean }> =
    [];
  for (const attr of ARIA_ATTRIBUTES) {
    const value = element.getAttribute(attr);
    if (value !== null) {
      ariaAttrs.push({ name: attr, value });
    }
  }

  // Flag missing accessible name on interactive elements
  const isInteractive =
    naturallyTabbable || tabIndexValue !== null || element.getAttribute("role");
  const hasAccessibleName =
    element.getAttribute("aria-label") ||
    element.getAttribute("aria-labelledby") ||
    element.getAttribute("title") ||
    (element.textContent?.trim() ?? "").length > 0;
  const missingName = isInteractive && !hasAccessibleName;

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Element Inspector</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          className={`a11y-panel-btn ${pickMode ? "a11y-panel-btn-active" : ""}`}
          aria-pressed={pickMode}
          onClick={() => setPickMode((v) => !v)}
        >
          Pick Element
        </button>
        <button
          type="button"
          className="a11y-panel-btn"
          aria-label="Scroll to and highlight this element"
          onClick={() => scrollToAndHighlight(element)}
        >
          Locate
        </button>
        <button
          type="button"
          className="a11y-panel-btn"
          aria-label="Run WCAG audit on this element's subtree"
          onClick={() => {
            showToast("Running audit...");
            requestAnimationFrame(() => {
              const report = runAudit(element);
              const md = generateAuditMarkdown(report);
              navigator.clipboard.writeText(md).then(
                () =>
                  showToast(
                    `Audit: ${pluralize(report.totalFailing, "failing criterion", "failing criteria")} - copied to clipboard`,
                  ),
                () => showToast("Failed to copy - check clipboard permissions"),
              );
            });
          }}
        >
          Audit
        </button>
      </div>

      {/* Element identity */}
      <div className="a11y-inspector-section">
        <div className="a11y-inspector-heading">Element</div>
        <div className="a11y-focus-element-name">
          {componentName && (
            <span className="a11y-panel-component-name">{componentName}</span>
          )}
          <span className="a11y-panel-tag">&lt;{tag}&gt;</span>
        </div>
        {element.id && (
          <div className="a11y-focus-attr">
            <span className="a11y-focus-attr-key">id</span>
            <span className="a11y-focus-attr-value">{element.id}</span>
          </div>
        )}
        {element.getAttribute("class") && (
          <div className="a11y-focus-attr">
            <span className="a11y-focus-attr-key">class</span>
            <span className="a11y-focus-attr-value">
              {element.getAttribute("class")}
            </span>
          </div>
        )}
      </div>

      {/* Tab order info */}
      <div className="a11y-inspector-section">
        <div className="a11y-inspector-heading">Tab Order</div>
        <div className="a11y-focus-attr">
          <span className="a11y-focus-attr-key">tabIndex</span>
          <span className="a11y-focus-attr-value">
            {tabIndexAttr ?? "none"}
          </span>
        </div>
        <div className="a11y-focus-attr">
          <span className="a11y-focus-attr-key">naturally tabbable</span>
          <span className="a11y-focus-attr-value">
            {naturallyTabbable ? "yes" : "no"}
          </span>
        </div>
        <div className="a11y-focus-attr">
          <span className="a11y-focus-attr-key">in tab order</span>
          <span className="a11y-focus-attr-value">
            {naturallyTabbable || (tabIndexValue !== null && tabIndexValue >= 0)
              ? "yes"
              : "no"}
          </span>
        </div>
      </div>

      {/* ARIA attributes */}
      <div className="a11y-inspector-section">
        <div className="a11y-inspector-heading">ARIA Attributes</div>
        {ariaAttrs.length === 0 && !missingName && (
          <div className="a11y-focus-attr">
            <span className="a11y-focus-attr-value">None</span>
          </div>
        )}
        {missingName && (
          <div className="a11y-inspector-warning">
            Interactive element has no accessible name
          </div>
        )}
        {ariaAttrs.map((attr) => (
          <div key={attr.name} className="a11y-focus-attr">
            <span className="a11y-focus-attr-key">{attr.name}</span>
            <span className="a11y-focus-attr-value">{attr.value}</span>
          </div>
        ))}
      </div>

      {/* Component path */}
      {fiberPath.length > 0 && (
        <div className="a11y-inspector-section">
          <div className="a11y-inspector-heading">React Component Path</div>
          <div className="a11y-focus-breadcrumb">
            {fiberPath.map((name, i) => (
              <span key={`path-${i}`} className="a11y-focus-breadcrumb-item">
                {i > 0 && (
                  <span className="a11y-focus-breadcrumb-sep">{" > "}</span>
                )}
                <span
                  className={
                    i === fiberPath.length - 1
                      ? "a11y-focus-breadcrumb-current"
                      : ""
                  }
                >
                  {name}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
