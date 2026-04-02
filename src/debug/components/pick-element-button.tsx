/**
 * Shared Pick Element button component.
 *
 * Renders a consistent "Pick Element" button with the CursorArrowRipple
 * icon across all panels that support element picking.
 */

import { CursorArrowRippleIcon } from "@heroicons/react/24/outline";

interface PickElementButtonProps {
  active: boolean;
  onClick: () => void;
}

export function PickElementButton({ active, onClick }: PickElementButtonProps) {
  return (
    <button
      type="button"
      className={`a11y-panel-btn a11y-pick-btn ${active ? "a11y-panel-btn-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <CursorArrowRippleIcon className="a11y-pick-icon" />
      Pick Element
    </button>
  );
}
