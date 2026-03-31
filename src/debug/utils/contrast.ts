/**
 * Color contrast computation utility.
 *
 * Computes WCAG contrast ratios between foreground and background colors.
 * Walks the ancestor chain to find the effective background color,
 * compositing semi-transparent backgrounds along the way.
 * Flags complex backgrounds (gradients, images) as "unable to compute".
 */

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  isLargeText: boolean;
  canCompute: boolean;
  reason?: string;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(color: string): RGBA | null {
  // Handle rgb/rgba
  const rgbaMatch = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/,
  );
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    };
  }

  // Handle modern rgba syntax: rgb(r g b / a)
  const modernMatch = color.match(
    /rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)/,
  );
  if (modernMatch) {
    let a = 1;
    if (modernMatch[4] !== undefined) {
      a = modernMatch[4].endsWith("%")
        ? Number.parseFloat(modernMatch[4]) / 100
        : Number(modernMatch[4]);
    }
    return {
      r: Number(modernMatch[1]),
      g: Number(modernMatch[2]),
      b: Number(modernMatch[3]),
      a,
    };
  }

  // Handle "transparent"
  if (color === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return null;
}

function compositeColors(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

function relativeLuminance(color: RGBA): number {
  const [rs, gs, bs] = [color.r / 255, color.g / 255, color.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Compute WCAG contrast ratio between two colors.
 * Returns a value between 1 and 21.
 */
export function contrastRatio(fg: RGBA, bg: RGBA): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine if text is "large" by WCAG definition.
 * Large text: >= 18pt (24px) regular, or >= 14pt (18.66px) bold.
 */
function isLargeText(el: Element): boolean {
  const style = getComputedStyle(el);
  const fontSize = Number.parseFloat(style.fontSize);
  const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
  const isBold = fontWeight >= 700 || style.fontWeight === "bold";

  if (fontSize >= 24) return true;
  if (fontSize >= 18.66 && isBold) return true;
  return false;
}

/**
 * Walk up the ancestor chain to find the effective background color.
 * Composites semi-transparent backgrounds along the way.
 * Returns null if a complex background (gradient, image) is encountered.
 */
function getEffectiveBackground(el: Element): {
  color: RGBA;
  canCompute: boolean;
  reason?: string;
} {
  let accumulated: RGBA = { r: 255, g: 255, b: 255, a: 1 }; // Default white
  const chain: Element[] = [];

  let current: Element | null = el;
  while (current) {
    chain.unshift(current);
    current = current.parentElement;
  }

  for (const ancestor of chain) {
    const style = getComputedStyle(ancestor);

    // Check for complex backgrounds we can't resolve
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== "none") {
      return {
        color: accumulated,
        canCompute: false,
        reason: "Background image or gradient detected",
      };
    }

    const bgColor = parseColor(style.backgroundColor);
    if (bgColor && bgColor.a > 0) {
      accumulated = compositeColors(bgColor, accumulated);
    }
  }

  return { color: accumulated, canCompute: true };
}

/**
 * Compute the contrast result for a text element.
 */
export function computeContrast(el: Element): ContrastResult {
  const style = getComputedStyle(el);
  const fgParsed = parseColor(style.color);

  if (!fgParsed) {
    return {
      foreground: style.color,
      background: "unknown",
      ratio: 0,
      passesAA: false,
      passesAAA: false,
      isLargeText: false,
      canCompute: false,
      reason: "Cannot parse foreground color",
    };
  }

  const bg = getEffectiveBackground(el);

  if (!bg.canCompute) {
    return {
      foreground: style.color,
      background: "complex",
      ratio: 0,
      passesAA: false,
      passesAAA: false,
      isLargeText: isLargeText(el),
      canCompute: false,
      reason: bg.reason,
    };
  }

  // Composite foreground onto background if fg has alpha
  const effectiveFg =
    fgParsed.a < 1 ? compositeColors(fgParsed, bg.color) : fgParsed;

  const ratio = contrastRatio(effectiveFg, bg.color);
  const large = isLargeText(el);

  const aaThreshold = large ? 3 : 4.5;
  const aaaThreshold = large ? 4.5 : 7;

  const fgStr = `rgb(${Math.round(effectiveFg.r)}, ${Math.round(effectiveFg.g)}, ${Math.round(effectiveFg.b)})`;
  const bgStr = `rgb(${Math.round(bg.color.r)}, ${Math.round(bg.color.g)}, ${Math.round(bg.color.b)})`;

  return {
    foreground: fgStr,
    background: bgStr,
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= aaThreshold,
    passesAAA: ratio >= aaaThreshold,
    isLargeText: large,
    canCompute: true,
  };
}

/**
 * Format a contrast ratio for display.
 */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}
