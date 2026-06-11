import { createRoot } from "react-dom/client";
import { AccessibilityProvider } from "../src/hooks";
import "./demo.css";

function App() {
  return (
    <AccessibilityProvider>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
        <h1>Iframe Focus Trap Test</h1>
        <p>
          Scenarios for a non-cooperating, cross-origin iframe inside a focus
          trap. Tab, Shift+Tab, and Escape to exercise each trap.
        </p>
      </main>
    </AccessibilityProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
