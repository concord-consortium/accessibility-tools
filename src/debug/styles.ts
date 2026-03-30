const CSS = `
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
.a11y-debug-sidebar[data-theme="light"] {
  --a11y-sidebar-bg: #ffffff;
  --a11y-sidebar-text: #1a1a1a;
  --a11y-sidebar-border: #e0e0e0;
  --a11y-sidebar-header-bg: #f5f5f5;
}
.a11y-debug-sidebar[data-theme="dark"] {
  --a11y-sidebar-bg: #1e1e1e;
  --a11y-sidebar-text: #d4d4d4;
  --a11y-sidebar-border: #3e3e3e;
  --a11y-sidebar-header-bg: #2d2d2d;
}
.a11y-debug-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--a11y-sidebar-header-bg);
  border-bottom: 1px solid var(--a11y-sidebar-border);
}
.a11y-debug-sidebar-title {
  font-weight: 600;
}
.a11y-debug-sidebar-version {
  opacity: 0.6;
  font-size: 11px;
}
.a11y-debug-sidebar-body {
  flex: 1;
  padding: 16px;
  overflow: auto;
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
