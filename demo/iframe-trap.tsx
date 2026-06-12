import { createRoot } from "react-dom/client";
import { AccessibilityProvider } from "../src/hooks";
import "./demo.css";
import { CanonicalScenario } from "./sections/iframe-trap/canonical";
import { DeferredChildrenScenario } from "./sections/iframe-trap/deferred-children";
import { LockToggleScenario } from "./sections/iframe-trap/lock-toggle";
import { MultiIframeScenario } from "./sections/iframe-trap/multi-iframe";
import { SoloIframeScenario } from "./sections/iframe-trap/solo-iframe";

function App() {
  return (
    <AccessibilityProvider>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
        <h1>Iframe Focus Trap Test</h1>
        <p>
          Scenarios for a non-cooperating, cross-origin iframe inside a focus
          trap. Tab, Shift+Tab, and Escape to exercise each trap.
        </p>
        <CanonicalScenario />
        <DeferredChildrenScenario />
        <LockToggleScenario />
        <SoloIframeScenario />
        <MultiIframeScenario />
      </main>
    </AccessibilityProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
