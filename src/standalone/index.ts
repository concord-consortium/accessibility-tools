/**
 * Standalone injection entry point.
 *
 * Self-contained bundle that includes React. Renders the accessibility
 * debug sidebar in a Shadow DOM container for style isolation. Can be
 * loaded on any page via a script tag or bookmarklet.
 *
 * Usage:
 *   <script src="https://your-host/standalone.js"></script>
 *
 * Or toggle programmatically:
 *   window.__a11yDebugToggle?.()
 */

import React from "react";
import { type Root, createRoot } from "react-dom/client";
import { AccessibilityDebugSidebar } from "../debug/sidebar";
import { injectStyles } from "../debug/styles";

const CONTAINER_ID = "a11y-debug-standalone";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;

function mount() {
  if (container) return; // already mounted

  // Create the outer container
  container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 300px;
    z-index: 2147483647;
  `;
  document.body.appendChild(container);

  // Push page content left to make room
  document.documentElement.style.marginRight = "300px";

  // Attach shadow root for style isolation
  shadowRoot = container.attachShadow({ mode: "open" });

  // Inject sidebar styles into shadow root
  injectStyles(shadowRoot);

  // Create a mount point inside the shadow root
  const mountPoint = document.createElement("div");
  mountPoint.style.cssText = "height: 100%;";
  shadowRoot.appendChild(mountPoint);

  // Render the sidebar
  root = createRoot(mountPoint);
  root.render(React.createElement(AccessibilityDebugSidebar));
}

function unmount() {
  if (!container) return;

  root?.unmount();
  root = null;

  container.remove();
  container = null;
  shadowRoot = null;

  document.documentElement.style.marginRight = "";
}

function toggle() {
  if (container) {
    unmount();
  } else {
    mount();
  }
}

// Expose toggle on window for bookmarklet use
declare global {
  interface Window {
    __a11yDebugToggle?: () => void;
  }
}
window.__a11yDebugToggle = toggle;

// Auto-mount on load
mount();
