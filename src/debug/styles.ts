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
  --a11y-sidebar-icon-active-bg: #c7d9f7;
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
  --a11y-sidebar-icon-active-bg: #2b4f7e;
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
.a11y-sidebar-overlay-btn.disabled {
  opacity: 0.35;
  cursor: default;
}
.a11y-sidebar-overlay-spacer {
  margin-left: auto;
}

/* Overlay help panel */
.a11y-sidebar-overlay-help {
  padding: 8px;
  border-top: 1px solid var(--a11y-sidebar-border);
  background: var(--a11y-sidebar-header-bg);
  font-size: 11px;
}
.a11y-sidebar-overlay-help-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
}
.a11y-sidebar-overlay-help-row .a11y-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--a11y-sidebar-text-muted);
}
.a11y-sidebar-overlay-help-desc {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
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

/* Panel title */
.a11y-panel-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--a11y-sidebar-border);
}

/* Panel content shared styles */
.a11y-panel-content {
  font-size: 12px;
}
.a11y-panel-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.a11y-panel-btn {
  padding: 2px 8px;
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 3px;
  background: transparent;
  color: var(--a11y-sidebar-text);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
.a11y-panel-btn:hover {
  background: var(--a11y-sidebar-tab-hover-bg);
}
.a11y-panel-count {
  color: var(--a11y-sidebar-text-muted);
  font-size: 11px;
}
.a11y-panel-issues {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 3px;
  padding: 6px 8px;
  margin-bottom: 8px;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-issues {
  background: #3b1111;
  border-color: #7f1d1d;
}
.a11y-panel-issue {
  color: #dc2626;
  font-size: 11px;
  margin: 2px 0;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-issue {
  color: #f87171;
}
.a11y-panel-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.a11y-panel-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 11px;
}
.a11y-panel-row:hover {
  background: var(--a11y-sidebar-icon-hover-bg);
}
.a11y-panel-row-clickable {
  cursor: pointer;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
  width: 100%;
}
.a11y-panel-row-clickable:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}
.a11y-panel-row-error {
  background: #fef2f2;
  border-left: 2px solid #dc2626;
  padding-left: 8px;
  padding-top: 3px;
  padding-bottom: 3px;
}
.a11y-panel-row-error .a11y-panel-tag {
  color: #dc2626;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-row-error {
  background: #3b1111;
  border-left-color: #f87171;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-row-error .a11y-panel-tag {
  color: #f87171;
}
.a11y-panel-row-active {
  background: #dbeafe;
  border-left: 2px solid #2563eb;
  padding-left: 8px;
  padding-top: 3px;
  padding-bottom: 3px;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-row-active {
  background: #1e3a5f;
  border-left-color: #60a5fa;
}
.a11y-panel-tag {
  color: #7c3aed;
  font-weight: 600;
  font-family: monospace;
  font-size: 11px;
  white-space: nowrap;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-tag {
  color: #a78bfa;
}
.a11y-panel-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.a11y-panel-component {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
  white-space: nowrap;
}
.a11y-panel-role {
  color: #2563eb;
  font-size: 10px;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-role {
  color: #60a5fa;
}
.a11y-panel-label {
  color: #16a34a;
  font-size: 10px;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-label {
  color: #4ade80;
}
.a11y-panel-type {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
  font-family: monospace;
}
.a11y-panel-missing {
  color: #dc2626;
  font-size: 10px;
  font-weight: 600;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-missing {
  color: #f87171;
}
.a11y-panel-pass {
  color: #16a34a;
  font-size: 10px;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-pass {
  color: #4ade80;
}
.a11y-panel-placeholder {
  color: var(--a11y-sidebar-text-muted);
  font-style: italic;
  font-size: 11px;
}
.a11y-panel-status {
  font-size: 12px;
}
.a11y-panel-group {
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 3px;
  padding: 6px;
  margin-bottom: 4px;
}
.a11y-panel-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.a11y-panel-refs {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
  margin-top: 4px;
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
