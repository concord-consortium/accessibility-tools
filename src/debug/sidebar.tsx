import { useEffect } from "react";
import { injectStyles } from "./styles";

export interface AccessibilityDebugSidebarProps {
  theme?: "light" | "dark";
}

export function AccessibilityDebugSidebar({
  theme = "light",
}: AccessibilityDebugSidebarProps) {
  useEffect(() => {
    injectStyles();
  }, []);

  return (
    <div className="a11y-debug-sidebar" data-theme={theme}>
      <div className="a11y-debug-sidebar-header">
        <span className="a11y-debug-sidebar-title">cc-a11y-tools</span>
        <span className="a11y-debug-sidebar-version">v{__A11Y_VERSION__}</span>
      </div>
      <div className="a11y-debug-sidebar-body">
        <p>Panels will appear here as they are implemented.</p>
      </div>
    </div>
  );
}
