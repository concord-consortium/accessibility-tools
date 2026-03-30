/**
 * React fiber traversal for component name resolution.
 *
 * In development builds, React attaches fiber nodes to DOM elements via
 * `__reactFiber$<randomKey>` properties. We walk up the fiber tree to find
 * the nearest function/class component and read `type.displayName || type.name`.
 *
 * This is the same technique React DevTools uses internally.
 * In production builds, names are minified - acceptable for a dev tool.
 *
 * Testing: fiber attachment can be simulated in jsdom by setting
 * `element.__reactFiber$test = { tag: 0, type: { name: "Foo" }, return: null }`
 * or using the `attachMockFiber()` test helper.
 */

interface ReactFiber {
  tag: number;
  type: string | { displayName?: string; name?: string } | null;
  return: ReactFiber | null;
  stateNode: unknown;
}

// React fiber tags for function and class components
const FUNCTION_COMPONENT = 0;
const CLASS_COMPONENT = 1;
const FORWARD_REF = 11;
const MEMO = 14;
const SIMPLE_MEMO = 15;

const COMPONENT_TAGS = new Set([
  FUNCTION_COMPONENT,
  CLASS_COMPONENT,
  FORWARD_REF,
  MEMO,
  SIMPLE_MEMO,
]);

/**
 * Find the React fiber key on a DOM element.
 * React uses `__reactFiber$<randomKey>` in React 17+.
 */
function getFiberKey(element: Element): string | null {
  for (const key of Object.keys(element)) {
    if (key.startsWith("__reactFiber$")) {
      return key;
    }
  }
  return null;
}

/**
 * Get the React fiber node attached to a DOM element.
 */
function getFiber(element: Element): ReactFiber | null {
  const key = getFiberKey(element);
  if (!key) return null;
  return (element as unknown as Record<string, ReactFiber>)[key] ?? null;
}

/**
 * Extract the component name from a fiber node's type.
 */
function getComponentNameFromFiber(fiber: ReactFiber): string | null {
  const { type } = fiber;
  if (type === null) return null;
  if (typeof type === "string") return null; // host element (div, span, etc.)
  return type.displayName || type.name || null;
}

/**
 * Get the nearest React component name for a DOM element.
 * Walks up the fiber tree from the element until it finds a component fiber.
 * Returns null if no component is found or React fibers aren't available.
 */
export function getReactComponentName(element: Element): string | null {
  const fiber = getFiber(element);
  if (!fiber) return null;

  let current: ReactFiber | null = fiber;
  while (current) {
    if (COMPONENT_TAGS.has(current.tag)) {
      const name = getComponentNameFromFiber(current);
      if (name) return name;
    }
    current = current.return;
  }
  return null;
}

/**
 * Get the full React component path for a DOM element.
 * Returns an array of component names from root to the element.
 * e.g., ["App", "Workspace", "TileComponent", "ToolbarButton"]
 */
export function getReactFiberPath(element: Element): string[] {
  const fiber = getFiber(element);
  if (!fiber) return [];

  const path: string[] = [];
  let current: ReactFiber | null = fiber;
  while (current) {
    if (COMPONENT_TAGS.has(current.tag)) {
      const name = getComponentNameFromFiber(current);
      if (name) path.push(name);
    }
    current = current.return;
  }
  path.reverse();
  return path;
}

/**
 * Format an element description with optional React component name.
 * Returns e.g., "ToolbarButton <button.tool-btn>" or "<button.tool-btn>"
 */
export function describeElement(element: Element): string {
  const componentName = getReactComponentName(element);
  const tag = element.tagName?.toLowerCase() ?? "unknown";
  const id = element.id ? `#${element.id}` : "";
  // Use getAttribute to handle SVG elements where className is SVGAnimatedString
  const classAttr = element.getAttribute("class") || "";
  const classes = classAttr
    ? `.${classAttr.split(/\s+/).filter(Boolean).join(".")}`
    : "";
  const role = element.getAttribute("role");
  const roleStr = role ? `[role="${role}"]` : "";

  const selector = `<${tag}${id}${classes}${roleStr}>`;
  return componentName ? `${componentName} ${selector}` : selector;
}

/**
 * Test helper: attach a mock fiber to a DOM element.
 * Simulates React's fiber attachment for unit testing.
 */
export function attachMockFiber(
  element: Element,
  componentName: string,
  parentChain?: string[],
): void {
  const leafFiber: ReactFiber = {
    tag: FUNCTION_COMPONENT,
    type: { name: componentName },
    return: null,
    stateNode: null,
  };

  if (parentChain) {
    let current = leafFiber;
    for (const name of [...parentChain].reverse()) {
      const parent: ReactFiber = {
        tag: FUNCTION_COMPONENT,
        type: { name },
        return: null,
        stateNode: null,
      };
      current.return = parent;
      current = parent;
    }
  }

  (element as unknown as Record<string, ReactFiber>).__reactFiber$test =
    leafFiber;
}
