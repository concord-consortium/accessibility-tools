import { AccessibilityDebugSidebar } from "@concord-consortium/accessibility-tools/debug";
import { AccessibilityProvider } from "@concord-consortium/accessibility-tools/hooks";
import { createRoot } from "react-dom/client";
import { KitchenSink } from "./kitchen-sink";
import "./demo.css";

function App() {
  return (
    <AccessibilityProvider>
      <div className="demo-layout">
        <main className="demo-content">
          <h1 id="top">Accessibility Tools - Kitchen Sink Demo</h1>
          <div className="demo-banner" role="note">
            ⚠ This demo is intentionally inaccessible - it contains deliberate
            accessibility violations for testing the debug sidebar panels.
          </div>
          <KitchenSink />
        </main>
        <AccessibilityDebugSidebar theme="light" />
      </div>
    </AccessibilityProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
