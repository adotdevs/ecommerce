export const NAVIGATION_PROGRESS_START = "navigation-progress:start";

export function startNavigationProgress() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NAVIGATION_PROGRESS_START));
}
