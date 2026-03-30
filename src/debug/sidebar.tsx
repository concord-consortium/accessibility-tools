import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CategoryDef,
  type PanelDef,
  categories,
  footerActions,
  overlayToggles,
} from "./sidebar-data";
import { injectStyles } from "./styles";

export interface AccessibilityDebugSidebarProps {
  theme?: "light" | "dark";
}

export function AccessibilityDebugSidebar({
  theme = "light",
}: AccessibilityDebugSidebarProps) {
  const enabledCategories = categories.filter((c) => !c.disabled);
  const [activeCategory, setActiveCategory] = useState(
    enabledCategories[0]?.id ?? categories[0].id,
  );
  const [activePanels, setActivePanels] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const cat of categories) {
        initial[cat.id] = cat.panels[0].id;
      }
      return initial;
    },
  );
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());

  const categoryTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const iconTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    injectStyles();
  }, []);

  const currentCategory = categories.find((c) => c.id === activeCategory);
  const currentPanelId = currentCategory
    ? activePanels[currentCategory.id]
    : undefined;
  const currentPanel = currentCategory?.panels.find(
    (p) => p.id === currentPanelId,
  );

  const handleCategoryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = enabledCategories.findIndex((c) => c.id === activeCategory);
      let nextId: string | undefined;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextId = enabledCategories[(idx + 1) % enabledCategories.length].id;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextId =
          enabledCategories[
            (idx - 1 + enabledCategories.length) % enabledCategories.length
          ].id;
      }
      if (nextId) {
        setActiveCategory(nextId);
        categoryTabRefs.current[nextId]?.focus();
      }
    },
    [activeCategory, enabledCategories],
  );

  const handleIconKeyDown = useCallback(
    (e: React.KeyboardEvent, category: CategoryDef) => {
      const panelId = activePanels[category.id];
      const idx = category.panels.findIndex((p) => p.id === panelId);
      let nextPanel: PanelDef | undefined;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nextPanel = category.panels[(idx + 1) % category.panels.length];
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextPanel =
          category.panels[
            (idx - 1 + category.panels.length) % category.panels.length
          ];
      }
      if (nextPanel) {
        setActivePanels((prev) => ({ ...prev, [category.id]: nextPanel.id }));
        iconTabRefs.current[nextPanel.id]?.focus();
      }
    },
    [activePanels],
  );

  const toggleOverlay = useCallback((id: string) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className="a11y-debug-sidebar" data-theme={theme}>
      {/* Header */}
      <div className="a11y-sidebar-header">
        <span className="a11y-sidebar-title">cc-a11y-tools</span>
        <span className="a11y-sidebar-version">v{__A11Y_VERSION__}</span>
      </div>

      {/* Category tabs */}
      <div
        className="a11y-sidebar-tabs"
        role="tablist"
        aria-label="Panel categories"
        onKeyDown={handleCategoryKeyDown}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            ref={(el) => {
              categoryTabRefs.current[cat.id] = el;
            }}
            aria-selected={activeCategory === cat.id}
            aria-controls={`a11y-category-panel-${cat.id}`}
            id={`a11y-tab-${cat.id}`}
            disabled={cat.disabled}
            tabIndex={activeCategory === cat.id ? 0 : -1}
            className={`a11y-sidebar-tab ${activeCategory === cat.id ? "active" : ""} ${cat.disabled ? "disabled" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
            title={cat.disabled ? "No hooks registered" : undefined}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Category tabpanel wrapping workspace */}
      {currentCategory && (
        <div
          className="a11y-sidebar-workspace"
          role="tabpanel"
          id={`a11y-category-panel-${currentCategory.id}`}
          aria-labelledby={`a11y-tab-${currentCategory.id}`}
        >
          {currentCategory.disabled ? (
            <div className="a11y-sidebar-panel">
              <p className="a11y-sidebar-placeholder">No hooks registered</p>
            </div>
          ) : (
            <>
              {/* Vertical icon strip */}
              <div
                className="a11y-sidebar-icons"
                role="tablist"
                aria-orientation="vertical"
                aria-label={`${currentCategory.label} panels`}
                onKeyDown={(e) => handleIconKeyDown(e, currentCategory)}
              >
                {currentCategory.panels.map((panel) => (
                  <IconButton
                    key={panel.id}
                    panel={panel}
                    isActive={currentPanelId === panel.id}
                    ref={(el) => {
                      iconTabRefs.current[panel.id] = el;
                    }}
                    onClick={() =>
                      setActivePanels((prev) => ({
                        ...prev,
                        [currentCategory.id]: panel.id,
                      }))
                    }
                  />
                ))}
              </div>

              {/* Panel content */}
              <div
                className="a11y-sidebar-panel"
                id={`a11y-icon-panel-${currentPanelId}`}
                aria-labelledby={
                  currentPanel ? `a11y-icon-${currentPanel.id}` : undefined
                }
                {...(currentPanel?.isLog
                  ? { role: "log", "aria-live": "polite" as const }
                  : { role: "tabpanel" as const })}
              >
                <p className="a11y-sidebar-placeholder">
                  {currentPanel?.label} - TBD
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Overlay toggles */}
      <div
        className="a11y-sidebar-overlays"
        role="toolbar"
        aria-label="Overlay toggles"
      >
        {overlayToggles.map((toggle) => {
          const isActive = activeOverlays.has(toggle.id);
          const Icon = toggle.icon;
          return (
            <button
              key={toggle.id}
              type="button"
              className={`a11y-sidebar-overlay-btn ${isActive ? "active" : ""}`}
              aria-pressed={isActive}
              aria-label={toggle.label}
              title={toggle.label}
              onClick={() => toggleOverlay(toggle.id)}
            >
              <Icon className="a11y-icon" />
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="a11y-sidebar-footer">
        {footerActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className="a11y-sidebar-footer-btn"
              aria-label={action.ariaLabel}
            >
              <Icon className="a11y-icon" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { forwardRef } from "react";

const IconButton = forwardRef<
  HTMLButtonElement,
  {
    panel: PanelDef;
    isActive: boolean;
    onClick: () => void;
  }
>(({ panel, isActive, onClick }, ref) => {
  const Icon = panel.icon;
  return (
    <button
      type="button"
      role="tab"
      ref={ref}
      aria-selected={isActive}
      aria-controls={`a11y-icon-panel-${panel.id}`}
      id={`a11y-icon-${panel.id}`}
      aria-label={panel.label}
      title={panel.label}
      tabIndex={isActive ? 0 : -1}
      className={`a11y-sidebar-icon-btn ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <Icon className="a11y-icon" />
    </button>
  );
});

IconButton.displayName = "IconButton";
