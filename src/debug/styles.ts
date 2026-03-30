const CSS = `
/* Theme variables */
.a11y-debug-sidebar[data-theme="light"] {
  --a11y-sidebar-bg: #ffffff;
  --a11y-sidebar-text: #1a1a1a;
  --a11y-sidebar-text-muted: #666666;
  --a11y-sidebar-border: #e0e0e0;
  --a11y-sidebar-header-bg: #f5f5f5;
  --a11y-sidebar-tab-active-bg: #ffffff;
  --a11y-sidebar-tab-hover-bg: #f0f0f0;
  --a11y-sidebar-icon-active-bg: #e8f0fe;
  --a11y-sidebar-icon-hover-bg: #f0f0f0;
  --a11y-sidebar-overlay-active-bg: #dbeafe;
  --a11y-sidebar-overlay-active-text: #1d4ed8;
  --a11y-sidebar-footer-bg: #f9fafb;
}
.a11y-debug-sidebar[data-theme="dark"] {
  --a11y-sidebar-bg: #1e1e1e;
  --a11y-sidebar-text: #d4d4d4;
  --a11y-sidebar-text-muted: #949494;
  --a11y-sidebar-border: #3e3e3e;
  --a11y-sidebar-header-bg: #2d2d2d;
  --a11y-sidebar-tab-active-bg: #1e1e1e;
  --a11y-sidebar-tab-hover-bg: #333333;
  --a11y-sidebar-icon-active-bg: #1e3a5f;
  --a11y-sidebar-icon-hover-bg: #333333;
  --a11y-sidebar-overlay-active-bg: #1e3a5f;
  --a11y-sidebar-overlay-active-text: #93c5fd;
  --a11y-sidebar-footer-bg: #252525;
}

/* Root container */
.a11y-debug-sidebar {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  background: var(--a11y-sidebar-bg);
  color: var(--a11y-sidebar-text);
  border-left: 1px solid var(--a11y-sidebar-border);
}

/* Header */
.a11y-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--a11y-sidebar-header-bg);
  border-bottom: 1px solid var(--a11y-sidebar-border);
}
.a11y-sidebar-title {
  font-weight: 600;
}
.a11y-sidebar-version {
  color: var(--a11y-sidebar-text-muted);
  font-size: 11px;
}

/* Category tabs */
.a11y-sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--a11y-sidebar-border);
  background: var(--a11y-sidebar-header-bg);
}
.a11y-sidebar-tab {
  flex: 1;
  padding: 6px 4px;
  border: none;
  background: transparent;
  color: var(--a11y-sidebar-text);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}
.a11y-sidebar-tab:hover:not(.disabled) {
  background: var(--a11y-sidebar-tab-hover-bg);
}
.a11y-sidebar-tab.active {
  background: var(--a11y-sidebar-tab-active-bg);
  border-bottom-color: #2563eb;
  font-weight: 600;
}
.a11y-sidebar-tab.disabled {
  color: var(--a11y-sidebar-text-muted);
  cursor: default;
  opacity: 0.5;
}

/* Workspace: icon strip + panel content */
.a11y-sidebar-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Vertical icon strip */
.a11y-sidebar-icons {
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 2px;
  border-right: 1px solid var(--a11y-sidebar-border);
  background: var(--a11y-sidebar-header-bg);
}
.a11y-sidebar-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--a11y-sidebar-text);
  cursor: pointer;
}
.a11y-sidebar-icon-btn:hover {
  background: var(--a11y-sidebar-icon-hover-bg);
}
.a11y-sidebar-icon-btn.active {
  background: var(--a11y-sidebar-icon-active-bg);
}
.a11y-sidebar-icon-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

/* Panel content */
.a11y-sidebar-panel {
  flex: 1;
  padding: 12px;
  overflow: auto;
}
.a11y-sidebar-placeholder {
  color: var(--a11y-sidebar-text-muted);
  font-style: italic;
}

/* Overlay toggles */
.a11y-sidebar-overlays {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-top: 1px solid var(--a11y-sidebar-border);
  border-bottom: 1px solid var(--a11y-sidebar-border);
}
.a11y-sidebar-overlay-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 4px;
  background: transparent;
  color: var(--a11y-sidebar-text-muted);
  cursor: pointer;
}
.a11y-sidebar-overlay-btn:hover {
  background: var(--a11y-sidebar-icon-hover-bg);
}
.a11y-sidebar-overlay-btn.active {
  background: var(--a11y-sidebar-overlay-active-bg);
  color: var(--a11y-sidebar-overlay-active-text);
  border-color: var(--a11y-sidebar-overlay-active-text);
}
.a11y-sidebar-overlay-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

/* Footer */
.a11y-sidebar-footer {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--a11y-sidebar-footer-bg);
  border-top: 1px solid var(--a11y-sidebar-border);
}
.a11y-sidebar-footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 4px;
  background: transparent;
  color: var(--a11y-sidebar-text);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
.a11y-sidebar-footer-btn:hover {
  background: var(--a11y-sidebar-tab-hover-bg);
}
.a11y-sidebar-footer-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

/* Shared icon size */
.a11y-icon {
  width: 16px;
  height: 16px;
}
`;

const injectedTargets = new WeakSet<Document | ShadowRoot>();

export function injectStyles(target: Document | ShadowRoot = document): void {
  if (injectedTargets.has(target)) return;
  const doc = target instanceof ShadowRoot ? target.ownerDocument : target;
  const style = doc.createElement("style");
  style.id = "a11y-debug-sidebar-styles";
  style.textContent = CSS;
  if (target instanceof ShadowRoot) {
    target.appendChild(style);
  } else {
    target.head.appendChild(style);
  }
  injectedTargets.add(target);
}
