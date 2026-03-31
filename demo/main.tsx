import { createRoot } from "react-dom/client";
import { AccessibilityDebugSidebar } from "../src/debug";
import { AccessibilityProvider } from "../src/hooks";
import { KitchenSink } from "./kitchen-sink";
import "./demo.css";

function App() {
  return (
    <AccessibilityProvider>
      <div className="demo-layout">
        <main className="demo-content">
          <button
            type="button"
            className="demo-top-link"
            onClick={() =>
              document
                .querySelector(".demo-content")
                ?.scrollTo({ top: 0, behavior: "smooth" })
            }
          >
            Top
          </button>
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
