import type { CheckIssue, CheckResult } from "./types";

export interface AnimationItem {
  name: string;
  selector: string;
  hasReducedMotionOverride: boolean;
  source: "animation" | "transition";
}

function checkReducedMotionPreference(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scan stylesheets for animations/transitions without reduced-motion overrides.
 * Note: this check is always document-scoped (stylesheets can't be scoped to a subtree).
 * WCAG 2.3.3 (Animation from Interactions) is AAA level.
 */
export function scanAnimations(): CheckResult<AnimationItem> & {
  prefersReduced: boolean;
} {
  const items: AnimationItem[] = [];
  const issues: CheckIssue[] = [];
  const reducedMotionOverrides = new Set<string>();

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (
          rule instanceof CSSMediaRule &&
          rule.conditionText?.includes("prefers-reduced-motion")
        ) {
          for (const innerRule of rule.cssRules) {
            if (innerRule instanceof CSSStyleRule) {
              reducedMotionOverrides.add(innerRule.selectorText);
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheet, skip
    }
  }

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule) {
          const style = rule.style;
          const animation = style.animation || style.animationName;
          const transition = style.transition || style.transitionProperty;

          if (animation && animation !== "none") {
            const hasOverride = reducedMotionOverrides.has(rule.selectorText);
            items.push({
              name: animation,
              selector: rule.selectorText,
              hasReducedMotionOverride: hasOverride,
              source: "animation",
            });
            if (!hasOverride) {
              issues.push({
                type: "no-reduced-motion-override",
                severity: "warning",
                wcag: "2.3.3",
                wcagLevel: "AAA",
                message: `Animation "${rule.selectorText}" has no prefers-reduced-motion override`,
                fix: `Add @media (prefers-reduced-motion: reduce) { ${rule.selectorText} { animation: none; } }`,
              });
            }
          }

          if (transition && transition !== "none" && transition !== "all") {
            const hasOverride = reducedMotionOverrides.has(rule.selectorText);
            items.push({
              name: transition,
              selector: rule.selectorText,
              hasReducedMotionOverride: hasOverride,
              source: "transition",
            });
            if (!hasOverride) {
              issues.push({
                type: "no-reduced-motion-override",
                severity: "warning",
                wcag: "2.3.3",
                wcagLevel: "AAA",
                message: `Transition "${rule.selectorText}" has no prefers-reduced-motion override`,
                fix: `Add @media (prefers-reduced-motion: reduce) { ${rule.selectorText} { transition: none; } }`,
              });
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheet, skip
    }
  }

  return {
    items,
    issues,
    prefersReduced: checkReducedMotionPreference(),
  };
}
