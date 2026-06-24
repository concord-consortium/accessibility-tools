import { type RefObject, useEffect, useState } from "react";

export interface FocusReadoutProps {
  /** Human label for this scenario, shown in the panel heading. */
  label: string;
  /** Whether the parent's trap currently reports trapped. */
  isTrapped: boolean;
  /** Refs to the iframe elements this scenario owns, by name, for descent detection. */
  iframes: Record<string, RefObject<HTMLIFrameElement | null>>;
}

function describeActive(active: Element | null): string {
  if (!active || active === document.body) return "(none)";
  const tag = active.tagName.toLowerCase();
  const label =
    active.getAttribute("aria-label") ??
    active.getAttribute("placeholder") ??
    active.textContent?.trim().slice(0, 20) ??
    "";
  return label ? `${tag} "${label}"` : tag;
}

export function FocusReadout({ label, isTrapped, iframes }: FocusReadoutProps) {
  const [active, setActive] = useState<string>("(none)");
  const [descendedInto, setDescendedInto] = useState<string>("(none)");

  useEffect(() => {
    const update = () => {
      const el = document.activeElement;
      setActive(describeActive(el));
      const hit = Object.entries(iframes).find(
        ([, f]) => f.current && f.current === el,
      );
      setDescendedInto(hit ? hit[0] : "(none)");
    };
    update();
    // focusin bubbles; window focus/blur catches native iframe descent/ascent.
    document.addEventListener("focusin", update, true);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("focusin", update, true);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, [iframes]);

  return (
    <dl
      data-testid={`readout-${label}`}
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
        background: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: 4,
        padding: "8px 12px",
        margin: "8px 0",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "2px 12px",
      }}
    >
      <dt>trapped</dt>
      <dd data-testid="readout-trapped" style={{ margin: 0 }}>
        {String(isTrapped)}
      </dd>
      <dt>activeElement</dt>
      <dd data-testid="readout-active" style={{ margin: 0 }}>
        {active}
      </dd>
      <dt>descended into</dt>
      <dd data-testid="readout-descended" style={{ margin: 0 }}>
        {descendedInto}
      </dd>
    </dl>
  );
}
