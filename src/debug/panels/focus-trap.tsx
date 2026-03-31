/**
 * Focus Trap Detector panel.
 *
 * Detects focus traps by watching for cycles in the focus event stream.
 * A cycle is detected when the same set of N elements repeats 2+ times
 * consecutively. Distinguishes intentional traps (modal dialogs) from
 * possible accidental traps by checking for role="dialog", aria-modal,
 * or <dialog> elements.
 */

import { useEffect, useRef, useState } from "react";
import { describeElement, scrollToAndHighlight } from "../utils";
import { subscribeFocus } from "../utils/focus-stream";

interface DetectedTrap {
  elementRefs: WeakRef<Element>[];
  elementCount: number;
  descriptions: string[];
  containerDescription: string | null;
  intentional: boolean;
  firstSeen: number;
  lastSeen: number;
  cycleCount: number;
  active: boolean;
}

const MIN_CYCLE_LENGTH = 2;
const MAX_CYCLE_LENGTH = 20;
const REQUIRED_REPETITIONS = 2;

/**
 * Check if a set of elements are inside an intentional focus trap container
 * (dialog, modal, or element with aria-modal).
 */
function findTrapContainer(
  elements: Element[],
): { element: Element; intentional: boolean } | null {
  if (elements.length === 0) return null;

  // Check the common ancestor area for modal indicators
  for (const el of elements) {
    const dialog = el.closest("dialog, [role='dialog'], [role='alertdialog']");
    if (dialog) {
      return { element: dialog, intentional: true };
    }
    const modal = el.closest("[aria-modal='true']");
    if (modal) {
      return { element: modal, intentional: true };
    }
  }

  // Find the lowest common ancestor
  const first = elements[0];
  let ancestor: Element | null = first.parentElement;
  while (ancestor) {
    if (elements.every((el) => ancestor?.contains(el))) {
      return { element: ancestor, intentional: false };
    }
    ancestor = ancestor.parentElement;
  }

  return null;
}

/**
 * Detect cycles in a sequence of elements.
 * Returns the cycle elements if a cycle of length N repeats REQUIRED_REPETITIONS times.
 */
function detectCycle(
  history: Element[],
): { cycleElements: Element[]; cycleCount: number } | null {
  if (history.length < MIN_CYCLE_LENGTH * REQUIRED_REPETITIONS) return null;

  // Try cycle lengths from shortest to longest
  for (
    let len = MIN_CYCLE_LENGTH;
    len <=
    Math.min(
      MAX_CYCLE_LENGTH,
      Math.floor(history.length / REQUIRED_REPETITIONS),
    );
    len++
  ) {
    const candidate = history.slice(0, len);
    let reps = 1;

    for (let offset = len; offset + len <= history.length; offset += len) {
      const segment = history.slice(offset, offset + len);
      const matches = candidate.every((el, i) => el === segment[i]);
      if (matches) {
        reps++;
      } else {
        break;
      }
    }

    if (reps >= REQUIRED_REPETITIONS) {
      return { cycleElements: candidate, cycleCount: reps };
    }
  }

  return null;
}

export function FocusTrapPanel() {
  const [traps, setTraps] = useState<DetectedTrap[]>([]);
  const [, forceUpdate] = useState(0);
  const recentFocusRef = useRef<Element[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeFocus((event) => {
      // Keep a rolling window of recent focus targets
      const recent = recentFocusRef.current;
      recent.unshift(event.element);
      if (recent.length > MAX_CYCLE_LENGTH * (REQUIRED_REPETITIONS + 1)) {
        recent.length = MAX_CYCLE_LENGTH * (REQUIRED_REPETITIONS + 1);
      }

      const result = detectCycle(recent);
      if (!result) {
        // Mark all traps as inactive if no cycle detected
        setTraps((prev) => {
          const hadActive = prev.some((t) => t.active);
          if (!hadActive) return prev;
          return prev.map((t) => (t.active ? { ...t, active: false } : t));
        });
        return;
      }

      const { cycleElements, cycleCount } = result;
      const container = findTrapContainer(cycleElements);

      setTraps((prev) => {
        // Check if this is the same trap as an existing one (match by descriptions)
        const newDescriptions = cycleElements.map((el) => describeElement(el));
        const existingIndex = prev.findIndex(
          (t) =>
            t.elementCount === cycleElements.length &&
            t.descriptions.every((d, i) => d === newDescriptions[i]),
        );

        if (existingIndex >= 0) {
          // Update existing trap
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            elementRefs: cycleElements.map((el) => new WeakRef(el)),
            lastSeen: event.timestamp,
            cycleCount,
            active: true,
          };
          // Mark others inactive
          return updated.map((t, i) =>
            i === existingIndex ? t : { ...t, active: false },
          );
        }

        // New trap detected
        const trap: DetectedTrap = {
          elementRefs: cycleElements.map((el) => new WeakRef(el)),
          elementCount: cycleElements.length,
          descriptions: newDescriptions,
          containerDescription: container
            ? describeElement(container.element)
            : null,
          intentional: container?.intentional ?? false,
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          cycleCount,
          active: true,
        };

        const next = [trap, ...prev.map((t) => ({ ...t, active: false }))];
        if (next.length > 50) next.length = 50;
        return next;
      });
    });

    return unsubscribe;
  }, []);

  const clearLog = () => {
    setTraps([]);
    recentFocusRef.current = [];
  };

  const activeCount = traps.filter((t) => t.active).length;

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Focus Trap Detector</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={clearLog}
          className="a11y-panel-btn"
          disabled={traps.length === 0}
        >
          Clear
        </button>
        <span className="a11y-panel-count">
          {traps.length} trap{traps.length !== 1 ? "s" : ""} detected
          {activeCount > 0 && (
            <span className="a11y-trap-active-badge">
              {" "}
              ({activeCount} active)
            </span>
          )}
        </span>
      </div>

      {traps.length === 0 ? (
        <div className="a11y-focus-empty">
          No focus traps detected. A trap is flagged when focus cycles through
          the same {MIN_CYCLE_LENGTH}-{MAX_CYCLE_LENGTH} elements{" "}
          {REQUIRED_REPETITIONS}+ times consecutively. Tab around the page to
          test.
        </div>
      ) : (
        <div className="a11y-panel-list">
          {traps.map((trap, i) => (
            <TrapCard
              key={`trap-${trap.firstSeen}-${i}`}
              trap={trap}
              onHighlight={forceUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrapCard({
  trap,
  onHighlight,
}: {
  trap: DetectedTrap;
  onHighlight: (fn: (n: number) => number) => void;
}) {
  return (
    <div
      className={`a11y-trap-card ${trap.active ? "a11y-trap-card-active" : ""} ${trap.intentional ? "a11y-trap-card-intentional" : "a11y-trap-card-accidental"}`}
    >
      <div className="a11y-trap-header">
        <span
          className={`a11y-trap-badge ${trap.intentional ? "a11y-trap-badge-intentional" : "a11y-trap-badge-accidental"}`}
        >
          {trap.intentional ? "Modal" : "Trap"}
        </span>
        <span className="a11y-trap-cycle-count">
          {trap.elementCount} elements, {trap.cycleCount}x cycles
        </span>
        {trap.active && <span className="a11y-trap-active-indicator" />}
      </div>

      {trap.containerDescription && (
        <div className="a11y-trap-container">
          Container: {trap.containerDescription}
        </div>
      )}

      <div className="a11y-trap-elements">
        {trap.descriptions.map((desc, j) => {
          const elRef = trap.elementRefs[j];
          return (
            <button
              type="button"
              key={`el-${trap.firstSeen}-${j}`}
              className="a11y-panel-row a11y-panel-row-clickable"
              aria-label={`Go to ${desc}`}
              title={desc}
              onClick={() => {
                const el = elRef?.deref();
                if (el && document.contains(el)) {
                  scrollToAndHighlight(el);
                  onHighlight((n) => n + 1);
                }
              }}
            >
              <span className="a11y-trap-order">{j + 1}</span>
              <span className="a11y-panel-text">{desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
