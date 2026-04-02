/**
 * ARIA Tree View panel.
 *
 * Walks the DOM from a configurable root and builds a collapsible tree
 * of all elements with ARIA roles, labels, and states. Shows the
 * semantic structure screen readers see. Supports filtering to show
 * only role-bearing elements.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getReactComponentName,
  pluralize,
  scrollToAndHighlight,
  showToast,
} from "../utils";
import { getEffectiveRole } from "../utils/accname";
import { isInsideSidebar } from "../utils/focus-stream";

interface TreeNode {
  id: string;
  element: Element;
  tag: string;
  role: string | null;
  ariaLabel: string | null;
  ariaAttrs: Array<{ name: string; value: string }>;
  componentName: string | null;
  children: TreeNode[];
  depth: number;
  hasRoleDescendant: boolean;
}

const ARIA_DISPLAY_ATTRS = [
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-expanded",
  "aria-pressed",
  "aria-selected",
  "aria-checked",
  "aria-disabled",
  "aria-hidden",
  "aria-live",
  "aria-haspopup",
  "aria-current",
  "aria-required",
  "aria-invalid",
] as const;

let nextNodeId = 0;

function buildTree(root: Element, depth = 0, parentPath = ""): TreeNode {
  const tag = root.tagName.toLowerCase();
  const id = parentPath ? `${parentPath}>${tag}:${nextNodeId++}` : tag;
  const role = getEffectiveRole(root);
  const ariaLabel = root.getAttribute("aria-label");

  const ariaAttrs: TreeNode["ariaAttrs"] = [];
  for (const attr of ARIA_DISPLAY_ATTRS) {
    const val = root.getAttribute(attr);
    if (val !== null) {
      ariaAttrs.push({ name: attr, value: val });
    }
  }

  const children: TreeNode[] = [];
  for (const child of root.children) {
    if (isInsideSidebar(child)) continue;
    children.push(buildTree(child, depth + 1, id));
  }

  const hasRoleDescendant = children.some(
    (c) => c.role !== null || c.hasRoleDescendant,
  );

  return {
    id,
    element: root,
    tag,
    role,
    ariaLabel,
    ariaAttrs,
    componentName: getReactComponentName(root),
    children,
    depth,
    hasRoleDescendant,
  };
}

function countNodes(node: TreeNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

function countRoleNodes(node: TreeNode): number {
  let count = node.role ? 1 : 0;
  for (const child of node.children) {
    count += countRoleNodes(child);
  }
  return count;
}

type FilterMode = "all" | "roles-only";

export function AriaTreePanel() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [filter, setFilter] = useState<FilterMode>("roles-only");
  const [expanded, setExpanded] = useState<Set<Element>>(new Set());
  const [, forceUpdate] = useState(0);

  const rescan = useCallback((notify = true) => {
    const root = document.body;
    nextNodeId = 0;
    const newTree = buildTree(root);
    setTree(newTree);

    // Auto-expand all nodes
    const toExpand = new Set<Element>();
    function collectAll(node: TreeNode) {
      if (node.children.length > 0) toExpand.add(node.element);
      for (const child of node.children) collectAll(child);
    }
    collectAll(newTree);
    setExpanded(toExpand);

    if (notify) {
      const roleCount = countRoleNodes(newTree);
      const total = countNodes(newTree);
      showToast(
        `Rescan complete: ${pluralize(total, "element")}, ${pluralize(roleCount, "with role", "with roles")}`,
      );
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rescan is stable
  useEffect(() => {
    rescan(false);
  }, []);

  const toggleExpand = (element: Element) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(element)) {
        next.delete(element);
      } else {
        next.add(element);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!tree) return;
    const all = new Set<Element>();
    function collect(node: TreeNode) {
      if (node.children.length > 0) all.add(node.element);
      for (const child of node.children) collect(child);
    }
    collect(tree);
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const totalNodes = tree ? countNodes(tree) : 0;
  const roleNodes = tree ? countRoleNodes(tree) : 0;

  // Count expandable nodes to determine toggle state
  const expandableCount = (() => {
    if (!tree) return 0;
    let count = 0;
    function walk(node: TreeNode) {
      if (node.children.length > 0) count++;
      for (const child of node.children) walk(child);
    }
    walk(tree);
    return count;
  })();
  const allExpanded = expanded.size >= expandableCount;

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">ARIA Tree View</h3>
      <div className="a11y-panel-toolbar">
        <button
          type="button"
          onClick={() => rescan()}
          className="a11y-panel-btn"
        >
          Rescan
        </button>
        <button
          type="button"
          onClick={allExpanded ? collapseAll : expandAll}
          className="a11y-panel-btn"
          disabled={!tree}
        >
          {allExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div className="a11y-panel-toolbar">
        <button
          type="button"
          className={`a11y-panel-btn ${filter === "roles-only" ? "a11y-panel-btn-active" : ""}`}
          onClick={() => setFilter("roles-only")}
          aria-pressed={filter === "roles-only"}
        >
          Roles ({roleNodes})
        </button>
        <button
          type="button"
          className={`a11y-panel-btn ${filter === "all" ? "a11y-panel-btn-active" : ""}`}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          All ({totalNodes})
        </button>
      </div>

      {tree ? (
        <div className="a11y-tree-container" role="tree" aria-label="ARIA tree">
          <TreeNodeView
            node={tree}
            filter={filter}
            expanded={expanded}
            onToggle={toggleExpand}
            onForceUpdate={() => forceUpdate((n) => n + 1)}
          />
        </div>
      ) : (
        <div className="a11y-focus-empty">Scanning DOM...</div>
      )}
    </div>
  );
}

function TreeNodeView({
  node,
  filter,
  expanded,
  onToggle,
  onForceUpdate,
}: {
  node: TreeNode;
  filter: FilterMode;
  expanded: Set<Element>;
  onToggle: (el: Element) => void;
  onForceUpdate: () => void;
}) {
  const isExpanded = expanded.has(node.element);
  const hasChildren = node.children.length > 0;
  const isRoleBearing = node.role !== null;

  // In roles-only mode, skip this node if it has no role AND none of its
  // descendants have roles
  if (filter === "roles-only" && !isRoleBearing) {
    if (!node.hasRoleDescendant) return null;

    // Still render children that have roles or role descendants
    const childrenWithRoles = node.children.filter(
      (c) => c.role !== null || c.hasRoleDescendant,
    );

    return (
      <>
        {childrenWithRoles.map((child) => (
          <TreeNodeView
            key={child.id}
            node={child}
            filter={filter}
            expanded={expanded}
            onToggle={onToggle}
            onForceUpdate={onForceUpdate}
          />
        ))}
      </>
    );
  }

  const visibleChildren =
    filter === "roles-only"
      ? node.children.filter((c) => c.role !== null || c.hasRoleDescendant)
      : node.children;

  return (
    <div
      className="a11y-tree-node"
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      style={{ paddingLeft: 6 }}
    >
      <button
        type="button"
        className={`a11y-tree-row ${isRoleBearing ? "a11y-tree-row-role" : "a11y-tree-row-no-role"}`}
        onClick={() => {
          if (hasChildren) {
            onToggle(node.element);
          }
          scrollToAndHighlight(node.element);
          onForceUpdate();
        }}
        aria-label={`${node.role ?? node.tag}${node.ariaLabel ? `: ${node.ariaLabel}` : ""}${node.componentName ? ` (${node.componentName})` : ""}`}
        title={`<${node.tag}>${node.role ? ` role="${node.role}"` : ""}${node.ariaLabel ? ` aria-label="${node.ariaLabel}"` : ""}${node.componentName ? ` in ${node.componentName}` : ""}`}
      >
        {hasChildren && (
          <span className="a11y-tree-toggle">
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
        )}
        {!hasChildren && <span className="a11y-tree-toggle-spacer" />}
        <span className="a11y-tree-tag">&lt;{node.tag}&gt;</span>

        {node.role && <span className="a11y-tree-role">{node.role}</span>}

        {node.ariaLabel && (
          <span className="a11y-tree-label">"{node.ariaLabel}"</span>
        )}

        {node.componentName && (
          <span className="a11y-panel-component">{node.componentName}</span>
        )}
      </button>

      {/* Inline ARIA attributes when expanded */}
      {isExpanded && node.ariaAttrs.length > 0 && (
        <div className="a11y-tree-attrs" style={{ paddingLeft: 18 }}>
          {node.ariaAttrs.map((attr) => (
            <div key={attr.name} className="a11y-focus-attr">
              <span className="a11y-focus-attr-key">{attr.name}</span>
              <span className="a11y-focus-attr-value">{attr.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {isExpanded && visibleChildren.length > 0 && (
        // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA tree pattern requires role="group" on tree item children
        <div role="group">
          {visibleChildren.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              filter={filter}
              expanded={expanded}
              onToggle={onToggle}
              onForceUpdate={onForceUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
