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
  position: relative;
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
  overflow-y: auto;
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
.a11y-panel-btn-active {
  background: var(--a11y-sidebar-icon-active-bg);
  border-color: #2563eb;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-btn-active {
  border-color: #60a5fa;
}
.a11y-panel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.a11y-panel-btn:disabled:hover {
  background: var(--a11y-sidebar-bg);
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

/* Toast notification */
.a11y-toast {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 6px 12px;
  font-size: 11px;
  font-family: inherit;
  text-align: center;
  background: #16a34a;
  color: #ffffff;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.a11y-toast-visible {
  opacity: 1;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-toast {
  background: #15803d;
}

/* Overview panel */
.a11y-overview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.a11y-overview-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 0;
}
.a11y-overview-score-value {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}
.a11y-overview-score-label {
  font-size: 11px;
  color: var(--a11y-sidebar-text-muted);
  margin-top: 4px;
}
.a11y-score-green { color: #16a34a; }
.a11y-score-yellow { color: #ca8a04; }
.a11y-score-red { color: #dc2626; }
.a11y-debug-sidebar[data-theme="dark"] .a11y-score-green { color: #4ade80; }
.a11y-debug-sidebar[data-theme="dark"] .a11y-score-yellow { color: #facc15; }
.a11y-debug-sidebar[data-theme="dark"] .a11y-score-red { color: #f87171; }

.a11y-overview-audit-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  margin-bottom: -12px;
  padding-bottom: 12px;
}
.a11y-overview-audit-buttons .a11y-panel-btn {
  flex: 1;
}

/* Explain section */
.a11y-overview-explain {
  background: var(--a11y-sidebar-header-bg);
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  margin-bottom: 8px;
  font-size: 11px;
}
.a11y-overview-explain-card {
  margin-top: 3px;
  padding: 4px 0;
}
.a11y-overview-explain-card strong {
  display: block;
  margin-bottom: 4px;
}
.a11y-overview-explain-detail {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  margin: 2px 0;
}
.a11y-overview-explain-issues {
  margin-top: 2px;
}
.a11y-overview-explain-issue {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
  font-family: monospace;
  padding-left: 8px;
}

.a11y-overview-checks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  flex: 1;
}
.a11y-overview-check-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 4px;
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  width: 100%;
}
.a11y-overview-check-card:hover {
  background: var(--a11y-sidebar-icon-hover-bg);
}
.a11y-overview-check-card:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}
.a11y-overview-check-error {
  border-left: 2px solid #dc2626;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-overview-check-error {
  border-left-color: #f87171;
}
.a11y-overview-check-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.a11y-overview-check-name {
  font-size: 12px;
  font-weight: 500;
}
.a11y-overview-check-score {
  font-size: 14px;
  font-weight: 700;
}
.a11y-overview-check-summary {
  display: flex;
  gap: 8px;
  font-size: 10px;
}
.a11y-overview-check-errors {
  color: #dc2626;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-overview-check-errors {
  color: #f87171;
}
.a11y-overview-check-warnings {
  color: #ca8a04;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-overview-check-warnings {
  color: #facc15;
}
.a11y-overview-check-pass {
  color: #16a34a;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-overview-check-pass {
  color: #4ade80;
}

/* Focus panels shared */
.a11y-focus-empty {
  color: var(--a11y-sidebar-text-muted);
  font-size: 11px;
  font-style: italic;
  padding: 8px 0;
}
.a11y-focus-current {
  margin-bottom: 8px;
}
.a11y-focus-element-name {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}
.a11y-panel-component-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--a11y-sidebar-text);
}
.a11y-focus-attrs {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.a11y-focus-attr {
  display: flex;
  gap: 6px;
  font-size: 11px;
  padding: 1px 0;
}
.a11y-focus-attr-key {
  color: #7c3aed;
  font-family: monospace;
  font-size: 10px;
  white-space: nowrap;
  min-width: 80px;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-focus-attr-key {
  color: #a78bfa;
}
.a11y-focus-attr-value {
  color: var(--a11y-sidebar-text);
  font-family: monospace;
  font-size: 10px;
  word-break: break-all;
}

/* Focus path breadcrumb */
.a11y-focus-path {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--a11y-sidebar-border);
}
.a11y-focus-path-label {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
  display: block;
  margin-bottom: 2px;
}
.a11y-focus-breadcrumb {
  font-size: 11px;
  line-height: 1.4;
  word-break: break-word;
}
.a11y-focus-breadcrumb-sep {
  color: var(--a11y-sidebar-text-muted);
}
.a11y-focus-breadcrumb-current {
  font-weight: 600;
}
.a11y-focus-previous {
  margin-top: 6px;
  font-size: 11px;
}
.a11y-focus-previous-desc {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  margin-left: 4px;
}

/* Element Inspector */
.a11y-inspector-section {
  padding: 6px 0;
  border-bottom: 1px solid var(--a11y-sidebar-border);
}
.a11y-inspector-section:last-child {
  border-bottom: none;
}
.a11y-inspector-heading {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--a11y-sidebar-text-muted);
  margin-bottom: 4px;
}
.a11y-inspector-warning {
  color: #dc2626;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 0;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-inspector-warning {
  color: #f87171;
}

/* Focus Loss Detector */
.a11y-focus-loss-time {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  white-space: nowrap;
}
.a11y-focus-loss-cause {
  color: #dc2626;
  font-size: 10px;
  white-space: nowrap;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-focus-loss-cause {
  color: #f87171;
}

/* Focus History Log */
.a11y-focus-history-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.a11y-focus-history-body {
  opacity: 0.5;
}
.a11y-focus-history-name {
  flex: 1;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.a11y-focus-history-time {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  white-space: nowrap;
}
.a11y-focus-history-duration {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  white-space: nowrap;
  min-width: 40px;
  text-align: right;
}

/* Focus Trap Detector */
.a11y-trap-card {
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 4px;
}
.a11y-trap-card-active {
  border-color: #dc2626;
}
.a11y-trap-card-intentional {
  border-left: 3px solid #2563eb;
}
.a11y-trap-card-accidental {
  border-left: 3px solid #dc2626;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-trap-card-active {
  border-color: #f87171;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-trap-card-intentional {
  border-left-color: #60a5fa;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-trap-card-accidental {
  border-left-color: #f87171;
}
.a11y-trap-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.a11y-trap-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 2px;
}
.a11y-trap-badge-intentional {
  background: #dbeafe;
  color: #1d4ed8;
}
.a11y-trap-badge-accidental {
  background: #fef2f2;
  color: #dc2626;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-trap-badge-intentional {
  background: #1e3a5f;
  color: #60a5fa;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-trap-badge-accidental {
  background: #3b1111;
  color: #f87171;
}
.a11y-trap-cycle-count {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
  flex: 1;
}
.a11y-trap-active-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
  animation: a11y-trap-pulse 1s ease-in-out infinite;
}
@keyframes a11y-trap-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.a11y-trap-active-badge {
  color: #dc2626;
  font-weight: 600;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-trap-active-badge {
  color: #f87171;
}
.a11y-trap-container {
  color: var(--a11y-sidebar-text-muted);
  font-size: 10px;
  margin-bottom: 4px;
}
.a11y-trap-elements {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.a11y-trap-order {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  min-width: 16px;
  text-align: right;
}

/* Focus Order Recorder */
.a11y-recorder-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 11px;
  color: #dc2626;
  font-weight: 500;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-recorder-status {
  color: #f87171;
}
.a11y-recorder-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
  animation: a11y-trap-pulse 1s ease-in-out infinite;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-recorder-dot {
  background: #f87171;
}
.a11y-recorder-order {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  min-width: 20px;
  text-align: right;
  flex-shrink: 0;
}

/* Keyboard Event Log */
.a11y-kbd-key {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  background: var(--a11y-sidebar-header-bg);
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 3px;
  padding: 0 4px;
  white-space: nowrap;
  min-width: 32px;
  text-align: center;
}
.a11y-kbd-prevented {
  background: #fef2f2;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-kbd-prevented {
  background: #3b1111;
}
.a11y-kbd-normal {
  background: transparent;
}
.a11y-kbd-badge {
  font-size: 9px;
  font-weight: 600;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 2px;
  padding: 0 3px;
  white-space: nowrap;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-kbd-badge {
  color: #f87171;
  background: #3b1111;
  border-color: #7f1d1d;
}
.a11y-kbd-time {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  white-space: nowrap;
}

/* Announcements Log */
.a11y-announcement-row {
  min-height: 24px;
}
.a11y-announcement-assertive {
  border-left: 2px solid #f97316;
  padding-left: 8px;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-announcement-assertive {
  border-left-color: #fb923c;
}
.a11y-announcement-badge {
  font-size: 9px;
  font-weight: 700;
  border-radius: 2px;
  padding: 0 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.a11y-announcement-badge-polite {
  background: #dbeafe;
  color: #1d4ed8;
}
.a11y-announcement-badge-assertive {
  background: #ffedd5;
  color: #c2410c;
}
.a11y-announcement-badge-off {
  background: #f3f4f6;
  color: #6b7280;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-announcement-badge-polite {
  background: #1e3a5f;
  color: #60a5fa;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-announcement-badge-assertive {
  background: #431407;
  color: #fb923c;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-announcement-badge-off {
  background: #374151;
  color: #9ca3af;
}
.a11y-announcement-cleared {
  color: var(--a11y-sidebar-text-muted);
  font-style: italic;
}
.a11y-announcement-time {
  color: var(--a11y-sidebar-text-muted);
  font-family: monospace;
  font-size: 10px;
  white-space: nowrap;
}

/* Live Region Inventory */
.a11y-live-badge {
  font-size: 9px;
  font-weight: 600;
  border-radius: 2px;
  padding: 0 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.a11y-live-badge-polite {
  background: #dbeafe;
  color: #1d4ed8;
}
.a11y-live-badge-assertive {
  background: #ffedd5;
  color: #c2410c;
}
.a11y-live-badge-off {
  background: #f3f4f6;
  color: #6b7280;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-live-badge-polite {
  background: #1e3a5f;
  color: #60a5fa;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-live-badge-assertive {
  background: #431407;
  color: #fb923c;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-live-badge-off {
  background: #374151;
  color: #9ca3af;
}

/* Image Audit */
.a11y-img-status {
  font-size: 9px;
  font-weight: 700;
  border-radius: 2px;
  padding: 0 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
.a11y-img-status-has-alt {
  background: #dcfce7;
  color: #16a34a;
}
.a11y-img-status-decorative {
  background: #f3f4f6;
  color: #6b7280;
}
.a11y-img-status-missing {
  background: #fef2f2;
  color: #dc2626;
}
.a11y-img-status-generic,
.a11y-img-status-long-alt {
  background: #fefce8;
  color: #ca8a04;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-img-status-has-alt {
  background: #14532d;
  color: #4ade80;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-img-status-decorative {
  background: #374151;
  color: #9ca3af;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-img-status-missing {
  background: #3b1111;
  color: #f87171;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-img-status-generic,
.a11y-debug-sidebar[data-theme="dark"] .a11y-img-status-long-alt {
  background: #422006;
  color: #facc15;
}

/* ARIA Validation */
.a11y-panel-tag-warning {
  color: #ca8a04;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-panel-tag-warning {
  color: #facc15;
}

/* Screen Reader Preview */
.a11y-sr-announcement {
  font-size: 14px;
  font-weight: 500;
  padding: 8px;
  margin-bottom: 8px;
  background: var(--a11y-sidebar-header-bg);
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 4px;
  min-height: 32px;
}
.a11y-sr-empty-name {
  color: #dc2626;
  font-style: italic;
}
.a11y-debug-sidebar[data-theme="dark"] .a11y-sr-empty-name {
  color: #f87171;
}

/* Color Contrast */
.a11y-contrast-ratio {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  min-width: 40px;
}
.a11y-contrast-swatch {
  font-size: 11px;
  font-weight: 700;
  padding: 0 3px;
  border: 1px solid var(--a11y-sidebar-border);
  border-radius: 2px;
  white-space: nowrap;
  flex-shrink: 0;
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
