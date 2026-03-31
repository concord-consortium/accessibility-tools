/**
 * Simple toast notification for the sidebar.
 * Shows a brief message at the top of the sidebar panel area.
 */

let toastElement: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateToast(): HTMLElement {
  if (toastElement && document.contains(toastElement)) return toastElement;

  toastElement = document.createElement("div");
  toastElement.className = "a11y-toast";
  toastElement.setAttribute("role", "status");
  toastElement.setAttribute("aria-live", "polite");
  toastElement.setAttribute("data-a11y-debug", "toast");
  toastElement.style.display = "none";

  // Insert at the top of the sidebar panel area
  const sidebar = document.querySelector(".a11y-debug-sidebar");
  if (sidebar) {
    sidebar.appendChild(toastElement);
  } else {
    document.body.appendChild(toastElement);
  }

  return toastElement;
}

export function showToast(message: string, duration = 3000): void {
  const toast = getOrCreateToast();

  if (hideTimer) {
    clearTimeout(hideTimer);
  }

  toast.textContent = message;
  toast.style.display = "block";
  toast.classList.add("a11y-toast-visible");

  hideTimer = setTimeout(() => {
    toast.classList.remove("a11y-toast-visible");
    // Wait for fade-out transition before hiding
    setTimeout(() => {
      toast.style.display = "none";
    }, 200);
    hideTimer = null;
  }, duration);
}
