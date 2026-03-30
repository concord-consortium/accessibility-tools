import { type ReactNode, createContext } from "react";

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  return (
    <AccessibilityContext.Provider value={null}>
      {children}
    </AccessibilityContext.Provider>
  );
}
