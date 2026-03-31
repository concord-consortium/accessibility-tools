/**
 * Shared utility for CSS overlay toggles.
 * Injects/removes a <style> tag in the document head.
 */

const injectedStyles = new Map<string, HTMLStyleElement>();

export function injectOverlayCSS(id: string, css: string): void {
  if (injectedStyles.has(id)) return;
  const style = document.createElement("style");
  style.id = `a11y-overlay-${id}`;
  style.setAttribute("data-a11y-debug", `overlay-${id}`);
  style.textContent = css;
  document.head.appendChild(style);
  injectedStyles.set(id, style);
}

export function removeOverlayCSS(id: string): void {
  const style = injectedStyles.get(id);
  if (style) {
    style.remove();
    injectedStyles.delete(id);
  }
}

export function isOverlayActive(id: string): boolean {
  return injectedStyles.has(id);
}

export function toggleOverlayCSS(id: string, css: string): boolean {
  if (injectedStyles.has(id)) {
    removeOverlayCSS(id);
    return false;
  }
  injectOverlayCSS(id, css);
  return true;
}
