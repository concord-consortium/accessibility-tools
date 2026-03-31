/**
 * Tab Order Overlay toggle.
 *
 * Shows numbered badges on all tabbable elements in the page,
 * following browser tab order rules.
 */

import { isInsideSidebar } from "../utils/focus-stream";

const BADGE_CLASS = "a11y-tab-order-badge";
let active = false;
let badges: HTMLElement[] = [];

const TABBABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "summary",
].join(", ");

function createBadges() {
  removeBadges();
  const elements = document.querySelectorAll(TABBABLE_SELECTOR);
  const tabbable: Element[] = [];

  for (const el of elements) {
    if (isInsideSidebar(el)) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    if (el instanceof HTMLElement && el.hidden) continue;

    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;

    tabbable.push(el);
  }

  // Sort by tab order
  tabbable.sort((a, b) => {
    const aIdx = Number(a.getAttribute("tabindex") ?? 0);
    const bIdx = Number(b.getAttribute("tabindex") ?? 0);
    if (aIdx > 0 && bIdx > 0) return aIdx - bIdx;
    if (aIdx > 0) return -1;
    if (bIdx > 0) return 1;
    return 0;
  });

  let badgeNum = 0;
  for (let i = 0; i < tabbable.length; i++) {
    const el = tabbable[i];
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    badgeNum++;
    const badge = document.createElement("div");
    badge.className = BADGE_CLASS;
    badge.setAttribute("data-a11y-debug", "tab-order-badge");
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = String(badgeNum);
    badge.style.cssText = `
      position: fixed;
      top: ${rect.top - 8}px;
      left: ${rect.left - 8}px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #2563eb;
      color: white;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      pointer-events: none;
      font-family: system-ui, sans-serif;
    `;
    document.body.appendChild(badge);
    badges.push(badge);
  }
}

function removeBadges() {
  for (const badge of badges) {
    badge.remove();
  }
  badges = [];
}

export function toggleTabOrder(): boolean {
  active = !active;
  if (active) {
    createBadges();
  } else {
    removeBadges();
  }
  return active;
}
